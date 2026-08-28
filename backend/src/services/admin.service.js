import { supabaseAdmin } from '../config/supabase.js';
import { PublicError } from '../http/errors.js';
import { logSecurityEvent } from './security-log.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_ROLES = new Set(['klient', 'monter', 'admin']);
const ALLOWED_ORDER_STATUSES = new Set([
  'oczekujące',
  'w_realizacji',
  'zrealizowane',
  'anulowane'
]);

const ORDER_SELECT = `
  id,
  status,
  price,
  installation_address,
  contract_details,
  deadline,
  client_full_name,
  passport_series,
  passport_number,
  created_at,
  updated_at,
  user_id,
  order_card_id,
  installation_cards (
    id,
    status,
    completion_timestamp
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
      materials ( id, name, category, price_per_m2 )
    )
  )
`;

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
const loadClientProfiles = async ({ supabase, userIds }) => {
  const wanted = [...new Set((userIds ?? []).filter(Boolean))];
  if (wanted.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone_number, role, created_at')
    .in('id', wanted);

  if (error) {
    throw new Error('Failed to load client profiles.');
  }

  return new Map((data ?? []).map((p) => [p.id, p]));
};

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

const loadAuthEmails = async () => {
  const emailById = new Map();
  const perPage = 1000;
  for (let page = 1; page <= 50; page += 1) {
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });
    if (listError) {
      throw new Error('Failed to list auth users.');
    }
    const users = usersData?.users ?? [];
    for (const user of users) {
      emailById.set(user.id, user.email ?? null);
    }
    if (users.length < perPage) break;
  }
  return emailById;
};

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
    loadClientProfiles({ supabase, userIds }),
    userIds.some(Boolean) ? loadAuthEmails() : Promise.resolve(new Map())
  ]);

  return orders.map((order) => ({
    ...order,
    client: toClient(order.user_id, profileById.get(order.user_id), emailById.get(order.user_id))
  }));
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
      loadClientProfiles({ supabase, userIds })
    ]);
  }

  const enriched = (cards ?? []).map((card) => ({
    ...card,
    user_email: card.user_id ? userEmailById.get(card.user_id) ?? null : null,
    // Everything the customer themselves supplied: the configuration above and
    // the contact details they registered with. Nothing here was typed by the
    // office — that only appears once the card becomes an order.
    client: toClient(card.user_id, profileById.get(card.user_id), userEmailById.get(card.user_id)),
    converted_order: ordersByCardId.get(card.id) ?? null
  }));

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

  const installationAddress =
    typeof payload?.installation_address === 'string'
      ? payload.installation_address.trim() || null
      : null;
  const contractDetails =
    typeof payload?.contract_details === 'string'
      ? payload.contract_details.trim() || null
      : null;
  const deadline =
    typeof payload?.deadline === 'string' && payload.deadline ? payload.deadline : null;

  const clientFullName =
    typeof payload?.client_full_name === 'string'
      ? payload.client_full_name.trim() || null
      : null;
  const passportSeries =
    typeof payload?.passport_series === 'string'
      ? payload.passport_series.trim() || null
      : null;
  const passportNumber =
    typeof payload?.passport_number === 'string'
      ? payload.passport_number.trim() || null
      : null;

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
      client_full_name: clientFullName,
      passport_series: passportSeries,
      passport_number: passportNumber
    })
    .select(
      'id, status, price, installation_address, contract_details, deadline, client_full_name, passport_series, passport_number, created_at, updated_at, user_id, order_card_id'
    )
    .single();

  if (insertError) {
    throw new Error('Failed to create order.');
  }

  return order;
};

export const deleteOrderCard = async ({ supabase, orderCardId }) => {
  if (!orderCardId) {
    throw new PublicError('Missing order card id.');
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
  if (typeof orderId !== 'string' || !UUID_RE.test(orderId)) {
    throw new PublicError('Invalid order id.');
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
