import { PublicError } from '../http/errors.js';

const ensureRequired = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    throw new PublicError(`Missing required field: ${fieldName}.`);
  }
};

/**
 * Submits an order on behalf of the authenticated user.
 *
 * @param {object} args
 * @param {import('@supabase/supabase-js').SupabaseClient} args.supabase  user-scoped client (RLS enforced)
 * @param {string} args.userId  authenticated user id (auth.uid())
 * @param {object} args.payload request body
 */
export const submitOrder = async ({ supabase, userId, payload }) => {
  if (!payload || typeof payload !== 'object') {
    throw new PublicError('Missing required field: materialId.');
  }
  ensureRequired(payload.materialId, 'materialId');
  ensureRequired(payload.dimensions, 'dimensions');
  ensureRequired(payload.inscriptionText, 'inscriptionText');
  ensureRequired(payload.finishType, 'finishType');

  const { data: insertedOrderCard, error: orderCardError } = await supabase
    .from('order_cards')
    .insert({ user_id: userId })
    .select('id, user_id')
    .single();

  if (orderCardError) {
    throw new PublicError('Could not submit the order.');
  }

  const { data: insertedOrderDetails, error: orderDetailsError } = await supabase
    .from('order_details')
    .insert({
      material_id: payload.materialId,
      dimensions: payload.dimensions,
      inscription_text: payload.inscriptionText,
      finish_type: payload.finishType,
      order_card_id: insertedOrderCard.id
    })
    .select('id, material_id, dimensions, inscription_text, finish_type, order_card_id')
    .single();

  if (orderDetailsError) {
    await supabase.from('order_cards').delete().eq('id', insertedOrderCard.id);
    throw new PublicError('Could not submit the order.');
  }

  return {
    orderCard: insertedOrderCard,
    orderDetails: insertedOrderDetails
  };
};
