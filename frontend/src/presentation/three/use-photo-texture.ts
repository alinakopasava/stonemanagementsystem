import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/** Target aspect for the on-stone photo: square for medallions/discs, taller portrait
 *  rectangle for niche-style frames. */
export type PhotoAspect = 'square' | 'portrait';

const ASPECT_RATIOS: Record<PhotoAspect, number> = {
  square: 1,
  /** Matches the 1 : 1.25 niche/plaque geometry in `monument-model.tsx`. */
  portrait: 1 / 1.25,
};

/**
 * Pre-processes a portrait image so its texture already carries:
 *  – a centred cover-crop to the target aspect (no need for shader-side `repeat`/`offset`),
 *  – a soft circular/oval vignette in the alpha channel (no hard rectangle border when the
 *    texture is laid onto a flat plane in 3D),
 *  – an RGBA backing surface (so even JPG sources get a working alpha channel).
 *
 * The vignette lives on the canvas instead of in a custom GLSL shader because the
 * shader-side approach required a custom UV varying that, depending on the three.js
 * version, could fail to compile silently and make the photo disappear entirely. A canvas
 * mask is robust across renderer versions.
 */
function buildVignettedTexture(img: HTMLImageElement, aspect: PhotoAspect): THREE.CanvasTexture {
  /** Power-of-two width keeps GPU sampling cheap while preserving facial detail; height
   *  derives from the chosen aspect so the canvas already matches the 3D plane shape. */
  const W = 1024;
  const H = Math.round(W / ASPECT_RATIOS[aspect]);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    /** Cover-fit: scale the photo so it fills the target rectangle, cropping the longer
     *  axis symmetrically. Faces are biased slightly upward (factor < 0.5 means more is
     *  cropped from the bottom than from the top) so subjects stay centred in frame. */
    const srcAspect = img.width / img.height;
    const dstAspect = W / H;
    let drawW: number;
    let drawH: number;
    if (srcAspect > dstAspect) {
      drawH = H;
      drawW = drawH * srcAspect;
    } else {
      drawW = W;
      drawH = drawW / srcAspect;
    }
    const dx = (W - drawW) / 2;
    const dy = (H - drawH) * 0.35;
    ctx.drawImage(img, dx, dy, drawW, drawH);

    /** Soft elliptical vignette punched into the alpha channel — fades the outer ~20 % of
     *  the rectangle to fully transparent so the photo blends into the stone without a
     *  visible boundary. We draw an ellipse-shaped radial gradient by stretching the
     *  coordinate system before painting. */
    const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.min(W, H) * 0.55);
    grad.addColorStop(0.0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.7, 'rgba(0,0,0,1)');
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    /** Stretch the radial gradient to match canvas aspect — produces an ellipse rather
     *  than a circle when H ≠ W, so the vignette tracks the rectangle's edge uniformly. */
    ctx.translate(W / 2, H / 2);
    ctx.scale(1, H / W);
    ctx.translate(-W / 2, -H / 2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
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
  aspect: PhotoAspect = 'portrait'
): THREE.Texture | null {
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
    /** Allow data URLs (no CORS) and remote URLs (best-effort). */
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const tex = buildVignettedTexture(img, aspect);
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
  }, [photoUrl, aspect]);

  useEffect(
    () => () => {
      disposeOwned();
    },
    []
  );

  return texture;
}
