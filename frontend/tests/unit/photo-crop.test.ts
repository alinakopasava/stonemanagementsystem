import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PORTRAIT_CROP,
  PHOTO_CROP_SCALE_MAX,
  PHOTO_CROP_SCALE_MIN,
  clampPhotoCrop,
  computeCoverDrawRect,
  computeCoverDrawSize,
  getDefaultPhotoCrop,
  getPhotoAspectRatio,
  getPhotoTextureSize,
  type PhotoCrop
} from '@presentation/three/photo-crop';

/**
 * 7.2.5  Fitting an uploaded portrait into the frame engraved on the slab.
 *
 * The frame is fixed; the photograph is not. What matters is that the visible
 * region always stays filled: an empty margin inside the frame would reach the
 * workshop as a defect in the drawing, with no way to tell from the preview
 * alone where it came from.
 */

const CANVAS = { width: 1024, height: 1280 };

const cropFor = (overrides: Partial<PhotoCrop> = {}): PhotoCrop => ({
  centerX: 0.5,
  centerY: 0.5,
  scale: 1,
  ...overrides
});

describe('defaults', () => {
  it('offers a default crop inside the allowed zoom range for both frames', () => {
    for (const aspect of ['portrait', 'square'] as const) {
      const crop = getDefaultPhotoCrop(aspect);

      expect(crop.scale).toBeGreaterThanOrEqual(PHOTO_CROP_SCALE_MIN);
      expect(crop.scale).toBeLessThanOrEqual(PHOTO_CROP_SCALE_MAX);
      expect(crop.centerX).toBeGreaterThan(0);
      expect(crop.centerY).toBeGreaterThan(0);
    }
  });

  it('hands out a copy, so editing one photograph cannot alter the default', () => {
    const crop = getDefaultPhotoCrop('portrait');
    crop.scale = 2.5;

    expect(DEFAULT_PORTRAIT_CROP.scale).not.toBe(2.5);
    expect(getDefaultPhotoCrop('portrait').scale).toBe(DEFAULT_PORTRAIT_CROP.scale);
  });

  it('describes the two frame shapes consistently', () => {
    expect(getPhotoAspectRatio('square')).toBe(1);
    expect(getPhotoAspectRatio('portrait')).toBeLessThan(1);

    const square = getPhotoTextureSize('square');
    const portrait = getPhotoTextureSize('portrait');
    expect(square.width).toBe(square.height);
    expect(portrait.height).toBeGreaterThan(portrait.width);
  });
});

describe('clampPhotoCrop', () => {
  it('holds the zoom to the allowed range at both ends', () => {
    const clampedTo = (scale: number) =>
      clampPhotoCrop(cropFor({ scale }), 1600, 1200, CANVAS.width, CANVAS.height).scale;

    expect(clampedTo(0.4)).toBe(PHOTO_CROP_SCALE_MIN);
    expect(clampedTo(2)).toBe(2);
    expect(clampedTo(12)).toBe(PHOTO_CROP_SCALE_MAX);
  });

  it('leaves no empty margin, whatever the photograph and the requested centre', () => {
    const photographs = [
      [1600, 1200], // landscape
      [1200, 1600], // portrait
      [1400, 1400], // square
      [3000, 800] //   panorama
    ];
    const requested: PhotoCrop[] = [
      cropFor({ centerX: 0, centerY: 0 }),
      cropFor({ centerX: 1, centerY: 1 }),
      cropFor({ centerX: -5, centerY: 9, scale: 2.2 }),
      cropFor({ centerX: 0.5, centerY: 0.5, scale: 3 })
    ];

    for (const [imgW, imgH] of photographs) {
      for (const crop of requested) {
        const clamped = clampPhotoCrop(crop, imgW, imgH, CANVAS.width, CANVAS.height);
        const rect = computeCoverDrawRect(imgW, imgH, CANVAS.width, CANVAS.height, clamped);

        // The drawn image starts at or before the frame and ends at or after it,
        // on both axes: the frame is covered edge to edge.
        expect(rect.drawX).toBeLessThanOrEqual(1e-9);
        expect(rect.drawY).toBeLessThanOrEqual(1e-9);
        expect(rect.drawX + rect.drawW).toBeGreaterThanOrEqual(CANVAS.width - 1e-9);
        expect(rect.drawY + rect.drawH).toBeGreaterThanOrEqual(CANVAS.height - 1e-9);
      }
    }
  });

  it('keeps a centre that was already inside the frame untouched', () => {
    const crop = cropFor({ centerX: 0.5, centerY: 0.5, scale: 2 });

    const clamped = clampPhotoCrop(crop, 1600, 1200, CANVAS.width, CANVAS.height);

    expect(clamped.centerX).toBeCloseTo(0.5, 10);
    expect(clamped.centerY).toBeCloseTo(0.5, 10);
  });
});

describe('computeCoverDrawSize', () => {
  it('matches the frame height for a photograph wider than the frame', () => {
    const { drawW, drawH } = computeCoverDrawSize(1600, 1200, CANVAS.width, CANVAS.height, 1);

    expect(drawH).toBeCloseTo(CANVAS.height, 10);
    expect(drawW).toBeGreaterThan(CANVAS.width);
  });

  it('matches the frame width for a photograph narrower than the frame', () => {
    const { drawW, drawH } = computeCoverDrawSize(600, 1600, CANVAS.width, CANVAS.height, 1);

    expect(drawW).toBeCloseTo(CANVAS.width, 10);
    expect(drawH).toBeGreaterThan(CANVAS.height);
  });

  it('scales both sides by the zoom, keeping the proportions of the original', () => {
    const base = computeCoverDrawSize(1600, 1200, CANVAS.width, CANVAS.height, 1);
    const zoomed = computeCoverDrawSize(1600, 1200, CANVAS.width, CANVAS.height, 2.5);

    expect(zoomed.drawW / base.drawW).toBeCloseTo(2.5, 10);
    expect(zoomed.drawH / base.drawH).toBeCloseTo(2.5, 10);
    expect(zoomed.drawW / zoomed.drawH).toBeCloseTo(base.drawW / base.drawH, 10);
  });
});
