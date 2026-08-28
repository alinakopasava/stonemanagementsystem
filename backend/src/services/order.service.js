/**
 * What the signed-in customer has ordered, newest first.
 *
 * The list is built from `order_cards`, not `orders`, on purpose. A card exists
 * the moment the customer sends a configuration; the order only appears once
 * the office converts it. Listing orders alone would leave someone who has just
 * ordered staring at an empty page, so a card without an order is reported with
 * `order: null` and the UI reads that as "awaiting confirmation".
 *
 * There is no `user_id` predicate here: the client is user-scoped, so RLS
 * already restricts both queries to the caller's own rows.
 */
const MY_ORDER_SELECT = `
  id,
  created_at,
  order_details (
    id,
    dimensions,
    inscription_text,
    finish_type,
    materials ( id, name, category, price_per_m2 )
  )
`;

/**
 * A ceiling, not a page: nobody orders a hundred monuments, and an unbounded
 * query would also put every card id into the `in(...)` filter below — which
 * travels as a URL and stops being a valid request long before it stops being
 * a sensible one.
 */
const MAX_ORDERS = 100;

export const listMyOrders = async ({ supabase }) => {
  const { data: cards, error } = await supabase
    .from('order_cards')
    .select(MY_ORDER_SELECT)
    .order('created_at', { ascending: false })
    .limit(MAX_ORDERS);

  if (error) {
    throw new Error('Failed to load orders.');
  }

  const cardIds = (cards ?? []).map((c) => c.id);

  let orderByCardId = new Map();
  if (cardIds.length > 0) {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(
        'id, status, price, deadline, installation_address, created_at, updated_at, order_card_id'
      )
      .in('order_card_id', cardIds);

    if (ordersError) {
      throw new Error('Failed to load orders.');
    }

    orderByCardId = new Map((orders ?? []).map((o) => [o.order_card_id, o]));
  }

  return (cards ?? []).map((card) => ({
    id: card.id,
    submitted_at: card.created_at,
    order_details: card.order_details ?? [],
    order: orderByCardId.get(card.id) ?? null
  }));
};
