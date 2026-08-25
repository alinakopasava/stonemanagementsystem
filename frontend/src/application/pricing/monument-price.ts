import type { MonumentShape } from '@domain/entities/monument';

/** Per-shape starting price in BYN, before stone area. Shared by catalog and designer. */
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

export const monumentAreaM2 = (dimensions: { heightCm: number; widthCm: number }) =>
  (dimensions.heightCm * dimensions.widthCm) / 10000;

export const parseDimensionPair = (raw: string | null | undefined) => {
  if (!raw) return null;
  const [a, b] = raw.toLowerCase().split('x').map((value) => Number(value.trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
  return { heightCm: a, widthCm: b };
};

/** Estimated monument price in BYN: shape base + area × stone price. */
export const monumentPriceByn = (
  pricePerM2: number,
  dimensions: { heightCm: number; widthCm: number },
  shape?: MonumentShape
) => {
  const base = shape ? (SHAPE_BASE_PRICE_BYN[shape] ?? 0) : 0;
  return Math.round((base + monumentAreaM2(dimensions) * pricePerM2) * 100) / 100;
};
