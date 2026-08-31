import { supabaseAdmin } from '../config/supabase.js';
import { PublicError } from '../http/errors.js';
import { assertUuid } from '../http/ids.js';
import { ACCOUNT_COLUMNS, loadAuthEmails, loadClientProfiles } from './customer-directory.js';
import { signMonumentPhoto } from './monument-photo.service.js';
import { signInstallationPhoto } from './installation-card.service.js';
import { logSecurityEvent } from './security-log.js';

const ALLOWED_ROLES = new Set(['klient', 'monter', 'admin']);
const ALLOWED_ORDER_STATUSES = new Set([
  'oczekujące',
  'w_realizacji',
  'zrealizowane',
  'anulowane'
]);

/**
 * How long each field of the conversion form may be.
 *
 * Two of these hold identity-document data, which is the narrowest thing this
 * system stores: a series is a handful of characters and a number is nine. A
 * field with no ceiling accepts whatever fits in the request body — 100 kB of
 * it — and stores that under a heading saying "passport number", which is
 * exactly what data minimisation is supposed to prevent. The address and the
 * contract notes are prose, so they get room to be prose and no more.
 */
const CONVERT_FIELD_MAX_LENGTH = {
  installation_address: 500,
  contract_details: 2000,
  client_full_name: 160,
  passport_series: 16,
  passport_number: 32
};

/**
 * Trims an optional text field to `null` when empty, rejecting it when it runs
 * past its limit. Truncating silently would be worse than refusing: half a
 * passport number looks like a whole one.
 */
const optionalText = (value, field) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > CONVERT_FIELD_MAX_LENGTH[field]) {
    throw new PublicError(`Field ${field} is too long.`);
  }
  return trimmed;
};

const ORDER_SELECT = `
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
  order_identity_documents (
    passport_series,
    passport_number
  ),
  installation_cards (
    id,
    status,
    completion_timestamp,
    worker_comments,
    photo_evidence_url
  ),
  order_cards (
    id,
    user_id,
    created_at,
    order_details (
      id,
      material_id,
      dimensions,
      inscription_text,
      finish_type,
      shape,
      inscription_style,
      slab_variant,
      slab_thickness_cm,
      base_height_cm,
      base_width_cm,
      base_depth_cm,
      decoration,
      has_cross,
      has_flowerbed,
      photo_path,
      materials ( id, name, category, price_per_m2 )
    )
  )
`;

/**
 * The portrait the customer attached, as a link the panel can render.
 *
 * FK17 asks for the photograph to be "powiązana z kartą i widoczna w panelu
 * administracyjnym" — visible to the office, not only bundled into the work
 * sheet. The column holds an object path in a private bucket, so what the
 * panel needs is a signed link, minted per read.
 */
const withPhotoUrl = async (details) => {
  const rows = Array.isArray(details) ? details : details ? [details] : [];
  return Promise.all(
    rows.map(async (detail) => ({
      ...detail,
      photo_url: await signMonumentPhoto(detail?.photo_path)
    }))
  );
};

/**
 * What the crew wrote down on site.
 *
 * FM2 asks for the report to be "widoczny w panelu administracyjnym"; before
 * this the office got only the card's id, status and completion time, so the
 * comments and the site photograph — the whole content of the report — stopped
 * at the installer's own screen.
 */
const toInstallationReport = async (rows) => {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return null;
  return {
    id: row.id,
    status: row.status ?? null,
    workerComments: row.worker_comments ?? null,
    photoUrl: await signInstallationPhoto(row.photo_evidence_url),
    completionTimestamp: row.completion_timestamp ?? null
  };
};

/**
 * The identity document of an order, as two flat fields.
 *
 * PostgREST hands an embedded relation back as an object or a single-element
 * array depending on how it reads the key, and an order with no document on
 * file has no row at all — all three cases mean the same thing here.
 */
const toIdentityDocument = (rows) => {
  const row = Array.isArray(rows) ? rows[0] : rows;
  return {
    passport_series: row?.passport_series ?? null,
    passport_number: row?.passport_number ?? null
  };
};

/**
 * The client behind an order, as they registered themselves.
 *
 * `profiles` holds the name and telephone the customer typed at sign-up, which
 * is not the same thing as `orders.client_full_name` — that one is retyped by
 * the office from the contract and may differ. Both are shown side by side so
 * a mismatch is visible rather than hidden. Reading every profile is allowed
 * here by the `profiles_select_self_or_staff` policy, so this still goes
 * through the RLS-bound client rather than the service role.
 */
/** Shapes what is known about the person an order or a card belongs to. */
const toClient = (userId, profile, email) => ({
  id: userId ?? null,
  email: email ?? null,
  firstName: profile?.first_name ?? null,
  lastName: profile?.last_name ?? null,
  phoneNumber: profile?.phone_number ?? null,
  role: profile?.role ?? null,
  registeredAt: profile?.created_at ?? null
});

export const listUsers = async ({ supabase }) => {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone_number, role, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to list profiles.');
  }

  const emailById = await loadAuthEmails();

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: emailById.get(p.id) ?? null,
    firstName: p.first_name,
    lastName: p.last_name,
    phoneNumber: p.phone_number,
    role: p.role,
    createdAt: p.created_at
  }));
};

export const updateUserRole = async ({ supabase, userId, role, actorUserId, ip }) => {
  if (!ALLOWED_ROLES.has(role)) {
    throw new PublicError('Invalid role.');
  }
  if (userId === actorUserId && role !== 'admin') {
    throw new PublicError('Admins cannot remove their own admin role.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select('id, role')
    .single();

  if (error) {
    throw new Error('Failed to update role.');
  }

  // The one event that has to stay attributable: granting someone admin is the
  // only way to reach every other permission in the system.
  logSecurityEvent('user.role_changed', { actorId: actorUserId, targetUserId: userId, role, ip });

  return data;
};

export const listOrders = async ({ supabase }) => {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to list orders.');
  }

  const orders = data ?? [];
  const userIds = orders.map((o) => o.user_id);
  const [profileById, emailById] = await Promise.all([
    loadClientProfiles({ supabase, userIds, columns: ACCOUNT_COLUMNS }),
    userIds.some(Boolean) ? loadAuthEmails() : Promise.resolve(new Map())
  ]);

  return Promise.all(
    orders.map(async ({ order_identity_documents: documents, installation_cards: cards, ...order }) => ({
      ...order,
      // Flattened back onto the order so the response keeps the shape it had
      // before 0014 moved these two fields into a table of their own. The
      // separation exists to give them their own RLS policies, not to make the
      // office read them from somewhere else.
      ...toIdentityDocument(documents),
      installation_report: await toInstallationReport(cards),
      order_cards: order.order_cards
        ? {
            ...order.order_cards,
            order_details: await withPhotoUrl(order.order_cards.order_details)
          }
        : null,
      client: toClient(order.user_id, profileById.get(order.user_id), emailById.get(order.user_id))
    }))
  );
};

export const updateOrderStatus = async ({ supabase, orderId, status }) => {
  if (!ALLOWED_ORDER_STATUSES.has(status)) {
    throw new PublicError('Invalid order status.');
  }
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('id, status, updated_at')
    .single();

  if (error) {
    throw new Error('Failed to update order status.');
  }

  return data;
};

export const listOrderCards = async ({ supabase, converted } = {}) => {
  const { data: cards, error } = await supabase
    .from('order_cards')
    .select(
      `
      id,
      user_id,
      created_at,
      order_details (
        id,
        material_id,
        dimensions,
        inscription_text,
        finish_type,
        shape,
        inscription_style,
        slab_variant,
        slab_thickness_cm,
        base_height_cm,
        base_width_cm,
        base_depth_cm,
        decoration,
          has_cross,
        has_flowerbed,
        photo_path,
        materials ( id, name, category, price_per_m2 )
      )
    `
    )
    // Newest submission first: the office works the queue from the top, and
    // before `created_at` existed this fell back to id order, which is
    // arbitrary for uuid primary keys.
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to list order cards.');
  }

  const cardIds = (cards ?? []).map((c) => c.id);

  let ordersByCardId = new Map();
  if (cardIds.length > 0) {
    const { data: relatedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, price, deadline, created_at, order_card_id')
      .in('order_card_id', cardIds);

    if (ordersError) {
      throw new Error('Failed to load related orders.');
    }

    ordersByCardId = new Map((relatedOrders ?? []).map((o) => [o.order_card_id, o]));
  }

  const userIds = [...new Set((cards ?? []).map((c) => c.user_id).filter(Boolean))];
  let userEmailById = new Map();
  let profileById = new Map();
  if (userIds.length > 0) {
    [userEmailById, profileById] = await Promise.all([
      loadAuthEmails(),
      loadClientProfiles({ supabase, userIds, columns: ACCOUNT_COLUMNS })
    ]);
  }

  const enriched = await Promise.all((cards ?? []).map(async (card) => ({
    ...card,
    order_details: await withPhotoUrl(card.order_details),
    user_email: card.user_id ? userEmailById.get(card.user_id) ?? null : null,
    // Everything the customer themselves supplied: the configuration above and
    // the contact details they registered with. Nothing here was typed by the
    // office — that only appears once the card becomes an order.
    client: toClient(card.user_id, profileById.get(card.user_id), userEmailById.get(card.user_id)),
    converted_order: ordersByCardId.get(card.id) ?? null
  })));

  if (converted === true) {
    return enriched.filter((c) => c.converted_order !== null);
  }
  if (converted === false) {
    return enriched.filter((c) => c.converted_order === null);
  }
  return enriched;
};

export const convertOrderCardToOrder = async ({
  supabase,
  orderCardId,
  payload
}) => {
  if (!orderCardId) {
    throw new PublicError('Missing order card id.');
  }

  const { data: card, error: cardError } = await supabase
    .from('order_cards')
    .select('id, user_id')
    .eq('id', orderCardId)
    .single();
  if (cardError || !card) {
    throw new PublicError('Order card not found.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('orders')
    .select('id')
    .eq('order_card_id', orderCardId)
    .maybeSingle();
  if (existingError) {
    throw new Error('Failed to check existing order.');
  }
  if (existing) {
    throw new PublicError('This order card has already been converted into an order.', 409);
  }

  const price =
    payload?.price === '' || payload?.price === null || payload?.price === undefined
      ? null
      : Number(payload.price);
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    throw new PublicError('Invalid price.');
  }

  const installationAddress = optionalText(payload?.installation_address, 'installation_address');
  const contractDetails = optionalText(payload?.contract_details, 'contract_details');
  const deadline =
    typeof payload?.deadline === 'string' && payload.deadline ? payload.deadline : null;

  const clientFullName = optionalText(payload?.client_full_name, 'client_full_name');
  const passportSeries = optionalText(payload?.passport_series, 'passport_series');
  const passportNumber = optionalText(payload?.passport_number, 'passport_number');

  const { data: order, error: insertError } = await supabase
    .from('orders')
    .insert({
      user_id: card.user_id,
      order_card_id: card.id,
      status: 'oczekujące',
      price,
      installation_address: installationAddress,
      contract_details: contractDetails,
      deadline,
      client_full_name: clientFullName
    })
    .select(
      'id, status, price, installation_address, contract_details, deadline, client_full_name, created_at, updated_at, user_id, order_card_id'
    )
    .single();

  if (insertError) {
    throw new Error('Failed to create order.');
  }

  // No document, no row: an order without one is the normal case for a contract
  // signed on the strength of something else, and a row of nulls would claim a
  // record exists where none does.
  if (passportSeries || passportNumber) {
    const { error: documentError } = await supabase
      .from('order_identity_documents')
      .insert({
        order_id: order.id,
        passport_series: passportSeries,
        passport_number: passportNumber
      });

    if (documentError) {
      // The order and its document are one act. Leaving the order behind would
      // consume the card's one conversion and give the office no way to retry.
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error('Failed to create order.');
    }
  }

  return { ...order, passport_series: passportSeries, passport_number: passportNumber };
};

/**
 * Removes an order card that never became an order.
 *
 * A card that was already converted is off limits. An order that falls through
 * is retired by setting its status to `anulowane`, which keeps the record and
 * its history where the customer and the office can still see it; deletion
 * exists only for cards the office decided not to turn into anything.
 *
 * The rule is enforced twice. Here, so a request that skips the interface meets
 * the same wall the browser puts up. And in the database, where
 * `orders.order_card_id` carries no `on delete cascade` — deliberately, see
 * 0017 — so a delete that got this far would still be refused rather than
 * taking the production order down with the card.
 *
 * The card's own configuration is a different matter: `order_details` does
 * cascade, because a row of dimensions belongs to the card and means nothing
 * without it.
 */
export const deleteOrderCard = async ({ supabase, orderCardId }) => {
  if (!orderCardId) {
    throw new PublicError('Missing order card id.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('orders')
    .select('id')
    .eq('order_card_id', orderCardId)
    .maybeSingle();
  if (existingError) {
    throw new Error('Failed to check existing order.');
  }
  if (existing) {
    throw new PublicError('This order card has already been converted into an order.', 409);
  }

  const { error } = await supabase.from('order_cards').delete().eq('id', orderCardId);
  if (error) {
    throw new Error('Failed to delete order card.');
  }

  return { id: orderCardId };
};

/**
 * Hands an order to the installation crew by opening its installation card.
 *
 * The crew reads every order regardless — that is how the worklist is
 * designed — so this does not gate their access. What it does is declare the
 * job ready to be carried out, which is the state the office was keeping in
 * its head until now.
 *
 * Idempotent on purpose: pressing the button twice, or pressing it after the
 * installer has already written a report, must not reset their work.
 */
export const handOverOrderToInstaller = async ({
  supabase,
  orderId
}) => {
  assertUuid(orderId, 'Invalid order id.');

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
    .select('id, status, completion_timestamp')
    .eq('order_id', orderId)
    .maybeSingle();
  if (existingError) {
    throw new Error('Failed to load the installation card.');
  }
  if (existing) {
    return { alreadyHandedOver: true, installationCard: existing };
  }

  const { data: created, error: insertError } = await supabase
    .from('installation_cards')
    .insert({ order_id: orderId, status: 'oczekujące' })
    .select('id, status, completion_timestamp')
    .single();
  if (insertError) {
    throw new Error('Failed to hand the order over.');
  }

  return { alreadyHandedOver: false, installationCard: created };
};
