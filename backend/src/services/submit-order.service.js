import { PublicError } from '../http/errors.js';
import { isUuid } from '../http/ids.js';

const DIMENSIONS_RE = /^\d{1,4}x\d{1,4}(?:x\d{1,4})?$/i;
const ALLOWED_FINISH = new Set(['Polished', 'Matte', 'Honed']);
const MAX_INSCRIPTION_LENGTH = 4000;

/*
 * The rest of the configuration.
 *
 * These vocabularies mirror the check constraints added in migration 0010, so
 * a value the backend lets through is one the database also accepts. Each one
 * is optional: a card submitted by an older client, or by a customer who never
 * opened the corresponding panel, simply stores null and the workshop sheet
 * prints a dash.
 */
const ALLOWED_SHAPES = new Set(['classic', 'rounded', 'stele']);
const ALLOWED_INSCRIPTION_STYLES = new Set(['roman', 'elegant', 'script', 'classic', 'gothic']);
const ALLOWED_SLAB_VARIANTS = new Set(['none', 'half', 'full']);
const ALLOWED_DECORATIONS = new Set(['none', 'portrait', 'cross']);

/** Centimetres. The ceilings match the constraint in migration 0010. */
const MEASUREMENT_LIMITS = {
  slabThicknessCm: 100,
  baseHeightCm: 500,
  baseWidthCm: 500,
  baseDepthCm: 500
};

/** Everything a reader downstream needs; kept in one place so it cannot drift. */
export const ORDER_DETAILS_SELECT = `
  id,
  material_id,
  dimensions,
  inscription_text,
  finish_type,
  order_card_id,
  shape,
  inscription_style,
  slab_variant,
  slab_thickness_cm,
  base_height_cm,
  base_width_cm,
  base_depth_cm,
  decoration,
  has_cross,
  has_flowerbed
`;

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

/** Optional enumerated value: absent stays absent, present has to be known. */
const asOptionalChoice = (value, allowed, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw new PublicError(`Invalid ${fieldName}.`);
  }
  return value;
};

/** Optional measurement in centimetres, rejected rather than rounded silently. */
const asOptionalMeasurement = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MEASUREMENT_LIMITS[fieldName]) {
    throw new PublicError(`Invalid ${fieldName}.`);
  }
  return parsed;
};

/** Optional free text, e.g. the second inscription on a double monument. */
const asOptionalText = (value, fieldName) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new PublicError(`Invalid ${fieldName}.`);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_INSCRIPTION_LENGTH) {
    throw new PublicError(`${fieldName} is too long.`);
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
  if (!isUuid(materialId)) {
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

  const configuration = {
    shape: asOptionalChoice(payload.shape, ALLOWED_SHAPES, 'shape'),
    inscription_style: asOptionalChoice(
      payload.inscriptionStyle,
      ALLOWED_INSCRIPTION_STYLES,
      'inscriptionStyle'
    ),
    slab_variant: asOptionalChoice(payload.slabVariant, ALLOWED_SLAB_VARIANTS, 'slabVariant'),
    slab_thickness_cm: asOptionalMeasurement(payload.slabThicknessCm, 'slabThicknessCm'),
    base_height_cm: asOptionalMeasurement(payload.baseHeightCm, 'baseHeightCm'),
    base_width_cm: asOptionalMeasurement(payload.baseWidthCm, 'baseWidthCm'),
    base_depth_cm: asOptionalMeasurement(payload.baseDepthCm, 'baseDepthCm'),
    decoration: asOptionalChoice(payload.decoration, ALLOWED_DECORATIONS, 'decoration'),
    has_cross: typeof payload.hasCross === 'boolean' ? payload.hasCross : null,
    has_flowerbed: typeof payload.hasFlowerbed === 'boolean' ? payload.hasFlowerbed : null
  };

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
      order_card_id: insertedOrderCard.id,
      ...configuration
    })
    .select(ORDER_DETAILS_SELECT)
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
