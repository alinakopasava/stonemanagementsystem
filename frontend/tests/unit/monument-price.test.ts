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

  it.each([
    ['empty', ''],
    ['null', null],
    ['undefined', undefined],
    ['no separator', '10060'],
    ['not numeric', 'abcxdef'],
    ['zero', '0x60'],
    ['negative', '-10x60']
  ])('returns null for %s input', (_label, raw) => {
    expect(parseDimensionPair(raw as string)).toBeNull();
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
    const price = monumentPriceByn(333.333, { heightCm: 100, widthCm: 60 }, 'classic');
    expect(price).toBe(Math.round(price * 100) / 100);
    expect(String(price).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });

  it('grows with the stone rate and with the area', () => {
    const cheap = monumentPriceByn(420, { heightCm: 100, widthCm: 60 }, 'classic');
    const dearStone = monumentPriceByn(900, { heightCm: 100, widthCm: 60 }, 'classic');
    const biggerSlab = monumentPriceByn(420, { heightCm: 120, widthCm: 70 }, 'classic');

    expect(dearStone).toBeGreaterThan(cheap);
    expect(biggerSlab).toBeGreaterThan(cheap);
  });

  it('prices every shape in the catalogue', () => {
    for (const shape of Object.keys(SHAPE_BASE_PRICE_BYN)) {
      const price = monumentPriceByn(420, { heightCm: 100, widthCm: 60 }, shape as never);
      expect(Number.isFinite(price)).toBe(true);
      expect(price).toBeGreaterThan(0);
    }
  });
});

describe('selectable shapes', () => {
  it('is the single list the catalogue and the configurator share', () => {
    expect(SELECTABLE_MONUMENT_SHAPES).toEqual(['classic', 'rounded', 'stele']);
  });

  it('has a base price for every selectable shape', () => {
    for (const shape of SELECTABLE_MONUMENT_SHAPES) {
      expect(SHAPE_BASE_PRICE_BYN[shape]).toBeGreaterThan(0);
    }
  });

  it.each([...SELECTABLE_MONUMENT_SHAPES])('recognises %s as selectable', (shape) => {
    expect(isSelectableMonumentShape(shape)).toBe(true);
  });

  it.each(['gothic', 'heart', 'cross', 'nonsense', '', null, undefined, 42])(
    'rejects %s as a selectable shape',
    (value) => {
      expect(isSelectableMonumentShape(value)).toBe(false);
    }
  );
});
