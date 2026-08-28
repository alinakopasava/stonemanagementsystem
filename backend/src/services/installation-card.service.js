import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { PublicError } from '../http/errors.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The same lifecycle the order itself uses, so one vocabulary covers both. */
const ALLOWED_WORK_STATUSES = new Set([
  'oczekujące',
  'w_realizacji',
  'zrealizowane',
  'anulowane'
]);

const MAX_COMMENT_LENGTH = 2000;
const PHOTO_BUCKET = 'installation-photos';
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Accepted image types and how each one starts on disk.
 *
 * The declared Content-Type is caller-supplied, so it decides nothing on its
 * own: the first bytes have to agree with it, or a script renamed to .jpg
 * would land in the bucket wearing an image label.
 */
const IMAGE_TYPES = [
  { mime: 'image/jpeg', ext: 'jpg', magic: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', ext: 'png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/webp', ext: 'webp', magic: [0x52, 0x49, 0x46, 0x46] }
];

const startsWith = (buffer, magic) =>
  buffer.length >= magic.length && magic.every((byte, i) => buffer[i] === byte);

/**
 * Everything an installer needs to carry out a job, and nothing that only
 * identifies the customer as a person.
 *
 * The list deliberately omits `passport_series` and `passport_number`: those
 * exist for the contract the office signs, and an installation crew has no use
 * for them. Everything else the administrator can see is here, because the
 * whole point of the worklist is that technical data reaches the installer
 * without being retyped by hand.
 */
const INSTALLATION_ORDER_SELECT = `
  id,
  status,
  price,
  installation_address,
  contract_details,
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

/**
 * A short-lived link to a photograph in the private bucket.
 *
 * The column stores the object path, not an address: a signed link expires,
 * so one pasted into a chat stops working instead of staying a permanent
 * public window onto a customer's grave.
 */
const signPhoto = async (path) => {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data?.signedUrl ?? null;
};

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

/** Name and telephone as the customer registered them — how the crew reaches them. */
const loadClientProfiles = async ({ supabase, userIds }) => {
  const wanted = [...new Set((userIds ?? []).filter(Boolean))];
  if (wanted.length === 0) return new Map();

  // `profiles_select_self_or_staff` lets a monter read these, so the RLS-bound
  // client is enough and the service role stays out of this path.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone_number')
    .in('id', wanted);

  if (error) {
    throw new Error('Failed to load client profiles.');
  }

  return new Map((data ?? []).map((p) => [p.id, p]));
};

/** Addresses live in `auth.users`, which only the service role can read. */
const loadAuthEmails = async () => {
  const emailById = new Map();
  const perPage = 1000;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error('Failed to list auth users.');
    }
    const users = data?.users ?? [];
    for (const user of users) {
      emailById.set(user.id, user.email ?? null);
    }
    if (users.length < perPage) break;
  }
  return emailById;
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
      price: order.price ?? null,
      installationAddress: order.installation_address ?? null,
      contractDetails: order.contract_details ?? null,
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
  if (typeof orderId !== 'string' || !UUID_RE.test(orderId)) {
    throw new PublicError('Invalid order id.');
  }

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
  if (typeof orderId !== 'string' || !UUID_RE.test(orderId)) {
    throw new PublicError('Invalid order id.');
  }
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new PublicError('No photo was uploaded.');
  }
  if (body.length > MAX_PHOTO_BYTES) {
    throw new PublicError('Photo is too large.', 413);
  }

  const declared = String(contentType ?? '').split(';')[0].trim().toLowerCase();
  const type = IMAGE_TYPES.find((candidate) => candidate.mime === declared);
  if (!type || !startsWith(body, type.magic)) {
    throw new PublicError('Only JPEG, PNG and WebP photos are accepted.');
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

  const path = `${orderId}/${randomUUID()}.${type.ext}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(PHOTO_BUCKET)
    .upload(path, body, { contentType: type.mime, upsert: false });
  if (uploadError) {
    throw new Error('Failed to store the photo.');
  }

  // A photograph arriving while the job is still only handed over means the
  // crew has started; anything further along keeps the status it has.
  const row = {
    photo_evidence_url: path,
    ...(existing.status === 'oczekujące' ? { status: 'w_realizacji' } : {})
  };

  const { data: saved, error: saveError } = await supabase
    .from('installation_cards')
    .update(row)
    .eq('id', existing.id)
    .select('id, status, photo_evidence_url, worker_comments, completion_timestamp')
    .single();

  if (saveError) {
    // Nothing points at the object now, so it must not stay in the bucket.
    await supabaseAdmin.storage.from(PHOTO_BUCKET).remove([path]);
    throw new Error('Failed to save the installation card.');
  }

  if (existing?.photo_evidence_url && existing.photo_evidence_url !== path) {
    await supabaseAdmin.storage.from(PHOTO_BUCKET).remove([existing.photo_evidence_url]);
  }

  return toReport(saved);
};
