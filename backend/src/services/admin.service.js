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
 * Lists every order_card with its details and (if any) the order it has
 * already been converted into. The admin uses this to triage drafts that
 * came in from the configurator and decide which ones become real orders.
 */
export const listOrderCards = async ({ converted } = {}) => {
  const { data: cards, error } = await supabaseAdmin
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
    throw new Error(`Failed to list order cards: ${error.message}`);
  }

  const cardIds = (cards ?? []).map((c) => c.id);

  let ordersByCardId = new Map();
  if (cardIds.length > 0) {
    const { data: relatedOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, status, price, deadline, created_at, order_card_id')
      .in('order_card_id', cardIds);

    if (ordersError) {
      throw new Error(`Failed to load related orders: ${ordersError.message}`);
    }

    ordersByCardId = new Map(
      (relatedOrders ?? []).map((o) => [o.order_card_id, o])
    );
  }

  let userEmailById = new Map();
  const userIds = [...new Set((cards ?? []).map((c) => c.user_id).filter(Boolean))];
  if (userIds.length > 0) {
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    if (usersError) {
      throw new Error(`Failed to load users: ${usersError.message}`);
    }
    userEmailById = new Map(usersData.users.map((u) => [u.id, u.email ?? null]));
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

/**
 * Promotes an order_card draft into a real `orders` row. The admin supplies
 * commercial data the client cannot set (price, address, contract details,
 * deadline). The order's user_id is copied from the card so RLS keeps
 * working for the client. Status defaults to "oczekujące".
 */
export const convertOrderCardToOrder = async ({ orderCardId, payload }) => {
  if (!orderCardId) {
    throw new Error('Missing order card id.');
  }

  const { data: card, error: cardError } = await supabaseAdmin
    .from('order_cards')
    .select('id, user_id')
    .eq('id', orderCardId)
    .single();
  if (cardError || !card) {
    throw new Error(`Order card not found: ${cardError?.message ?? orderCardId}`);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('order_card_id', orderCardId)
    .maybeSingle();
  if (existingError) {
    throw new Error(`Failed to check existing order: ${existingError.message}`);
  }
  if (existing) {
    throw new Error('This order card has already been converted into an order.');
  }

  const price = payload?.price === '' || payload?.price === null || payload?.price === undefined
    ? null
    : Number(payload.price);
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    throw new Error('Invalid price.');
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

  const { data: order, error: insertError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: card.user_id,
      order_card_id: card.id,
      status: 'oczekujące',
      price,
      installation_address: installationAddress,
      contract_details: contractDetails,
      deadline
    })
    .select(
      'id, status, price, installation_address, contract_details, deadline, created_at, updated_at, user_id, order_card_id'
    )
    .single();

  if (insertError) {
    throw new Error(`Failed to create order: ${insertError.message}`);
  }

  return order;
};

export const deleteOrderCard = async ({ orderCardId }) => {
  if (!orderCardId) {
    throw new Error('Missing order card id.');
  }
  const { error } = await supabaseAdmin
    .from('order_cards')
    .delete()
    .eq('id', orderCardId);
  if (error) {
    throw new Error(`Failed to delete order card: ${error.message}`);
  }
  return { id: orderCardId };
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
