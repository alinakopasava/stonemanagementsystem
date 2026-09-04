import { describe, it, expect } from 'vitest';
import {
  CROSS_CUTTING_BYN,
  FLOWERBED_PRICE_BYN,
  LETTER_PRICE_BYN,
  DECORATION_PRICE_BYN,
  REFERENCE_THICKNESS_CM,
  SHAPE_BASE_PRICE_BYN,
  WORKMANSHIP_RATE_BYN_PER_M2,
  monumentAreaM2,
  monumentPriceByn,
  parseDimensionPair,
  parseThicknessCm,
  slabFootprintCm
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

describe('parseThicknessCm', () => {
  it('reads the third component when the dimensions carry one', () => {
    expect(parseThicknessCm('100x60x8')).toBe(8);
  });

  it('returns null for a pair, so the reference thickness applies', () => {
    for (const raw of ['100x60', '', null, undefined, '100x60xabc', '100x60x0']) {
      expect(parseThicknessCm(raw as string), String(raw)).toBeNull();
    }
  });
});

describe('slabFootprintCm', () => {
  const ARGS = { baseWidthCm: 50, baseDepthCm: 15, stelaWidthCm: 50, stelaThicknessCm: 5 };

  it('has no footprint when no slab was ordered', () => {
    expect(slabFootprintCm({ ...ARGS, variant: 'none' })).toBeNull();
  });

  it('grows a full slab deeper than a half one', () => {
    const half = slabFootprintCm({ ...ARGS, variant: 'half' })!;
    const full = slabFootprintCm({ ...ARGS, variant: 'full' })!;

    expect(full.widthCm).toBe(half.widthCm);
    expect(full.depthCm).toBeGreaterThan(half.depthCm);
  });

  it('widens with the stela when the base is too narrow to set the width', () => {
    // The customer can dial the base narrower than the stone standing on it;
    // the slab still has to reach past the monument.
    expect(slabFootprintCm({ ...ARGS, baseWidthCm: 20, variant: 'full' })!.widthCm).toBe(75);
  });
});

describe('monumentPriceByn', () => {
  /** The rate a square metre of this stone is charged at, at 5 cm, polished. */
  const RATE = 420 + WORKMANSHIP_RATE_BYN_PER_M2;

  it('charges the stela by area, thickness and the shape it is cut to', () => {
    // 0.5 m² × (420 + 850) × 5/5 = 635, plus the classic contour at 80.
    expect(
      monumentPriceByn({
        pricePerM2: 420,
        stela: { heightCm: 100, widthCm: 50, thicknessCm: 5 },
        shape: 'classic'
      })
    ).toBe(Math.round(0.5 * RATE + 80));
  });

  it('charges twice as much for twice the thickness', () => {
    const thin = monumentPriceByn({
      pricePerM2: 420,
      stela: { heightCm: 100, widthCm: 50, thicknessCm: 5 }
    });
    const thick = monumentPriceByn({
      pricePerM2: 420,
      stela: { heightCm: 100, widthCm: 50, thicknessCm: 10 }
    });

    // The old formula ignored thickness entirely and priced these the same,
    // which gave away half the stone in the block.
    expect(thick).toBe(thin * 2);
  });

  it('falls back to the reference thickness when none was configured', () => {
    expect(
      monumentPriceByn({ pricePerM2: 420, stela: { heightCm: 100, widthCm: 50 } })
    ).toBe(monumentPriceByn({
      pricePerM2: 420,
      stela: { heightCm: 100, widthCm: 50, thicknessCm: REFERENCE_THICKNESS_CM }
    }));
  });

  it('charges less for a finish that takes less work', () => {
    const stela = { heightCm: 100, widthCm: 50, thicknessCm: 5 };
    const polished = monumentPriceByn({ pricePerM2: 420, stela, finish: 'Polished' });
    const honed = monumentPriceByn({ pricePerM2: 420, stela, finish: 'Honed' });
    const matte = monumentPriceByn({ pricePerM2: 420, stela, finish: 'Matte' });

    // Only the workmanship half of the rate moves; the stone costs what it costs.
    expect(polished).toBeGreaterThan(honed);
    expect(honed).toBeGreaterThan(matte);
  });

  it('bills the base and the slab as the stone they are', () => {
    const stela = { heightCm: 100, widthCm: 50, thicknessCm: 5 };
    const bare = monumentPriceByn({ pricePerM2: 420, stela });
    const withBase = monumentPriceByn({
      pricePerM2: 420,
      stela,
      base: { heightCm: 20, widthCm: 50, depthCm: 15 }
    });
    const complete = monumentPriceByn({
      pricePerM2: 420,
      stela,
      base: { heightCm: 20, widthCm: 50, depthCm: 15 },
      slab: { variant: 'full', thicknessCm: 5 }
    });

    // A pedestal and a slab used to cost nothing at all.
    expect(withBase).toBeGreaterThan(bare);
    expect(complete).toBeGreaterThan(withBase);
  });

  it('charges for the letters, the portrait and the flowerbed', () => {
    const stela = { heightCm: 100, widthCm: 50, thicknessCm: 5 };
    const plain = monumentPriceByn({ pricePerM2: 420, stela });

    expect(monumentPriceByn({ pricePerM2: 420, stela, inscriptionLength: 40 })).toBe(
      plain + 40 * LETTER_PRICE_BYN
    );
    expect(monumentPriceByn({ pricePerM2: 420, stela, decoration: 'portrait' })).toBe(
      plain + DECORATION_PRICE_BYN.portrait
    );
    expect(monumentPriceByn({ pricePerM2: 420, stela, hasFlowerbed: true })).toBe(
      plain + FLOWERBED_PRICE_BYN
    );
    // A plain slab with no decoration is charged for neither.
    expect(monumentPriceByn({ pricePerM2: 420, stela, decoration: 'none' })).toBe(plain);
  });

  it('charges every decoration, the engraved cross included', () => {
    const stela = { heightCm: 100, widthCm: 50, thicknessCm: 5 };
    const plain = monumentPriceByn({ pricePerM2: 420, stela });

    for (const kind of ['portrait', 'cross'] as const) {
      expect(monumentPriceByn({ pricePerM2: 420, stela, decoration: kind }), kind).toBe(
        plain + DECORATION_PRICE_BYN[kind]
      );
    }
    // A cross cut from a template is less of the engraver's day than a face.
    expect(DECORATION_PRICE_BYN.cross).toBeLessThan(DECORATION_PRICE_BYN.portrait);
  });

  it('prices no decoration the catalogue no longer sells', () => {
    const stela = { heightCm: 100, widthCm: 50, thicknessCm: 5 };
    const plain = monumentPriceByn({ pricePerM2: 420, stela });

    // The medallion was withdrawn together with the framed niche. A stored row
    // naming one must not quietly add a charge nobody can choose any more.
    expect(monumentPriceByn({ pricePerM2: 420, stela, decoration: 'medallion' })).toBe(plain);
    expect(DECORATION_PRICE_BYN.medallion).toBeUndefined();
  });

  it('charges the cross for its stone and for cutting it', () => {
    const stela = { heightCm: 100, widthCm: 50, thicknessCm: 5 };
    const plain = monumentPriceByn({ pricePerM2: 420, stela });
    const withCross = monumentPriceByn({ pricePerM2: 420, stela, hasCross: true });

    // The finial used to be the one thing a customer could add for nothing.
    expect(withCross).toBeGreaterThan(plain + CROSS_CUTTING_BYN);
    // Its stone is a rounding error next to the work, so the surcharge
    // dominates and the total stays sane.
    expect(withCross).toBeLessThan(plain + CROSS_CUTTING_BYN + 50);
  });

  it('scales the cross with the stela it stands on', () => {
    const narrow = monumentPriceByn({
      pricePerM2: 420,
      stela: { heightCm: 100, widthCm: 50, thicknessCm: 5 },
      hasCross: true
    });
    const wide = monumentPriceByn({
      pricePerM2: 420,
      stela: { heightCm: 100, widthCm: 100, thicknessCm: 5 },
      hasCross: true
    });
    const narrowPlain = monumentPriceByn({
      pricePerM2: 420,
      stela: { heightCm: 100, widthCm: 50, thicknessCm: 5 }
    });
    const widePlain = monumentPriceByn({
      pricePerM2: 420,
      stela: { heightCm: 100, widthCm: 100, thicknessCm: 5 }
    });

    expect(wide - widePlain).toBeGreaterThan(narrow - narrowPlain);
  });

  it('lands a standard single monument near 1200 BYN on the cheapest stone', () => {
    // The anchor the whole table is tuned to: stela 100 x 50 x 5, its base, a
    // full slab and a short inscription, in the least expensive granite.
    const price = monumentPriceByn({
      pricePerM2: 420,
      stela: { heightCm: 100, widthCm: 50, thicknessCm: 5 },
      shape: 'classic',
      finish: 'Matte',
      base: { heightCm: 20, widthCm: 50, depthCm: 15 },
      slab: { variant: 'full', thicknessCm: 5 },
      inscriptionLength: 40
    });

    expect(price).toBeGreaterThan(1000);
    expect(price).toBeLessThan(1400);
  });

  it('survives a stone with no catalogue rate instead of pricing it as NaN', () => {
    const price = monumentPriceByn({
      pricePerM2: Number.NaN,
      stela: { heightCm: 100, widthCm: 50, thicknessCm: 5 },
      shape: 'classic'
    });

    // An incomplete figure the office corrects beats an error mid-order.
    expect(Number.isNaN(price)).toBe(false);
    expect(price).toBeGreaterThan(0);
  });

  it('ignores a shape identifier it does not recognise', () => {
    // Reachable from a bookmark written before the shape list changed.
    const price = monumentPriceByn({
      pricePerM2: 420,
      stela: { heightCm: 100, widthCm: 50, thicknessCm: 5 },
      shape: 'trapezoid' as never
    });

    expect(Number.isNaN(price)).toBe(false);
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
