import { randomUUID } from 'node:crypto';
import { PublicError } from '../http/errors.js';
import { assertUuid } from '../http/ids.js';
import { assertUploadedImage, signStoredImage, storeImageWithRollback } from './image-upload.js';
import { loadAuthEmails, loadClientProfiles } from './customer-directory.js';

/** The same lifecycle the order itself uses, so one vocabulary covers both. */
const ALLOWED_WORK_STATUSES = new Set([
  'oczekujące',
  'w_realizacji',
  'zrealizowane',
  'anulowane'
]);

const MAX_COMMENT_LENGTH = 2000;
const PHOTO_BUCKET = 'installation-photos';
/**
 * Everything an installer needs to carry out a job, and nothing that only
 * identifies the customer as a person.
 *
 * Requirement FM1 names what the crew gets: the installation address, the
 * deadline, the technical specification and the customer's contact details.
 * Everything outside that list is omitted rather than filtered later.
 *
 * `passport_series` and `passport_number` are gone from the table entirely
 * since `0014`, and no policy opens the new one to `monter`. `price` and
 * `contract_details` are still readable by the office and still absent here:
 * they belong to the commercial agreement, and an installation crew standing
 * at a graveside has no use for either.
 */
const INSTALLATION_ORDER_SELECT = `
  id,
  status,
  installation_address,
  deadline,
  client_full_name,
  created_at,
  updated_at,
  user_id,
  order_card_id,
  installation_cards!inner (
    id,
    status,
    photo_evidence_url,
    worker_comments,
    completion_timestamp
  ),
  order_cards (
    id,
    created_at,
    order_details (
      id,
      material_id,
      dimensions,
      inscription_text,
      finish_type,
      materials ( id, name, category, price_per_m2 )
    )
  )
`;

/** A short-lived link to a photograph in the private bucket. */
export const signInstallationPhoto = (path) => signStoredImage(PHOTO_BUCKET, path);
const signPhoto = signInstallationPhoto;

/** PostgREST returns the reverse side of a foreign key as an array. */
const toReport = async (rows) => {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return null;
  return {
    id: row.id,
    status: row.status ?? null,
    photoPath: row.photo_evidence_url ?? null,
    photoUrl: await signPhoto(row.photo_evidence_url),
    workerComments: row.worker_comments ?? null,
    completionTimestamp: row.completion_timestamp ?? null
  };
};

/**
 * The crew's worklist: orders the office has handed over, and only those.
 *
 * The join to `installation_cards` is an inner one, so an order shows up here
 * exactly when a card exists for it — which is what "hand over to the crew"
 * creates. Before that the office is still filling in price, address and
 * deadline, and a job on the list that nobody has agreed to yet is worse than
 * no job at all.
 *
 * Nothing is created or modified here; the row the crew writes against comes
 * from the hand-over, or from their own first report.
 */
export const listInstallationCards = async ({ supabase }) => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(INSTALLATION_ORDER_SELECT)
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to load installation cards.');
  }

  const rows = orders ?? [];
  const userIds = rows.map((o) => o.user_id);
  const [profileById, emailById] = await Promise.all([
    loadClientProfiles({ supabase, userIds }),
    userIds.some(Boolean) ? loadAuthEmails() : Promise.resolve(new Map())
  ]);

  return Promise.all(rows.map(async (order) => {
    const profile = profileById.get(order.user_id);
    return {
      id: order.id,
      orderId: order.id,
      orderCardId: order.order_card_id ?? null,
      status: order.status ?? 'oczekujące',
      installationAddress: order.installation_address ?? null,
      deadline: order.deadline ?? null,
      clientFullName: order.client_full_name ?? null,
      createdAt: order.created_at ?? null,
      submittedAt: order.order_cards?.created_at ?? null,
      // What the crew recorded on site. Always present here — the inner join
      // guarantees it — but empty until they actually write something.
      report: await toReport(order.installation_cards),
      updatedAt: order.updated_at ?? null,
      client: {
        firstName: profile?.first_name ?? null,
        lastName: profile?.last_name ?? null,
        phoneNumber: profile?.phone_number ?? null,
        email: emailById.get(order.user_id) ?? null
      },
      orderDetails: order.order_cards?.order_details ?? []
    };
  }));
};

/**
 * Records what the crew did on site, against one order.
 *
 * Updates the card the hand-over created; it never makes one. That is what
 * keeps the worklist honest — see the check below. The completion time is
 * stamped by the server rather than accepted from the caller: it is evidence of
 * when the work was reported finished, and a phone with a wrong clock should
 * not set it.
 */
export const saveInstallationReport = async ({
  supabase,
  orderId,
  payload
}) => {
  assertUuid(orderId, 'Invalid order id.');

  const status = typeof payload?.status === 'string' ? payload.status.trim() : '';
  if (!ALLOWED_WORK_STATUSES.has(status)) {
    throw new PublicError('Invalid installation status.');
  }

  const rawComments = typeof payload?.workerComments === 'string' ? payload.workerComments.trim() : '';
  if (rawComments.length > MAX_COMMENT_LENGTH) {
    throw new PublicError('Comment is too long.');
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) {
    throw new Error('Failed to load the order.');
  }
  if (!order) {
    throw new PublicError('Order not found.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('installation_cards')
    .select('id, completion_timestamp')
    .eq('order_id', orderId)
    .maybeSingle();
  if (existingError) {
    throw new Error('Failed to load the installation card.');
  }
  // The card is created by the office handing the job over, and only then.
  // Without this the worklist filter would be a display rule: an installer
  // could file a report against any order id and, by creating the card, put
  // that job on their own list.
  if (!existing) {
    throw new PublicError('This order has not been handed over to the crew yet.', 409);
  }

  const finished = status === 'zrealizowane';
  const row = {
    status,
    worker_comments: rawComments || null,
    // Keep the first completion time: reopening and finishing again should not
    // rewrite when the job was originally reported done.
    completion_timestamp: finished
      ? existing.completion_timestamp ?? new Date().toISOString()
      : null
  };

  const { data: saved, error: saveError } = await supabase
    .from('installation_cards')
    .update(row)
    .eq('id', existing.id)
    .select('id, status, photo_evidence_url, worker_comments, completion_timestamp')
    .single();

  if (saveError) {
    throw new Error('Failed to save the installation card.');
  }

  return toReport(saved);
};

/**
 * Stores a photograph taken on site and attaches it to the order's report.
 *
 * The file goes into a private bucket under the order it documents, so an
 * object path alone says which job it belongs to. Replacing a photograph
 * removes the previous one rather than leaving it orphaned in storage.
 */
export const saveInstallationPhoto = async ({
  supabase,
  orderId,
  body,
  contentType
}) => {
  assertUuid(orderId, 'Invalid order id.');
  const type = assertUploadedImage({ body, contentType });

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) {
    throw new Error('Failed to load the order.');
  }
  if (!order) {
    throw new PublicError('Order not found.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('installation_cards')
    .select('id, status, photo_evidence_url')
    .eq('order_id', orderId)
    .maybeSingle();
  if (existingError) {
    throw new Error('Failed to load the installation card.');
  }
  // Same gate as the report, and checked before the upload so a refused
  // request leaves nothing behind in the bucket.
  if (!existing) {
    throw new PublicError('This order has not been handed over to the crew yet.', 409);
  }

  const saved = await storeImageWithRollback({
    bucket: PHOTO_BUCKET,
    path: `${orderId}/${randomUUID()}.${type.ext}`,
    body,
    type,
    previousPath: existing.photo_evidence_url,
    save: async (uploaded) => {
      // A photograph arriving while the job is still only handed over means the
      // crew has started; anything further along keeps the status it has.
      const row = {
        photo_evidence_url: uploaded,
        ...(existing.status === 'oczekujące' ? { status: 'w_realizacji' } : {})
      };

      const { data, error } = await supabase
        .from('installation_cards')
        .update(row)
        .eq('id', existing.id)
        .select('id, status, photo_evidence_url, worker_comments, completion_timestamp')
        .single();

      if (error) {
        throw new Error('Failed to save the installation card.');
      }
      return data;
    }
  });

  return toReport(saved);
};
