import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  computeCoverDrawRect,
  getDefaultPhotoCrop,
  getPhotoTextureSize,
  type PhotoCrop
} from './photo-crop';

export type { PhotoCrop } from './photo-crop';
export { DEFAULT_PORTRAIT_CROP, getDefaultPhotoCrop } from './photo-crop';

/** Target aspect for the on-stone photo. */
export type PhotoAspect = 'portrait';

/** Left/right dissolve into the stone: no oval, circle, blob, or hard rectangle. */
export type PhotoEdgeFade = 'sides';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Deterministic 0..1 hash for subtle per-pixel edge breakup. */
const hash2 = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Portrait melts into the stone. No box, oval, or blob outline — warped metric +
 *  dither so the falloff cannot be traced as a shape. Core (the person) stays opaque. */
const sideDissolveMask = (x: number, y: number, w: number, h: number) => {
  const u = x / w;
  const v = y / h;
  const nx = (u - 0.5) * 2;
  const ny = (v - 0.5) * 2;

  const n1 = hash2(x * 0.027, y * 0.031);
  const n2 = hash2(x * 0.071 + 4.2, y * 0.063 + 1.8);
  const n3 = hash2(x * 0.16 + 2.6, y * 0.14 + 7.3);
  const n4 = hash2(x * 0.38 + 9.1, y * 0.41 + 3.4);
  const n5 = hash2(x * 0.85 + 1.1, y * 0.77 + 5.9);
  const fbm =
    (n1 - 0.5) * 0.34 + (n2 - 0.5) * 0.2 + (n3 - 0.5) * 0.12 + (n4 - 0.5) * 0.06;

  const wx =
    nx +
    0.3 * Math.sin(ny * Math.PI * 1.32 + n1 * 7) +
    0.15 * Math.sin(ny * Math.PI * 3.8 + n2 * 4.2) +
    0.08 * Math.sin((nx + ny) * Math.PI * 5.05 + n3 * 3) +
    fbm * 0.6;
  const wy =
    ny +
    0.26 * Math.sin(nx * Math.PI * 1.12 + n2 * 6.1) +
    0.13 * Math.sin(nx * Math.PI * 4.35 + n3 * 3.8) +
    0.07 * Math.sin((ny - nx) * Math.PI * 4.55 + n1 * 2.4) +
    fbm * 0.48;

  const d =
    Math.pow(Math.abs(wx), 1.32) * 0.58 +
    Math.pow(Math.abs(wy), 1.62) * 0.42 +
    fbm * 0.24;

  const inner = 0.58 + fbm * 0.22;
  const outer = 0.86 + fbm * 0.16;
  let a = 1 - smoothstep(inner, Math.max(inner + 0.12, outer), d);

  const band = smoothstep(inner - 0.06, outer + 0.08, d);
  a *= 1 - band * n5 * 0.62;

  const corner = Math.abs(nx) * Math.abs(ny);
  a *= 1 - smoothstep(0.18, 0.52, corner + fbm * 0.18);

  const rim = Math.max(Math.abs(nx), Math.abs(ny));
  a *= smoothstep(0.99, 0.84, rim + fbm * 0.05);

  if (a > 0.42) a = 0.42 + (a - 0.42) * 1.55;
  return clamp(a, 0, 1);
};

/** `transparent` tells a cutout from a full-frame photo; `partial` tells whether the
 *  matte already carries a soft edge (pre-feathered PNG) or a crisp one. */
const alphaProfile = (data: Uint8ClampedArray) => {
  let transparent = 0;
  let partial = 0;
  const pixels = data.length / 4;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < 12) transparent += 1;
    else if (a < 248) partial += 1;
  }
  return { transparent: transparent / pixels, partial: partial / pixels };
};

const blurAlpha = (alpha: Uint8Array, w: number, h: number, radius: number) => {
  const dim = radius * 2 + 1;
  const horiz = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    let sum = 0;
    const row = y * w;
    for (let k = -radius; k <= radius; k += 1) {
      sum += alpha[row + clamp(k, 0, w - 1)];
    }
    for (let x = 0; x < w; x += 1) {
      horiz[row + x] = Math.round(sum / dim);
      sum +=
        alpha[row + clamp(x + radius + 1, 0, w - 1)] -
        alpha[row + clamp(x - radius, 0, w - 1)];
    }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x += 1) {
    let sum = 0;
    for (let k = -radius; k <= radius; k += 1) {
      sum += horiz[clamp(k, 0, h - 1) * w + x];
    }
    for (let y = 0; y < h; y += 1) {
      out[y * w + x] = Math.round(sum / dim);
      sum +=
        horiz[clamp(y + radius + 1, 0, h - 1) * w + x] -
        horiz[clamp(y - radius, 0, h - 1) * w + x];
    }
  }
  return out;
};

/** Wherever the subject runs past the crop, this bleeds it out instead of leaving a
 *  straight cut. It only bites in the last few percent, so it draws no frame of its own. */
const borderVanish = (x: number, y: number, w: number, h: number) => {
  const band = 0.09;
  return Math.min(
    smoothstep(0, band, x / w),
    smoothstep(0, band, 1 - x / w),
    smoothstep(0, band, y / h),
    smoothstep(0, band, 1 - y / h)
  );
};

/** Soften only the person silhouette — no rectangle, oval, or blob frame. */
const featherSilhouette = (imageData: ImageData, radius = 18) => {
  const { data, width, height } = imageData;
  const alpha = new Uint8Array(width * height);
  for (let p = 0, i = 3; i < data.length; p += 1, i += 4) {
    alpha[p] = data[i];
  }
  const soft = blurAlpha(alpha, width, height, radius);
  for (let p = 0, i = 3; i < data.length; p += 1, i += 4) {
    if (alpha[p] < 2) {
      data[i] = 0;
      continue;
    }
    const edge = borderVanish(p % width, (p / width) | 0, width, height);
    data[i] = Math.round(Math.min(alpha[p], soft[p]) * edge);
  }
};

const applyEdgeFade = (
  imageData: ImageData,
  width: number,
  height: number,
) => {
  const { transparent, partial } = alphaProfile(imageData.data);
  if (transparent > 0.04) {
    // A pre-feathered matte only needs the hard-pixel safety pass; feathering it
    // again with the full radius would eat into the person.
    featherSilhouette(imageData, partial > 0.05 ? 5 : 18);
    return;
  }

  const data = imageData.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4 + 3;
      data[idx] = Math.round(data[idx] * sideDissolveMask(x, y, width, height));
    }
  }
};

/** Sparse chroma check: true when the image is already monochrome (R≈G≈B almost
 *  everywhere), so a colour→grey pass would only reproduce it. */
const isAlreadyGrayscale = (data: Uint8ClampedArray) => {
  let colored = 0;
  let counted = 0;
  // Step over ~every 37th pixel — enough to classify without scanning all of them.
  for (let i = 0; i < data.length; i += 4 * 37) {
    if (data[i + 3] < 8) continue;
    counted += 1;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (Math.abs(r - g) > 14 || Math.abs(g - b) > 14 || Math.abs(r - b) > 14) {
      colored += 1;
    }
  }
  return counted === 0 || colored / counted < 0.02;
};

/** Tone curve for the colour→B&W conversion: a plain luma read is flat and washed,
 *  so we push contrast around a mid pivot to get the deep-shadow, bright-highlight
 *  monochrome of a proper black-and-white portrait. Precomputed as a 256-entry LUT. */
const BW_CONTRAST = 1.42;
const BW_PIVOT = 0.46;
const BW_TONE_LUT = (() => {
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v += 1) {
    const t = (v / 255 - BW_PIVOT) * BW_CONTRAST + BW_PIVOT;
    lut[v] = Math.round(Math.max(0, Math.min(1, t)) * 255);
  }
  return lut;
})();

/** Normalise every portrait to the same greyscale: a colour photo is converted to
 *  Rec.601 luma and pushed through the B&W tone curve so it reads as one consistent,
 *  contrasty monochrome; a photo that is already grey is left untouched, preserving
 *  the customer's own black-and-white. */
const applyGrayscale = (imageData: ImageData) => {
  const data = imageData.data;
  if (isAlreadyGrayscale(data)) return;
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const y = BW_TONE_LUT[luma & 255];
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
};

/**
 * Pre-processes a portrait image so its texture already carries:
 *  – a centred cover-crop to the target aspect (no need for shader-side `repeat`/`offset`),
 *  – a silhouette fade when the source is a cutout (gravestone portrait, no frame),
 *    otherwise a shapeless dissolve for full-frame photos,
 *  – an RGBA backing surface (so even JPG sources get a working alpha channel).
 */
function buildVignettedTexture(
  img: HTMLImageElement,
  aspect: PhotoAspect,
  crop: PhotoCrop
): THREE.CanvasTexture {
  const { width: W, height: H } = getPhotoTextureSize(aspect);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, W, H);
    const { drawX, drawY, drawW, drawH } = computeCoverDrawRect(
      img.width,
      img.height,
      W,
      H,
      crop
    );
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const imageData = ctx.getImageData(0, 0, W, H);
    applyGrayscale(imageData);
    applyEdgeFade(imageData, W, H);
    ctx.putImageData(imageData, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Loads a user-provided portrait photo (data URL or http URL) into a `THREE.Texture` with
 * a canvas-applied soft vignette and pre-baked aspect crop. Returns `null` while loading
 * or when no URL is provided. Disposes its own texture on change.
 */
export function usePhotoTexture(
  photoUrl: string | undefined,
  aspect: PhotoAspect = 'portrait',
  photoCrop?: PhotoCrop
): THREE.Texture | null {
  const crop = photoCrop ?? getDefaultPhotoCrop(aspect);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const ownedTextureRef = useRef<THREE.Texture | null>(null);

  const disposeOwned = () => {
    ownedTextureRef.current?.dispose();
    ownedTextureRef.current = null;
  };

  useEffect(() => {
    const url = photoUrl?.trim();
    if (!url) {
      disposeOwned();
      setTexture(null);
      return;
    }

    let cancelled = false;
    const img = new Image();
    const isDataUrl = url.startsWith('data:');
    if (!isDataUrl) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (cancelled) return;
      try {
        const tex = buildVignettedTexture(img, aspect, crop);
        disposeOwned();
        ownedTextureRef.current = tex;
        setTexture(tex);
      } catch {
        disposeOwned();
        setTexture(null);
      }
    };
    img.onerror = () => {
      if (cancelled) return;
      disposeOwned();
      setTexture(null);
    };
    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [photoUrl, aspect, crop.centerX, crop.centerY, crop.scale]);

  useEffect(
    () => () => {
      disposeOwned();
    },
    []
  );

  return texture;
}
