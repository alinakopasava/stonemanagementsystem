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

    /** Soft elliptical vignette punched into the alpha channel so the photo fades into the
     *  stone with no visible rectangular boundary.
     *
     *  Worked in NORMALISED space: we scale the context by (W/2, H/2) so a unit circle maps
     *  exactly onto the ellipse that touches all four edge midpoints. A radial gradient with
     *  outer radius 1.0 therefore reaches the left/right AND top/bottom edges regardless of
     *  aspect ratio — the previous `min(W,H)` radius left the long-axis sides opaque, which
     *  is what produced the hard vertical border on tall portraits. */
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.translate(W / 2, H / 2);
    ctx.scale(W / 2, H / 2);
    const grad = ctx.createRadialGradient(0, 0, 0.45, 0, 0, 1.0);
    grad.addColorStop(0.0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.5, 'rgba(0,0,0,1)');
    grad.addColorStop(0.78, 'rgba(0,0,0,0.45)');
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(-1, -1, 2, 2);
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
    /** crossOrigin must NOT be set for data: URLs — Chrome/Edge treat the combination as
     *  invalid and silently fail to load the image (no onload, no onerror, just nothing).
     *  Only opt-in to CORS for genuinely remote http(s) URLs where the canvas would
     *  otherwise be tainted. */
    const isDataUrl = url.startsWith('data:');
    if (!isDataUrl) {
      img.crossOrigin = 'anonymous';
    }
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
