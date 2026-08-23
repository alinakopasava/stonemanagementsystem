import { supabaseAdmin } from '../config/supabase.js';
import { PublicError } from '../http/errors.js';
import { writeAuditLog } from './audit.service.js';

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
  order_cards (
    id,
    user_id,
    order_details (
      id,
      material_id,
      dimensions,
      inscription_text,
      finish_type,
      materials ( id, name, category )
    )
  )
`;

const loadAuthEmails = async () => {
  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  if (listError) {
    throw new Error('Failed to list auth users.');
  }
  return new Map(usersData.users.map((u) => [u.id, u.email ?? null]));
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

export const updateUserRole = async ({ supabase, userId, role, actorUserId, ip, userAgent }) => {
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

  await writeAuditLog({
    actorId: actorUserId,
    action: 'user.role_changed',
    entity: 'profiles',
    entityId: userId,
    ip,
    userAgent,
    metadata: { role }
  });

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

  return data ?? [];
};

export const updateOrderStatus = async ({ supabase, orderId, status, actorUserId, ip, userAgent }) => {
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

  await writeAuditLog({
    actorId: actorUserId,
    action: 'order.status_changed',
    entity: 'orders',
    entityId: orderId,
    ip,
    userAgent,
    metadata: { status }
  });

  return data;
};

export const listOrderCards = async ({ supabase, converted } = {}) => {
  const { data: cards, error } = await supabase
    .from('order_cards')
    .select(
      `
      id,
      user_id,
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
    .order('id', { ascending: false });

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
  if (userIds.length > 0) {
    userEmailById = await loadAuthEmails();
  }

  const enriched = (cards ?? []).map((card) => ({
    ...card,
    user_email: card.user_id ? userEmailById.get(card.user_id) ?? null : null,
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
  payload,
  actorUserId,
  ip,
  userAgent
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

  await writeAuditLog({
    actorId: actorUserId,
    action: 'order_card.converted',
    entity: 'order_cards',
    entityId: orderCardId,
    ip,
    userAgent,
    metadata: { orderId: order.id }
  });

  return order;
};

export const deleteOrderCard = async ({ supabase, orderCardId, actorUserId, ip, userAgent }) => {
  if (!orderCardId) {
    throw new PublicError('Missing order card id.');
  }
  const { error } = await supabase.from('order_cards').delete().eq('id', orderCardId);
  if (error) {
    throw new Error('Failed to delete order card.');
  }

  await writeAuditLog({
    actorId: actorUserId,
    action: 'order_card.deleted',
    entity: 'order_cards',
    entityId: orderCardId,
    ip,
    userAgent
  });

  return { id: orderCardId };
};
