import type { MonumentShape } from '@domain/entities/monument';
import type { FinishType } from '@domain/entities/order-card';

/**
 * What a monument costs.
 *
 * The catalogue stores one number per stone — a price per square metre — and
 * the old formula multiplied it by the front face and stopped there. That
 * priced a 5 cm stela the same as a 20 cm one, and gave away the base, the slab
 * and the lettering, which between them are usually more stone than the stela.
 *
 * So the catalogue rate is read as **the price of one square metre of stone cut
 * to the reference thickness**, and every part of the monument is charged as
 * area × rate × its own thickness. On top of the stone come the things a
 * workshop bills for separately: cutting the silhouette, engraving the letters,
 * the portrait, and the flowerbed.
 *
 * The numbers below are the tuning surface. They are set so that a standard
 * single monument — stela 100 × 50 × 5, its base, a full slab and a short
 * inscription — lands around 1200 BYN on the cheapest stone in the catalogue,
 * and rises from there with the stone, the size and the finish.
 */

/** Thickness the catalogue price refers to. */
export const REFERENCE_THICKNESS_CM = 5;

/**
 * Workmanship, per square metre of reference-thickness stone.
 *
 * Sawing, grinding and polishing cost roughly the same whatever the stone is
 * worth, so this rides alongside the material rate rather than scaling it. It
 * is also the single number to turn when the whole catalogue feels too cheap
 * or too dear.
 */
export const WORKMANSHIP_RATE_BYN_PER_M2 = 850;

/**
 * How much of that workmanship each finish actually costs.
 *
 * A polished face is taken through the full grit sequence; a honed one stops
 * partway; a matte one is barely worked after sawing.
 */
export const FINISH_WORKMANSHIP_FACTOR: Record<FinishType, number> = {
  Polished: 1,
  Honed: 0.85,
  Matte: 0.7
};

/** Per-shape starting price in BYN: cutting a profile costs more than a rectangle. */
export const SHAPE_BASE_PRICE_BYN: Record<MonumentShape, number> = {
  classic: 80,
  rounded: 100,
  stele: 150,
  concave: 130,
  asymmetric: 210,
  'wave-steep': 160,
  curvy: 240,
  dome: 230,
  arc: 180,
  'cross-top': 270,
  gothic: 190,
  cross: 290,
  heart: 170
};

/** Engraving, per character of the inscription. */
export const LETTER_PRICE_BYN = 1.5;

/**
 * Engraving on the face of the stela, by kind.
 *
 * A portrait is a photograph transferred into the stone. A cross is cut
 * freehand from a template and takes less of the engraver's day, so it costs
 * less; it used to cost nothing, which made it the one decoration a customer
 * could add for free.
 */
export const DECORATION_PRICE_BYN: Record<string, number> = {
  portrait: 150,
  cross: 90
};

/** A stone border around the slab. */
export const FLOWERBED_PRICE_BYN = 120;

/**
 * Cutting the cross that finishes the top of the stela.
 *
 * The stone in a finial is almost nothing — a few hundredths of a square metre
 * — so charging its area alone would put a cross on a monument for the price of
 * a coffee. What it actually costs is the cutting: a separate small piece,
 * profiled on four sides. Both parts are charged, the stone by area like every
 * other piece and the work as this figure.
 */
export const CROSS_CUTTING_BYN = 180;

/**
 * Front area of the finial, as a share of the stela's width squared.
 *
 * Taken from the geometry the viewer builds: an upright of 0.06 w × 0.32 w and
 * an arm of 0.22 w × 0.06 w, less the square where they cross. Its depth is
 * 0.4 of the stela's own thickness.
 */
const CROSS_AREA_FACTOR = 0.06 * 0.32 + 0.22 * 0.06 - 0.06 * 0.06;
const CROSS_THICKNESS_FACTOR = 0.4;

export const monumentAreaM2 = (dimensions: { heightCm: number; widthCm: number }) =>
  (dimensions.heightCm * dimensions.widthCm) / 10000;

export const parseDimensionPair = (raw: string | null | undefined) => {
  if (!raw) return null;
  const [a, b] = raw.toLowerCase().split('x').map((value) => Number(value.trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
  return { heightCm: a, widthCm: b };
};

/** Reads the optional third component of `100x60x8`. */
export const parseThicknessCm = (raw: string | null | undefined) => {
  if (!raw) return null;
  const parts = raw.toLowerCase().split('x');
  if (parts.length < 3) return null;
  const thickness = Number(parts[2].trim());
  return Number.isFinite(thickness) && thickness > 0 ? thickness : null;
};

export type SlabVariant = 'none' | 'half' | 'full';

/**
 * The footprint of the slab in front of the monument.
 *
 * The customer never types these numbers — the slab grows out of the base and
 * the stela. The same proportions drive the 3D model, which imports this
 * function so the stone being priced is the stone being drawn.
 */
export const slabFootprintCm = ({
  variant,
  baseWidthCm,
  baseDepthCm,
  stelaWidthCm,
  stelaThicknessCm
}: {
  variant: SlabVariant;
  baseWidthCm: number;
  baseDepthCm: number;
  stelaWidthCm: number;
  stelaThicknessCm: number;
}) => {
  if (variant === 'none') return null;
  return {
    widthCm: Math.max(baseWidthCm * 1.25, stelaWidthCm * 1.5),
    depthCm:
      variant === 'half'
        ? Math.max(baseDepthCm * 1.15, stelaThicknessCm * 2.8)
        : Math.max(baseDepthCm * 2.0, stelaThicknessCm * 5.5)
  };
};

export interface MonumentPriceInput {
  /** Catalogue rate: BYN per m² of stone at REFERENCE_THICKNESS_CM. */
  pricePerM2: number;
  stela: { heightCm: number; widthCm: number; thicknessCm?: number | null };
  shape?: MonumentShape;
  finish?: FinishType;
  base?: { heightCm: number; widthCm: number; depthCm: number } | null;
  slab?: { variant: SlabVariant; thicknessCm: number } | null;
  /** Characters to engrave; spaces and line breaks are cut too. */
  inscriptionLength?: number;
  decoration?: string | null;
  hasFlowerbed?: boolean | null;
  /** The cross finishing the top of the stela, not the cross-shaped silhouette. */
  hasCross?: boolean | null;
}

const stonePrice = (areaM2: number, thicknessCm: number, ratePerM2: number) =>
  areaM2 * ratePerM2 * (thicknessCm / REFERENCE_THICKNESS_CM);

/**
 * Estimated monument price in BYN.
 *
 * A stone with no catalogue rate drops out of the sum instead of turning the
 * whole price into NaN: an incomplete figure the office completes by hand is
 * less damaging than a broken price shown to the customer mid-order.
 */
export const monumentPriceByn = ({
  pricePerM2,
  stela,
  shape,
  finish = 'Polished',
  base = null,
  slab = null,
  inscriptionLength = 0,
  decoration = null,
  hasFlowerbed = false,
  hasCross = false
}: MonumentPriceInput) => {
  const stoneRate = Number.isFinite(pricePerM2) ? pricePerM2 : 0;
  const workmanship = WORKMANSHIP_RATE_BYN_PER_M2 * (FINISH_WORKMANSHIP_FACTOR[finish] ?? 1);
  const rate = stoneRate + workmanship;

  const stelaThickness = stela.thicknessCm ?? REFERENCE_THICKNESS_CM;
  let total = stonePrice(monumentAreaM2(stela), stelaThickness, rate);

  if (base) {
    // A pedestal is billed by its footprint and its height, the way a block is.
    total += stonePrice((base.widthCm * base.depthCm) / 10000, base.heightCm, rate);
  }

  if (slab && slab.variant !== 'none') {
    const footprint = slabFootprintCm({
      variant: slab.variant,
      baseWidthCm: base?.widthCm ?? stela.widthCm * 1.4,
      baseDepthCm: base?.depthCm ?? stelaThickness * 1.5,
      stelaWidthCm: stela.widthCm,
      stelaThicknessCm: stelaThickness
    });
    if (footprint) {
      total += stonePrice(
        (footprint.widthCm * footprint.depthCm) / 10000,
        slab.thicknessCm,
        rate
      );
    }
  }

  if (hasCross) {
    const widthM = stela.widthCm / 100;
    total +=
      stonePrice(
        CROSS_AREA_FACTOR * widthM * widthM,
        stelaThickness * CROSS_THICKNESS_FACTOR,
        rate
      ) + CROSS_CUTTING_BYN;
  }

  total += shape ? (SHAPE_BASE_PRICE_BYN[shape] ?? 0) : 0;
  total += inscriptionLength * LETTER_PRICE_BYN;
  if (decoration) {
    total += DECORATION_PRICE_BYN[decoration] ?? 0;
  }
  if (hasFlowerbed) total += FLOWERBED_PRICE_BYN;

  return Math.round(total);
};
