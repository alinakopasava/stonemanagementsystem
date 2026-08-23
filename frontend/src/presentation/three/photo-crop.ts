import type { PhotoAspect } from './use-photo-texture';

export interface PhotoCrop {
  /** Horizontal centre of the visible region in the source image (0–1). */
  centerX: number;
  /** Vertical centre of the visible region in the source image (0–1). */
  centerY: number;
  /** Zoom relative to minimum cover fit (1 = cover, >1 = zoom in). */
  scale: number;
}

/** Pre-cut sample portrait (person only, soft matte) used by the catalog previews.
 *  Rebuild with `python scripts/build-portrait-cutout.py` after replacing the source. */
export const SAMPLE_PORTRAIT_URL = '/images/portrait-sample-cutout.png';

/** Tuned default for catalog / new uploads — face-forward portrait crop. */
export const DEFAULT_PORTRAIT_CROP: PhotoCrop = {
  centerX: 0.55,
  centerY: 0.34,
  scale: 1.8
};

export const DEFAULT_SQUARE_CROP: PhotoCrop = {
  centerX: 0.5,
  centerY: 0.38,
  scale: 1.25
};

export const getDefaultPhotoCrop = (aspect: PhotoAspect): PhotoCrop =>
  aspect === 'square' ? { ...DEFAULT_SQUARE_CROP } : { ...DEFAULT_PORTRAIT_CROP };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const PHOTO_CROP_SCALE_MIN = 1;
export const PHOTO_CROP_SCALE_MAX = 3;

const ASPECT_RATIOS: Record<PhotoAspect, number> = {
  square: 1,
  portrait: 1 / 1.25
};

export const getPhotoAspectRatio = (aspect: PhotoAspect) => ASPECT_RATIOS[aspect];

export const getPhotoTextureSize = (aspect: PhotoAspect) => {
  const width = 1024;
  return { width, height: Math.round(width / ASPECT_RATIOS[aspect]) };
};

/** Base cover-crop draw size before applying user zoom. */
export const computeCoverDrawSize = (
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
  scale: number
) => {
  const srcAspect = imgW / imgH;
  const dstAspect = canvasW / canvasH;
  let drawW: number;
  let drawH: number;
  if (srcAspect > dstAspect) {
    drawH = canvasH;
    drawW = drawH * srcAspect;
  } else {
    drawW = canvasW;
    drawH = drawW / srcAspect;
  }
  drawW *= scale;
  drawH *= scale;
  return { drawW, drawH };
};

export const computeCoverDrawRect = (
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
  crop: PhotoCrop
) => {
  const { drawW, drawH } = computeCoverDrawSize(imgW, imgH, canvasW, canvasH, crop.scale);
  return {
    drawW,
    drawH,
    drawX: canvasW / 2 - crop.centerX * drawW,
    drawY: canvasH / 2 - crop.centerY * drawH
  };
};

/** Keeps the crop window filled — no empty margins inside the monument frame. */
export const clampPhotoCrop = (
  crop: PhotoCrop,
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number
): PhotoCrop => {
  const scale = clamp(crop.scale, PHOTO_CROP_SCALE_MIN, PHOTO_CROP_SCALE_MAX);
  const { drawW, drawH } = computeCoverDrawSize(imgW, imgH, canvasW, canvasH, scale);
  const minCenterX = canvasW / (2 * drawW);
  const maxCenterX = 1 - minCenterX;
  const minCenterY = canvasH / (2 * drawH);
  const maxCenterY = 1 - minCenterY;
  return {
    scale,
    centerX: clamp(crop.centerX, minCenterX, maxCenterX),
    centerY: clamp(crop.centerY, minCenterY, maxCenterY)
  };
};
