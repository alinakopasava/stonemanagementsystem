import { describe, it, expect } from 'vitest';
import {
  SHAPE_BASE_PRICE_BYN,
  monumentAreaM2,
  monumentPriceByn,
  parseDimensionPair
} from '@application/pricing/monument-price';
import {
  SELECTABLE_MONUMENT_SHAPES,
  isSelectableMonumentShape
} from '@domain/entities/monument';

/**
 * The pricing oracle.
 *
 * `monumentPriceByn` is the single formula behind the catalogue card, the
 * configurator summary and the price suggested in the admin panel, so it is
 * pinned here independently and reused as the expected value in the component
 * tests rather than re-deriving the arithmetic in each of them.
 */

describe('monumentAreaM2', () => {
  it('converts centimetres to square metres', () => {
    expect(monumentAreaM2({ heightCm: 100, widthCm: 60 })).toBeCloseTo(0.6, 10);
    expect(monumentAreaM2({ heightCm: 100, widthCm: 100 })).toBe(1);
  });
});

describe('parseDimensionPair', () => {
  it('reads a height x width pair', () => {
    expect(parseDimensionPair('100x60')).toEqual({ heightCm: 100, widthCm: 60 });
  });

  it('tolerates spacing and capital X', () => {
    expect(parseDimensionPair(' 120 X 70 ')).toEqual({ heightCm: 120, widthCm: 70 });
  });

  it('returns null for anything that is not a pair of positive numbers', () => {
    // A zero or a negative would otherwise price the slab at its base alone.
    for (const raw of ['', null, undefined, '10060', 'abcxdef', '0x60', '-10x60']) {
      expect(parseDimensionPair(raw as string), String(raw)).toBeNull();
    }
  });
});

describe('monumentPriceByn', () => {
  it('adds the shape base price to area times the stone rate', () => {
    // classic base 80 + 0.6 m² * 420 BYN = 80 + 252 = 332
    expect(monumentPriceByn(420, { heightCm: 100, widthCm: 60 }, 'classic')).toBe(332);
  });

  it('omits the base price when no shape is given', () => {
    expect(monumentPriceByn(420, { heightCm: 100, widthCm: 60 })).toBe(252);
  });

  it('rounds to two decimal places', () => {
    // 80 + 0.6 m² * 12.345 = 87.407, which the customer sees as 87.41.
    expect(monumentPriceByn(12.345, { heightCm: 100, widthCm: 60 }, 'classic')).toBe(87.41);
  });

  /* ---------------------------------------------------------------- */
  /* Worked examples, each computed from the formula by hand           */
  /* ---------------------------------------------------------------- */

  describe('worked examples', () => {
    // 180 x 90 cm is 1.62 m2, so at 100 BYN/m2 the stone contributes 162.
    const SLAB = { heightCm: 180, widthCm: 90 };

    it.each([
      ['classic', 'classic' as const, 80 + 162],
      ['cross, the most labour-intensive contour', 'cross' as const, 290 + 162]
    ])('prices a 180 x 90 slab in %s stone at 100 BYN/m2', (_label, shape, expected) => {
      expect(monumentPriceByn(100, SLAB, shape)).toBe(expected);
    });

    it('charges the base price alone when the stone itself costs nothing', () => {
      expect(monumentPriceByn(0, SLAB, 'classic')).toBe(80);
    });

    it('charges the area alone for a shape identifier it does not recognise', () => {
      // Reachable from a bookmarked address written before the shape list grew.
      // A missing base price must not become NaN and wipe out the whole sum:
      // an incomplete price the office can correct beats an error mid-order.
      const price = monumentPriceByn(100, SLAB, 'trapezoid' as never);

      expect(price).toBe(162);
      expect(Number.isNaN(price)).toBe(false);
    });

    it('charges the base price alone when the stone has no catalogue rate', () => {
      const price = monumentPriceByn(Number.NaN, SLAB, 'classic');

      expect(Number.isNaN(price)).toBe(false);
      expect(price).toBe(80);
    });
  });
});

/* ------------------------------------------------------------------ */
/* The base price table itself                                         */
/* ------------------------------------------------------------------ */

describe('SHAPE_BASE_PRICE_BYN', () => {
  /**
   * Pinned independently of the source, because these are commercial figures
   * rather than derived values: a shape whose contour takes longer to cut and
   * polish starts dearer. Nothing else in the suite would notice if one of them
   * were changed by accident, and the error would reach the customer as a price.
   */
  const PRICE_LIST: Record<string, number> = {
    classic: 80,
    rounded: 100,
    concave: 130,
    stele: 150,
    'wave-steep': 160,
    heart: 170,
    arc: 180,
    gothic: 190,
    asymmetric: 210,
    dome: 230,
    curvy: 240,
    'cross-top': 270,
    cross: 290
  };

  it('is exactly the thirteen prices the price list names', () => {
    // One equality covers all three questions at once: every shape is priced,
    // priced correctly, and no shape has appeared that the price list omits.
    expect(SHAPE_BASE_PRICE_BYN).toEqual(PRICE_LIST);
  });
});

describe('selectable shapes', () => {
  it('is the single list the catalogue and the configurator share', () => {
    expect(SELECTABLE_MONUMENT_SHAPES).toEqual(['classic', 'rounded', 'stele']);
  });

  it('recognises each of them', () => {
    for (const shape of SELECTABLE_MONUMENT_SHAPES) {
      expect(isSelectableMonumentShape(shape)).toBe(true);
    }
  });

  it('rejects everything else, priced shapes included', () => {
    for (const value of ['gothic', 'heart', 'cross', 'nonsense', '', null, undefined, 42]) {
      expect(isSelectableMonumentShape(value), String(value)).toBe(false);
    }
  });
});
