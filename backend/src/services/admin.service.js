import { supabaseAdmin } from '../config/supabase.js';

const ALLOWED_ROLES = new Set(['klient', 'monter', 'admin']);
const ALLOWED_ORDER_STATUSES = new Set([
  'oczekujące',
  'w_realizacji',
  'zrealizowane',
  'anulowane'
]);

/**
 * Lists every profile, enriched with the email from auth.users.
 * Uses the service-role client because auth.users is not exposed via RLS.
 */
export const listUsers = async () => {
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, phone_number, role, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list profiles: ${error.message}`);
  }

  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  if (listError) {
    throw new Error(`Failed to list auth users: ${listError.message}`);
  }
  const emailById = new Map(usersData.users.map((u) => [u.id, u.email ?? null]));

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

export const updateUserRole = async ({ userId, role, actorUserId }) => {
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  if (userId === actorUserId && role !== 'admin') {
    // Safety: an admin cannot demote themselves and lock everyone out.
    throw new Error('Admins cannot remove their own admin role.');
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select('id, role')
    .single();

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`);
  }
  return data;
};

export const listOrders = async () => {
  // Service-role bypasses RLS so admins always see everything regardless of
  // future policy tweaks. Returns flattened rows with nested card+details.
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(
      `
      id,
      status,
      price,
      installation_address,
      contract_details,
      deadline,
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
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list orders: ${error.message}`);
  }

  return data ?? [];
};

export const updateOrderStatus = async ({ orderId, status }) => {
  if (!ALLOWED_ORDER_STATUSES.has(status)) {
    throw new Error(`Invalid order status: ${status}`);
  }
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('id, status, updated_at')
    .single();

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
  return data;
};

/**
 * Submits a new order using the service-role client. Used by clients placing
 * an order for themselves - RLS is bypassed on purpose because we already
 * authenticated the user in the middleware and we always set user_id from
 * req.user.id (never from the payload).
 *
 * Kept here so future order-management endpoints can live alongside the
 * admin ones.
 */
export const submitOrderAsUser = async ({ userId, payload }) => {
  const { data: card, error: cardErr } = await supabaseAdmin
    .from('order_cards')
    .insert({ user_id: userId })
    .select('id, user_id')
    .single();
  if (cardErr) throw new Error(`Failed to insert order_cards: ${cardErr.message}`);

  const { data: details, error: detailsErr } = await supabaseAdmin
    .from('order_details')
    .insert({
      material_id: payload.materialId,
      dimensions: payload.dimensions,
      inscription_text: payload.inscriptionText,
      finish_type: payload.finishType,
      order_card_id: card.id
    })
    .select('id, material_id, dimensions, inscription_text, finish_type, order_card_id')
    .single();

  if (detailsErr) {
    await supabaseAdmin.from('order_cards').delete().eq('id', card.id);
    throw new Error(`Failed to insert order_details: ${detailsErr.message}`);
  }

  return { orderCard: card, orderDetails: details };
};
