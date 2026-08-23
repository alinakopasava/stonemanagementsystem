import { PublicError } from '../http/errors.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIMENSIONS_RE = /^\d{1,4}x\d{1,4}(?:x\d{1,4})?$/i;
const ALLOWED_FINISH = new Set(['Polished', 'Matte', 'Honed']);
const MAX_INSCRIPTION_LENGTH = 4000;

const ensureRequired = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    throw new PublicError(`Missing required field: ${fieldName}.`);
  }
};

const asTrimmedString = (value, fieldName) => {
  ensureRequired(value, fieldName);
  if (typeof value !== 'string') {
    throw new PublicError(`Invalid ${fieldName}.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new PublicError(`Missing required field: ${fieldName}.`);
  }
  return trimmed;
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

  const materialId = asTrimmedString(payload.materialId, 'materialId');
  if (!UUID_RE.test(materialId)) {
    throw new PublicError('Invalid materialId.');
  }

  const dimensions = asTrimmedString(payload.dimensions, 'dimensions');
  if (!DIMENSIONS_RE.test(dimensions)) {
    throw new PublicError('Invalid dimensions. Use heightxwidth (cm).');
  }

  const inscriptionText = asTrimmedString(payload.inscriptionText, 'inscriptionText');
  if (inscriptionText.length > MAX_INSCRIPTION_LENGTH) {
    throw new PublicError('Inscription is too long.');
  }

  const finishType = asTrimmedString(payload.finishType, 'finishType');
  if (!ALLOWED_FINISH.has(finishType)) {
    throw new PublicError('Invalid finishType.');
  }

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
      material_id: materialId,
      dimensions,
      inscription_text: inscriptionText,
      finish_type: finishType,
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
