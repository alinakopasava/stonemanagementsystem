import { Suspense, useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import type { FinishType } from '@domain/entities/order-card';
import { useStoneAlbedoTexture } from './use-stone-albedo-texture';
import { usePhotoTexture } from './use-photo-texture';
import { createHeadstoneExtrudeGeometry } from './headstone-extrude-geometry';

export interface MonumentDimensionsCm {
  heightCm: number;
  widthCm: number;
  thicknessCm: number;
}

export interface BaseDimensionsCm {
  heightCm: number;
  widthCm: number;
  depthCm: number;
}

export interface InscriptionStyleHints {
  fontUrl?: string;
  letterSpacing: number;
  transform: 'none' | 'uppercase';
}

export type MonumentShape =
  | 'classic'
  | 'rounded'
  | 'cross'
  | 'gothic'
  | 'heart'
  | 'stele'
  | 'concave'
  | 'asymmetric'
  | 'wave-steep'
  | 'dome'
  | 'arc';

export type MonumentDecoration = 'none' | 'portrait' | 'medallion' | 'cross';

export type NicheStyle = 'recessed' | 'framed';

/** Tombstone slab variant: none, half (front cover only) or full (covers the whole grave). */
export type TombstoneSlabVariant = 'none' | 'half' | 'full';

/** Single stela or a double monument (two stelas side by side on a shared base). */
export type MonumentLayout = 'single' | 'double';

const DEFAULT_INSCRIPTION_STYLE: InscriptionStyleHints = {
  letterSpacing: 0,
  transform: 'none'
};

interface MonumentModelProps {
  textureUrl?: string;
  materialName?: string;
  finish: FinishType;
  dimensions: MonumentDimensionsCm;
  /** Custom base (pedestal) dimensions. When missing, derived from the headstone. */
  baseDimensions?: BaseDimensionsCm;
  inscription: string;
  name?: string;
  dates?: string;
  inscriptionStyle?: InscriptionStyleHints;
  shape?: MonumentShape;
  showCross?: boolean;
  /** Цветник — small flower planter sitting in front of the base. */
  showFlowerbed?: boolean;
  /** Плита надгробная — none, half (front cover) or full (whole grave). */
  tombstoneSlab?: TombstoneSlabVariant;
  /** Slab thickness preset, typically 5 or 8 cm. */
  slabThicknessCm?: number;
  /** Decoration on the headstone face: portrait/medallion plate or engraved cross. */
  decoration?: MonumentDecoration;
  /** Visual treatment for portrait/medallion: recessed niche or raised frame. */
  nicheStyle?: NicheStyle;
  /** Optional portrait photo (data URL) shown inside the portrait/medallion niche. */
  photoUrl?: string;
  /** Single stela (default) or a double monument with two stelas side by side. */
  layout?: MonumentLayout;
  /** Text on the right-hand stela when layout='double'. Ignored otherwise. */
  secondaryInscription?: string;
  secondaryName?: string;
  secondaryDates?: string;
  /** Spacing between the two stelas in cm. Used only when layout='double'. */
  doubleGapCm?: number;
}

const CM_TO_M = 0.01;
const TEXT_LINE_HEIGHT = 1.15;

const getTextureBitmapSize = (map: THREE.Texture): { w: number; h: number } => {
  const img = map.image as any;
  if (!img) return { w: 1, h: 1 };
  const w = img.naturalWidth || img.videoWidth || img.width || 0;
  const h = img.naturalHeight || img.videoHeight || img.height || 0;
  return w > 0 && h > 0 ? { w, h } : { w: 1, h: 1 };
};

/** Materiały, dla których chcemy jednolitą teksturę bez kafelków (jeden „kawałek” na cały pomnik). */
const SEAMLESS_MATERIALS = new Set(['Marble', 'Labradorite Blue']);

/**
 * Granit / piaskowiec: powtarzalna tekstura imitująca gęsto ziarnisty kamień.
 * Marmur / labradoryt: jedna instancja tekstury rozciągnięta na powierzchnię — brak widocznych kafelków.
 */
const applyAlbedoTextureTiling = (
  map: THREE.Texture,
  spanM: number,
  materialName: string | undefined
) => {
  if (materialName && SEAMLESS_MATERIALS.has(materialName)) {
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    map.repeat.set(1, 1);
    map.center.set(0.5, 0.5);
    map.offset.set(0, 0);
    map.needsUpdate = true;
    return;
  }

  const base = THREE.MathUtils.clamp(1.8 / Math.max(0.35, spanM), 0.65, 3.2);
  const { w, h } = getTextureBitmapSize(map);
  const ratio = h / w;

  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(base, base * ratio);
  map.center.set(0.5, 0.5);
  map.offset.set(0, 0);
  map.needsUpdate = true;
};

/** Słowo nie łamane przez troika-three-text — liczymy linie po granicach wyrazów (a nie zaokrąglając total/charsPerLine),
 *  inaczej "John A. Smith" mieści się rzekomo w 2 liniach, a faktycznie wpada w 3 (każde słowo osobno). */
const wordAwareLineCount = (value: string, charsPerLine: number) => {
  const normalizedLimit = Math.max(1, Math.floor(charsPerLine));
  let total = 0;
  for (const rawLine of value.split('\n')) {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let lines = 1;
    let used = 0;
    for (const word of words) {
      const need = used === 0 ? word.length : used + 1 + word.length;
      if (need <= normalizedLimit) {
        used = need;
      } else {
        lines += 1;
        used = word.length;
      }
    }
    total += lines;
  }
  return Math.max(0, total);
};

const finishToSurface = (finish: FinishType) => {
  switch (finish) {
    case 'Polished':
      // Near-mirror polish: very low roughness, high clearcoat → crisp edge highlights on bevels
      return { roughness: 0.04, metalness: 0.42, clearcoat: 1.0, clearcoatRoughness: 0.04 };
    case 'Honed':
      // Satin/brushed: visible directionality, muted sheen
      return { roughness: 0.38, metalness: 0.14, clearcoat: 0.22, clearcoatRoughness: 0.28 };
    case 'Matte':
    default:
      return { roughness: 0.88, metalness: 0.04, clearcoat: 0, clearcoatRoughness: 0 };
  }
};

// --- Buildery kształtów ---
const buildClassicShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const halfWidth = widthM / 2;
  const shoulderInset = Math.max(0.03, widthM * 0.14);
  const neckInset = Math.max(0.05, widthM * 0.22);
  const bodyHeight = Math.max(0.06, heightM - widthM * 0.48);
  const shoulderY = bodyHeight * 0.74;
  const neckY = bodyHeight * 0.9;
  const crownY = heightM;
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth - shoulderInset, shoulderY);
  shape.lineTo(halfWidth - neckInset, neckY);
  shape.quadraticCurveTo(0, crownY, -(halfWidth - neckInset), neckY);
  shape.lineTo(-(halfWidth - shoulderInset), shoulderY);
  shape.lineTo(-halfWidth, 0);
  return shape;
};

const buildRoundedShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const halfWidth = widthM / 2;
  const bodyHeight = Math.max(0.05, heightM - halfWidth);
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, bodyHeight);
  shape.absarc(0, bodyHeight, halfWidth, 0, Math.PI, false);
  shape.lineTo(-halfWidth, 0);
  return shape;
};

const buildGothicShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const halfWidth = widthM / 2;
  const bodyHeight = Math.max(0.05, heightM - widthM * 0.55);
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, bodyHeight);
  shape.quadraticCurveTo(halfWidth, heightM, 0, heightM);
  shape.quadraticCurveTo(-halfWidth, heightM, -halfWidth, bodyHeight);
  shape.lineTo(-halfWidth, 0);
  return shape;
};

const buildHeartShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const halfWidth = widthM / 2;
  const bodyHeight = Math.max(0.05, heightM - widthM * 0.6);
  const heartTop = heightM * 0.92;
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, bodyHeight);
  shape.bezierCurveTo(halfWidth, heartTop, halfWidth * 0.55, heartTop * 1.04, 0, bodyHeight + (heartTop - bodyHeight) * 0.55);
  shape.bezierCurveTo(-halfWidth * 0.55, heartTop * 1.04, -halfWidth, heartTop, -halfWidth, bodyHeight);
  shape.lineTo(-halfWidth, 0);
  return shape;
};

const buildCrossShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const halfWidth = widthM / 2;
  const bodyHeight = Math.max(0.05, heightM * 0.62);
  const armHeight = heightM * 0.12;
  const armY = heightM * 0.78;
  const armWidth = widthM * 0.55;
  const stemWidth = widthM * 0.22;
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, bodyHeight);
  shape.lineTo(stemWidth, bodyHeight);
  shape.lineTo(stemWidth, armY);
  shape.lineTo(armWidth, armY);
  shape.lineTo(armWidth, armY + armHeight);
  shape.lineTo(stemWidth, armY + armHeight);
  shape.lineTo(stemWidth, heightM);
  shape.lineTo(-stemWidth, heightM);
  shape.lineTo(-stemWidth, armY + armHeight);
  shape.lineTo(-armWidth, armY + armHeight);
  shape.lineTo(-armWidth, armY);
  shape.lineTo(-stemWidth, armY);
  shape.lineTo(-stemWidth, bodyHeight);
  shape.lineTo(-halfWidth, bodyHeight);
  shape.lineTo(-halfWidth, 0);
  return shape;
};

/** Modern minimalist stele — nearly straight sides with a small diagonal chamfer on the top corners,
 *  and a very slight taper (top is ~5 % narrower than the base). */
const buildSteleShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const hw = widthM / 2;
  const chamfer = Math.min(0.05, widthM * 0.07);
  const taper = widthM * 0.03;
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw - taper, heightM - chamfer);
  shape.lineTo(hw - taper - chamfer, heightM);
  shape.lineTo(-(hw - taper - chamfer), heightM);
  shape.lineTo(-(hw - taper), heightM - chamfer);
  shape.lineTo(-hw, 0);
  return shape;
};

/** Concave "wave" stele — both sides curve inward (concave) to form a dramatic waist at ~42 % of
 *  the height, then flare back out to broad shoulders with a semicircular crown.
 *  Common in Polish / Eastern-European memorial catalogs. */
const buildConcaveShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const hw = widthM / 2;
  const waist = widthM * 0.17;
  const wy = heightM * 0.42;
  const si = widthM * 0.04;
  const bh = Math.max(0.05, heightM - (hw - si));
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.bezierCurveTo(hw, heightM * 0.14, hw - waist * 0.4, wy * 0.65, hw - waist, wy);
  shape.bezierCurveTo(hw - waist, wy + heightM * 0.13, hw - si, bh * 0.88, hw - si, bh);
  shape.absarc(0, bh, hw - si, 0, Math.PI, false);
  shape.bezierCurveTo(-(hw - si), bh * 0.88, -(hw - waist), wy + heightM * 0.13, -(hw - waist), wy);
  shape.bezierCurveTo(-(hw - waist * 0.4), wy * 0.65, -hw, heightM * 0.14, -hw, 0);
  return shape;
};

/** Asymmetric wave-top stele — specific Russian / Polish catalogue silhouette (tuned
 *  interactively in the SVG editor and confirmed by the user).
 *
 *  Profile:
 *  – sides flare outward going up: base is inset by 16.5 % per side, top is full width,
 *  – left edge tops out at  91   % H,
 *  – right edge tops out at 83.5 % H,
 *  – top wave is a single cubic Bezier with control points producing a soft apex slightly
 *    left of centre (cp2 sits ABOVE heightM at 103 %).
 *
 *  All percentages live in the standard `widthM` × `heightM` frame the other builders use,
 *  so the rest of the model (base / pedestal / slab / decoration) works unchanged. */
const buildAsymmetricShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const hw = widthM / 2;

  const BOTTOM_TAPER = 0.165;
  const taperInset = widthM * BOTTOM_TAPER;

  const leftTopY = heightM * 0.91;
  const rightTopY = heightM * 0.835;

  /** Bezier control points expressed in the same centred frame.
   *  cp1 sits near the RIGHT edge (curve leaves right top point toward this point).
   *  cp2 sits near the LEFT edge (curve arrives at left top point from this point).
   *  Editor values are % of widthM from the LEFT side; we map them by subtracting hw. */
  const cp1x = -hw + widthM * 0.68;
  const cp1y = heightM * 0.825;
  const cp2x = -hw + widthM * 0.52;
  const cp2y = heightM * 1.03;

  shape.moveTo(-hw + taperInset, 0);
  shape.lineTo(hw - taperInset, 0);
  shape.lineTo(hw, rightTopY);
  shape.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, -hw, leftTopY);
  shape.lineTo(-hw + taperInset, 0);

  return shape;
};

/** Dome-top stele — gentle peaked silhouette tuned interactively in the SVG editor.
 *
 *  Profile (3 anchors → 2 cubic Bezier segments stitched at the central anchor):
 *  – left edge tops out at 79.43 % H, right at 79.95 % H (near-symmetric),
 *  – central anchor sits at (x = 51.80 %, y = 88.43 % H) — peak slightly left of centre,
 *  – control handles produce a soft, low arch (the rise from edge to apex is only ~ 9 % H).
 *
 *  Sides are straight vertical (no taper). All percentages live in the standard widthM/heightM
 *  reference frame — `pct(x)` converts editor "% from the LEFT" to the model's centred frame. */
const buildDomeShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const hw = widthM / 2;
  const px = (pct: number) => (pct / 100 - 0.5) * widthM;
  const py = (pct: number) => (pct / 100) * heightM;

  shape.moveTo(-hw, 0);
  shape.lineTo(+hw, 0);
  shape.lineTo(+hw, py(79.95));

  /** Right segment: from the right edge anchor #0 → central anchor #1.
   *  hOut #0 = (70.25, 83.93), hIn #1 = (71.60, 88.61), anchor #1 = (51.80, 88.43). */
  shape.bezierCurveTo(
    px(70.25), py(83.93),
    px(71.60), py(88.61),
    px(51.80), py(88.43)
  );

  /** Left segment: from central anchor #1 → left edge anchor #2.
   *  hOut #1 = (32.00, 88.26), hIn #2 = (33.80, 84.97), anchor #2 = (0, 79.43). */
  shape.bezierCurveTo(
    px(32.00), py(88.26),
    px(33.80), py(84.97),
    -hw,       py(79.43)
  );

  shape.lineTo(-hw, 0);
  return shape;
};

/** Arc-top stele — single soft asymmetric arch tuned interactively in the SVG editor.
 *
 *  Profile (2 anchors → single cubic Bezier segment):
 *  – left edge tops out at  79.26 % H, right at 79.95 % H — nearly equal,
 *  – control hOut at the right anchor points slightly below it (64.85, 77.13) — tangent
 *    eases the curve out almost horizontally,
 *  – control hIn at the left anchor sits high above it (36.05, 94.78), pulling the apex up.
 *
 *  Net effect: a low, soft arch with its apex ≈ 86 % H shifted to ≈ −0.35 · hw (left of
 *  centre). Straight vertical sides, no taper. */
const buildArcShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const hw = widthM / 2;
  const px = (pct: number) => (pct / 100 - 0.5) * widthM;
  const py = (pct: number) => (pct / 100) * heightM;

  shape.moveTo(-hw, 0);
  shape.lineTo(+hw, 0);
  shape.lineTo(+hw, py(79.95));
  shape.bezierCurveTo(
    px(64.85), py(77.13),
    px(36.05), py(94.78),
    -hw,       py(79.26)
  );
  shape.lineTo(-hw, 0);
  return shape;
};

/** Steep-wave stele — generic asymmetric silhouette, straight vertical sides (no taper),
 *  single cubic Bezier across the top with a noticeable height difference between the two
 *  edges (96 % vs 78 %). Control points push past full height to produce a wave-like apex
 *  above the upper left portion of the face. */
const buildWaveSteepShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const hw = widthM / 2;
  const leftTopY = heightM * 0.96;
  const rightTopY = heightM * 0.78;
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, rightTopY);
  shape.bezierCurveTo(
    hw * 0.55, heightM * 1.0,
    -hw * 0.25, heightM * 1.05,
    -hw, leftTopY
  );
  shape.lineTo(-hw, 0);
  return shape;
};

const buildShape = (kind: MonumentShape, widthM: number, heightM: number) => {
  switch (kind) {
    case 'rounded': return buildRoundedShape(widthM, heightM);
    case 'gothic': return buildGothicShape(widthM, heightM);
    case 'heart': return buildHeartShape(widthM, heightM);
    case 'stele': return buildSteleShape(widthM, heightM);
    case 'concave': return buildConcaveShape(widthM, heightM);
    case 'asymmetric': return buildAsymmetricShape(widthM, heightM);
    case 'wave-steep': return buildWaveSteepShape(widthM, heightM);
    case 'dome': return buildDomeShape(widthM, heightM);
    case 'arc': return buildArcShape(widthM, heightM);
    case 'cross': return buildCrossShape(widthM, heightM);
    case 'classic':
    default: return buildClassicShape(widthM, heightM);
  }
};

export const MonumentModel = ({
  textureUrl,
  materialName,
  finish,
  dimensions,
  baseDimensions,
  inscription,
  name,
  dates,
  inscriptionStyle = DEFAULT_INSCRIPTION_STYLE,
  shape: shapeKind = 'classic',
  showCross = false,
  showFlowerbed = false,
  tombstoneSlab = 'full',
  slabThicknessCm = 5,
  decoration = 'none',
  nicheStyle = 'recessed',
  photoUrl,
  layout = 'single',
  secondaryInscription = '',
  secondaryName = '',
  secondaryDates = '',
  doubleGapCm = 10
}: MonumentModelProps) => {
  const widthM = dimensions.widthCm * CM_TO_M;
  const heightM = dimensions.heightCm * CM_TO_M;
  const thicknessM = Math.max(0.04, dimensions.thicknessCm * CM_TO_M);

  /** Double-monument geometry: two stelas of the same shape/material/size sit side-by-side on a
   *  single shared base — visually "glued together" with a hairline seam down the middle.
   *
   *  Each extruded headstone has an 8 mm bevel on every edge (see `createHeadstoneExtrudeGeometry`).
   *  If we positioned the two centers exactly `widthM` apart, those bevels would create a visible
   *  ~16 mm V-groove between the stelas. We compensate by pulling each stela inward by one bevel
   *  width — so when the user dials the gap to 0, the bevels merge into a clean seam instead of a
   *  furrow, and a positive gap value still produces the expected visible spacing. */
  const STELA_BEVEL_M = 0.008;
  const isDouble = layout === 'double';
  const doubleGapM = doubleGapCm * CM_TO_M;
  /** Distance between the two stela centers, clamped so the user can't accidentally overlap
   *  them by more than 40 % of the stela width. */
  const stelaCenterDistanceM = isDouble
    ? Math.max(widthM * 0.6, widthM + doubleGapM - STELA_BEVEL_M * 2)
    : 0;
  const stelaOffsetsX = isDouble
    ? [-stelaCenterDistanceM / 2, stelaCenterDistanceM / 2]
    : [0];
  /** Total horizontal extent of the headstone footprint (used by base/slab width derivations). */
  const stelaSpanM = isDouble ? stelaCenterDistanceM + widthM : widthM;

  /** Base (pedestal) can be set explicitly by the user — otherwise derived from the full stela span.
   *  When the user-supplied width is too narrow to physically hold both stelas, we silently widen
   *  the base to a sane floor; the slider keeps responding for further fine-tuning above that floor. */
  const minDoubleBaseWidth = isDouble ? stelaSpanM + widthM * 0.2 : 0;
  const derivedBaseWidth = isDouble ? stelaSpanM * 1.15 : widthM * 1.4;
  const baseWidth = Math.max(
    minDoubleBaseWidth,
    baseDimensions
      ? Math.max(0.4, baseDimensions.widthCm * CM_TO_M)
      : derivedBaseWidth
  );
  const baseDepth = baseDimensions
    ? Math.max(0.15, baseDimensions.depthCm * CM_TO_M)
    : thicknessM * 2.6;
  const baseHeight = baseDimensions
    ? Math.max(0.04, baseDimensions.heightCm * CM_TO_M)
    : Math.max(0.08, Math.min(0.16, heightM * 0.1));
  const plinthWidth = baseWidth * 0.86;
  const plinthDepth = baseDepth * 0.82;
  const plinthHeight = Math.max(0.04, baseHeight * 0.55);

  /** Плита надгробная — wide flat slab covering the grave.
   *  Half = covers only the area in front of the base (≈half a typical grave length).
   *  Full = covers the whole grave from the base forward. */
  const slabHeight = Math.max(0.03, slabThicknessCm * CM_TO_M);
  const slabWidth = Math.max(baseWidth * 1.25, stelaSpanM * 1.5);
  const slabFullDepth = Math.max(baseDepth * 2.0, thicknessM * 5.5);
  const slabHalfDepth = Math.max(baseDepth * 1.15, thicknessM * 2.8);
  const slabDepth = tombstoneSlab === 'half' ? slabHalfDepth : slabFullDepth;
  /** Push slab forward more for "half" — visually it stops short of fully covering the grave. */
  const slabForwardOffset = tombstoneSlab === 'half'
    ? slabDepth * 0.32
    : slabDepth * 0.18;
  const hasSlab = tombstoneSlab !== 'none';

  /** Цветник — rectangular planter sitting just in front of the base. */
  const flowerbedWidth = baseWidth * 0.95;
  const flowerbedDepth = Math.max(baseDepth * 0.45, thicknessM * 1.4);
  const flowerbedHeight = Math.max(0.08, baseHeight * 0.7);
  const flowerbedWall = Math.max(0.02, flowerbedDepth * 0.12);

  /** Stack everything bottom-up. When the slab is hidden the base sits on the ground. */
  const slabTopY = hasSlab ? slabHeight : 0;
  const baseY = slabTopY + baseHeight / 2;
  const plinthY = slabTopY + baseHeight + plinthHeight / 2;
  const headstoneBaseY = slabTopY + baseHeight + plinthHeight - 0.005;

  const albedoMap = useStoneAlbedoTexture(textureUrl, materialName);
  const spanM = Math.max(dimensions.heightCm, dimensions.widthCm, dimensions.thicknessCm * 2) * CM_TO_M;

  /** Stone luminance class — drives:
   *  – text fill / outline colour (light letters on dark stone, dark letters on light stone),
   *  – portrait engraving polarity (white-on-black etch on granite, dark-on-light on marble),
   *  – default niche plate colour.
   *  Defined early so the photo material below can branch on it. */
  const isDarkStone =
    materialName === 'Black Granite' || materialName === 'Labradorite Blue';

  /** User portrait photo, only relevant for portrait/medallion decorations. The hook
   *  pre-bakes both the aspect crop and a soft edge vignette into the texture so this
   *  component doesn't have to coordinate UV repeat/offset with shader-side masking. */
  const photoTexture = usePhotoTexture(
    decoration === 'portrait' || decoration === 'medallion' ? photoUrl : undefined,
    decoration === 'medallion' ? 'square' : 'portrait'
  );

  /** Photo material — renders the uploaded portrait as a laser-etched grayscale engraving.
   *
   *  Modes (driven by `nicheStyle` and stone luminance):
   *  – recessed + dark stone: bright photo pixels stay bright, dark pixels become transparent
   *    so the polished granite shows through (alpha = grayscale). Looks like a laser etch.
   *  – recessed + light stone: dark photo pixels become a charcoal engraving, light pixels
   *    disappear into the stone.
   *  – framed: opaque high-contrast grayscale (porcelain photo plaque inside the stone rim).
   *
   *  Edge softness is delegered to `usePhotoTexture`'s canvas-level vignette (applied after
   *  background removal) — keeping the GPU shader simple avoids version-specific issues with
   *  three.js shader chunk renames. */
  const isDecorationCircle = decoration === 'medallion';
  const photoMaterial = useMemo(() => {
    if (!photoTexture) return null;
    const mat = new THREE.MeshStandardMaterial({
      map: photoTexture,
      roughness: nicheStyle === 'framed' ? 0.45 : 0.32,
      metalness: 0.0,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const f = (v: number) => v.toFixed(3);
    const isDark = isDarkStone ? 1.0 : 0.0;
    const isFramed = nicheStyle === 'framed' ? 1.0 : 0.0;

    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
          #include <map_fragment>

          // Photo texture's existing alpha (from canvas vignette + background removal) is
          // preserved as _srcAlpha so we don't lose the soft border further down.
          float _srcAlpha = diffuseColor.a;

          float _gray = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          // High-contrast S-curve so etched marks read on stone (real laser-etch portraits
          // are pushed past photo contrast — the operator clamps midtones aggressively).
          _gray = clamp((_gray - 0.5) * 1.55 + 0.5, 0.0, 1.0);

          float _isDark   = ${f(isDark)};
          float _isFramed = ${f(isFramed)};

          // Recessed engraving — colour AND alpha vary with source brightness, so the
          // engraving has the same tonal range as a real laser etch (forehead brighter than
          // cheeks, hair almost dissolves into the stone, etc.):
          //  – dark stone: marks are mid-to-light gray; bright photo pixels are most visible
          //  – light stone: marks are charcoal; DARK photo pixels are most visible
          vec3 _recessedColor = mix(vec3(0.08), vec3(_gray), _isDark);
          float _recessedAlpha = mix(1.0 - _gray, _gray, _isDark);
          _recessedAlpha = pow(_recessedAlpha, 0.8);

          diffuseColor.rgb = mix(_recessedColor, vec3(_gray), _isFramed);
          float _photoAlpha = mix(_recessedAlpha, 1.0, _isFramed);

          // Combine with the texture's own alpha (canvas vignette / background removal).
          diffuseColor.a = _photoAlpha * _srcAlpha;
        `
      );
    };
    mat.needsUpdate = true;
    return mat;
  }, [photoTexture, isDarkStone, nicheStyle, isDecorationCircle]);

  useEffect(() => () => photoMaterial?.dispose(), [photoMaterial]);

  useLayoutEffect(() => {
    applyAlbedoTextureTiling(albedoMap, spanM, materialName);
  }, [albedoMap, spanM, materialName]);

  useEffect(() => {
    const img = albedoMap.image as HTMLImageElement | undefined;
    if (!img || typeof img.addEventListener !== 'function') return;
    if (img.complete && (img.naturalWidth || img.width)) return;
    const onLoad = () => applyAlbedoTextureTiling(albedoMap, spanM, materialName);
    img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, [albedoMap, spanM, materialName]);

  const stoneMaterial = useMemo(() => {
    const surface = finishToSurface(finish);
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: albedoMap,
      roughness: surface.roughness,
      metalness: surface.metalness,
      clearcoat: surface.clearcoat,
      clearcoatRoughness: surface.clearcoatRoughness
    });
  }, [albedoMap, finish]);

  useEffect(() => () => stoneMaterial.dispose(), [stoneMaterial]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.debug(
      '[MonumentModel] Cień na płycie: headstone ma receiveShadow=false (nie bierze mapy cienia światła kierunkowego — usuwa prostokątne plamy / self-shadow na czole). Bazy dalej mogą go zbierać.'
    );
  }, []);

  const shape = useMemo(() => buildShape(shapeKind, widthM, heightM), [shapeKind, widthM, heightM]);

  const extrudeSettings = useMemo(() => ({
    depth: thicknessM,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 5,
    curveSegments: 48
  }), [thicknessM]);

  const headstoneGeometry = useMemo(
    () => createHeadstoneExtrudeGeometry(shape, extrudeSettings),
    [shape, extrudeSettings]
  );

  useEffect(() => () => headstoneGeometry.dispose(), [headstoneGeometry]);

  const bodyHeight = useMemo(() => {
    switch (shapeKind) {
      case 'cross': return heightM * 0.6;
      case 'heart': return Math.max(0.05, heightM - widthM * 0.6);
      case 'gothic': return Math.max(0.05, heightM - widthM * 0.55);
      case 'rounded': return Math.max(0.05, heightM - widthM / 2);
      case 'stele': return heightM * 0.93;
      case 'concave': return Math.max(0.05, heightM - (widthM / 2 - widthM * 0.04));
      /** Asymmetric (tapered) — lower top edge at 83.5 % H. */
      case 'asymmetric': return heightM * 0.835;
      /** Steep-wave generic — lower top edge at 78 % H. */
      case 'wave-steep': return heightM * 0.78;
      /** Dome — both top edges ≈ 79.4–79.95 % H; use the lower for safety. */
      case 'dome': return heightM * 0.794;
      /** Arc — left edge 79.26 % H (lower of the two), use that as the inscription ceiling. */
      case 'arc': return heightM * 0.793;
      case 'classic':
      default: return Math.max(0.06, heightM - widthM * 0.48);
    }
  }, [shapeKind, heightM, widthM]);

  /** Za mały offset + faza extrude → z-fight przy orbicie (widać to częściej przy ostrym czole classic). */
  const textZ = thicknessM + 0.036;

  /** Klasyczny ma wąską „szyję” (≈0.56·width na neckY), więc bez marginesu napis dochodziłby do krawędzi.
   *  Krzyż ma tylko wąski trzon — jeszcze ciaśniej. Pozostałe są zbliżone do prostokąta. */
  const textMaxWidthFactor = (() => {
    switch (shapeKind) {
      case 'classic': return 0.66;
      case 'cross': return 0.38;
      case 'stele': return 0.84;
      case 'concave': return 0.56;
      /** Base is 16.5 % narrower than the top on each side, so the chord at the typical text
       *  band (y ≈ 0.25–0.40 H) is ≈ 80 % of widthM. 0.7 leaves a safe inner margin. */
      case 'asymmetric': return 0.7;
      case 'wave-steep': return 0.78;
      /** Straight vertical sides + low arch leaves plenty of horizontal room for text. */
      case 'dome': return 0.82;
      case 'arc': return 0.82;
      case 'rounded':
      case 'gothic':
      case 'heart':
      default: return 0.78;
    }
  })();
  const textMaxWidth = widthM * textMaxWidthFactor;

  /** Szerokość znaku w jednostkach fontSize. Cinzel 900 / Playfair 800 mają szerokie glify (~0.65–0.72 em),
   *  więc trzymamy zachowawcze 0.7 + spory wpływ letterSpacingu — inaczej linie troiki wychodziły o 1 dłuższe
   *  niż nasza prognoza i bloki zachodziły na siebie. */
  const charFactor = 0.7 + inscriptionStyle.letterSpacing * 0.9;

  const transformText = (value: string) =>
    inscriptionStyle.transform === 'uppercase' ? value.toUpperCase() : value;

  /** Dopasowujemy fontSize tak, żeby:
   *  – najdłuższe słowo zmieściło się w jednej linii (nie wyłamie się w pojedynczy znak),
   *  – cały tekst nie zajął więcej niż `maxLines` linii (zwykle 1–2). */
  const autoFitFontSize = (text: string, desired: number, maxLines: number) => {
    if (!text) return desired;
    const words = text.split(/\s+/).filter(Boolean);
    const longestWord = words.reduce((m, w) => Math.max(m, w.length), 1);
    const sizeByWord = textMaxWidth / (longestWord * charFactor);
    const sizeByTotal = textMaxWidth / (Math.ceil(text.length / Math.max(1, maxLines)) * charFactor);
    return Math.min(desired, sizeByWord, sizeByTotal);
  };

  const baseSize = Math.max(0.04, Math.min(widthM * 0.13, bodyHeight * 0.14));

  /** Bez panelu pod tekstem trzeba dobrać kolor liter pod kamień: ciemne litery na jasnym kamieniu,
   *  jasne litery na ciemnym — inaczej kremowy domyślny napis ginął na marmurze/piaskowcu. */
  const textFillColor = isDarkStone ? '#f5e9c8' : '#1a1208';
  const textOutlineColor = isDarkStone ? '#0b0805' : '#fbf5e3';

  const commonTextProps = {
    color: textFillColor,
    outlineColor: textOutlineColor,
    outlineOpacity: 0.85,
    anchorX: 'center' as const,
    anchorY: 'middle' as const,
    textAlign: 'center' as const,
    maxWidth: textMaxWidth,
    letterSpacing: inscriptionStyle.letterSpacing,
    font: inscriptionStyle.fontUrl,
    /** Wymuszamy depthTest=false na materiale Text przez renderOrder — tekst po headstone w kolejności rysowania. */
    renderOrder: 2,
    depthOffset: -1
  };

  const linesFor = (text: string, fontSize: number) => {
    if (!text || fontSize <= 0) return 0;
    const charsPerLine = Math.max(1, Math.floor(textMaxWidth / (fontSize * charFactor)));
    return wordAwareLineCount(text, charsPerLine);
  };

  /** Decoration (portrait/medallion/cross) goes onto the upper portion of the headstone face.
   *  We compute its size and Y center first, then narrow the text layout so the two don't overlap.
   *  When `layout='double'`, the same decoration kind is mirrored on each stela. */
  const decorationSize = (() => {
    if (decoration === 'none') return { w: 0, h: 0 };
    const w = widthM * (decoration === 'cross' ? 0.34 : 0.42);
    const h =
      decoration === 'portrait' ? w * 1.25 : decoration === 'cross' ? w * 1.7 : w;
    return { w, h };
  })();
  const decorationCenterY = bodyHeight * 0.74;
  const decorationBottomY = decorationCenterY - decorationSize.h / 2;
  const hasDecoration = decoration !== 'none';

  /** Shape-dependent text bounds are the same on both stelas (same shape, same widthM, same heightM).
   *  Computed once so we don't repeat the switch for each stela in a double monument. */
  const textBounds = (() => {
    const decorationGap = baseSize * 0.45;
    const decorationTopLimit = hasDecoration
      ? Math.max(bodyHeight * 0.1, decorationBottomY - decorationGap)
      : Infinity;

    const shaped = (() => {
      switch (shapeKind) {
        case 'classic':
          return {
            desiredCenterY: bodyHeight * 0.45,
            topLimit: bodyHeight * 0.72,
            bottomLimit: bodyHeight * 0.08
          };
        case 'cross':
          return {
            desiredCenterY: bodyHeight * 0.5,
            topLimit: bodyHeight * 0.85,
            bottomLimit: bodyHeight * 0.1
          };
        case 'rounded':
          return {
            desiredCenterY: heightM * 0.5,
            topLimit: bodyHeight + widthM * 0.18,
            bottomLimit: bodyHeight * 0.1
          };
        case 'gothic':
          return {
            desiredCenterY: heightM * 0.46,
            topLimit: bodyHeight + (heightM - bodyHeight) * 0.3,
            bottomLimit: bodyHeight * 0.1
          };
        case 'heart':
          return {
            desiredCenterY: heightM * 0.42,
            topLimit: bodyHeight * 0.96,
            bottomLimit: bodyHeight * 0.1
          };
        case 'stele':
          return {
            desiredCenterY: bodyHeight * 0.42,
            topLimit: bodyHeight * 0.78,
            bottomLimit: bodyHeight * 0.08
          };
        case 'concave':
          return {
            desiredCenterY: heightM * 0.28,
            topLimit: heightM * 0.44,
            bottomLimit: bodyHeight * 0.06
          };
        case 'asymmetric':
          /** Text sits in the lower-middle band — wave top is reserved for the portrait / cross
           *  engraving. Bottom margin is bigger than other shapes because the base is tapered:
           *  a too-low line would touch the inward-sloping side. */
          return {
            desiredCenterY: heightM * 0.34,
            topLimit: heightM * 0.65,
            bottomLimit: bodyHeight * 0.14
          };
        case 'wave-steep':
          return {
            desiredCenterY: heightM * 0.34,
            topLimit: heightM * 0.62,
            bottomLimit: bodyHeight * 0.06
          };
        case 'dome':
          /** Top arch peaks at 88 % and edges are at 79 % — text can safely go up to ~66 %
           *  before flirting with the curve. Inscription typically centred a bit higher than
           *  asymmetric shapes because the arch makes the available band feel taller. */
          return {
            desiredCenterY: heightM * 0.36,
            topLimit: heightM * 0.66,
            bottomLimit: bodyHeight * 0.06
          };
        case 'arc':
          /** Apex ≈ 86 % H, edges ≈ 79 % — band is similar to dome but the apex is shifted
           *  left, so we keep the same conservative top limit. */
          return {
            desiredCenterY: heightM * 0.36,
            topLimit: heightM * 0.64,
            bottomLimit: bodyHeight * 0.06
          };
        default:
          return {
            desiredCenterY: bodyHeight * 0.5,
            topLimit: bodyHeight * 0.85,
            bottomLimit: bodyHeight * 0.08
          };
      }
    })();

    const topLimit = Math.min(shaped.topLimit, decorationTopLimit);
    const desiredCenterY = hasDecoration
      ? Math.min(shaped.desiredCenterY, (topLimit + shaped.bottomLimit) / 2)
      : shaped.desiredCenterY;
    return { ...shaped, topLimit, desiredCenterY };
  })();

  /** Pure helper — computes per-stela trimmed text + sizes + Y positions for a given inscription bundle.
   *  Called once per stela in the JSX below so each side can carry its own inscription/name/dates. */
  const computeStelaText = (
    inscriptionRaw: string,
    nameRaw: string,
    datesRaw: string
  ) => {
    const inscriptionTrimmed = transformText(inscriptionRaw?.trim() ?? '');
    const nameTrimmed = transformText(nameRaw?.trim() ?? '');
    const datesTrimmed = datesRaw?.trim() ?? '';

    const headerSize = autoFitFontSize(inscriptionTrimmed, baseSize * 0.85, 2);
    const nameSize = autoFitFontSize(nameTrimmed, baseSize * 1.3, 2);
    const datesSize = autoFitFontSize(datesTrimmed, baseSize * 0.9, 1);

    const headerLines = linesFor(inscriptionTrimmed, headerSize);
    const nameLines = linesFor(nameTrimmed, nameSize);
    const datesLines = linesFor(datesTrimmed, datesSize);

    const headerHeight = headerLines * headerSize * TEXT_LINE_HEIGHT;
    const nameHeight = nameLines * nameSize * TEXT_LINE_HEIGHT;
    const datesHeight = datesLines * datesSize * TEXT_LINE_HEIGHT;

    const blockGap = baseSize * 0.55;
    const visibleBlocks =
      (inscriptionTrimmed ? 1 : 0) + (nameTrimmed ? 1 : 0) + (datesTrimmed ? 1 : 0);
    const totalGaps = Math.max(0, visibleBlocks - 1) * blockGap;
    const totalTextHeight = headerHeight + nameHeight + datesHeight + totalGaps;

    const usableSpan = textBounds.topLimit - textBounds.bottomLimit;
    let textCenterY = textBounds.desiredCenterY;
    if (totalTextHeight <= usableSpan) {
      if (textCenterY + totalTextHeight / 2 > textBounds.topLimit) {
        textCenterY = textBounds.topLimit - totalTextHeight / 2;
      } else if (textCenterY - totalTextHeight / 2 < textBounds.bottomLimit) {
        textCenterY = textBounds.bottomLimit + totalTextHeight / 2;
      }
    } else {
      textCenterY = (textBounds.topLimit + textBounds.bottomLimit) / 2;
    }
    const textTopY = textCenterY + totalTextHeight / 2;

    let cursor = textTopY;
    const headerY = inscriptionTrimmed ? cursor - headerHeight / 2 : 0;
    if (inscriptionTrimmed) cursor -= headerHeight;
    if (inscriptionTrimmed && (nameTrimmed || datesTrimmed)) cursor -= blockGap;
    const nameY = nameTrimmed ? cursor - nameHeight / 2 : 0;
    if (nameTrimmed) cursor -= nameHeight;
    if (nameTrimmed && datesTrimmed) cursor -= blockGap;
    const datesY = datesTrimmed ? cursor - datesHeight / 2 : 0;

    return {
      inscriptionTrimmed, nameTrimmed, datesTrimmed,
      headerSize, nameSize, datesSize,
      headerY, nameY, datesY
    };
  };

  /** One bundle per stela. For a single monument only the first entry is used. */
  const stelaTexts = [
    computeStelaText(inscription, name ?? '', dates ?? ''),
    ...(isDouble ? [computeStelaText(secondaryInscription, secondaryName, secondaryDates)] : [])
  ];

  /** Niche colour: ciemne tło pod portret/medalion, w odcieniu kontrastującym z kamieniem. */
  const nichePlateColor = isDarkStone ? '#0b0805' : '#1c130b';

  return (
    <group>
      {hasSlab && (
        <mesh
          position={[0, slabHeight / 2, slabForwardOffset]}
          receiveShadow
          material={stoneMaterial}
        >
          <boxGeometry args={[slabWidth, slabHeight, slabDepth]} />
        </mesh>
      )}

      {showFlowerbed && (() => {
        /** Цветник siedzi z przodu podstawy: prostokątna obwódka z 4 ścianek + dno.
         *  Środek pozostaje pusty (wizualnie sugeruje miejsce na kwiaty). */
        const flowerbedFrontZ = baseDepth / 2 + flowerbedDepth / 2 + 0.01;
        const flowerbedBaseY = slabTopY + 0.005;
        const innerWidth = Math.max(0.02, flowerbedWidth - flowerbedWall * 2);
        const innerDepth = Math.max(0.02, flowerbedDepth - flowerbedWall * 2);
        return (
          <group position={[0, flowerbedBaseY, flowerbedFrontZ]}>
            <mesh receiveShadow material={stoneMaterial}>
              <boxGeometry args={[flowerbedWidth, 0.02, flowerbedDepth]} />
            </mesh>
            <mesh
              position={[0, flowerbedHeight / 2, -flowerbedDepth / 2 + flowerbedWall / 2]}
              receiveShadow
              material={stoneMaterial}
            >
              <boxGeometry args={[flowerbedWidth, flowerbedHeight, flowerbedWall]} />
            </mesh>
            <mesh
              position={[0, flowerbedHeight / 2, flowerbedDepth / 2 - flowerbedWall / 2]}
              receiveShadow
              material={stoneMaterial}
            >
              <boxGeometry args={[flowerbedWidth, flowerbedHeight, flowerbedWall]} />
            </mesh>
            <mesh
              position={[-flowerbedWidth / 2 + flowerbedWall / 2, flowerbedHeight / 2, 0]}
              receiveShadow
              material={stoneMaterial}
            >
              <boxGeometry args={[flowerbedWall, flowerbedHeight, innerDepth]} />
            </mesh>
            <mesh
              position={[flowerbedWidth / 2 - flowerbedWall / 2, flowerbedHeight / 2, 0]}
              receiveShadow
              material={stoneMaterial}
            >
              <boxGeometry args={[flowerbedWall, flowerbedHeight, innerDepth]} />
            </mesh>
            <mesh position={[0, flowerbedHeight * 0.35, 0]}>
              <boxGeometry args={[innerWidth, 0.01, innerDepth]} />
              <meshStandardMaterial color="#2a1d10" roughness={0.95} />
            </mesh>
          </group>
        );
      })()}

      <mesh position={[0, baseY, 0]} receiveShadow material={stoneMaterial}>
        <boxGeometry args={[baseWidth, baseHeight, baseDepth]} />
      </mesh>

      <mesh position={[0, plinthY, 0]} receiveShadow material={stoneMaterial}>
        <boxGeometry args={[plinthWidth, plinthHeight, plinthDepth]} />
      </mesh>

      {stelaOffsetsX.map((offsetX, stelaIdx) => {
        const txt = stelaTexts[stelaIdx];
        return (
          <group key={`stela-${stelaIdx}`} position={[offsetX, headstoneBaseY, -thicknessM / 2]}>
            <mesh
              castShadow={shapeKind !== 'classic'}
              receiveShadow={false}
              material={stoneMaterial}
              geometry={headstoneGeometry}
            />

            {hasDecoration && (() => {
              /** Decoration sits flush with the front face of the headstone.
               *  Recessed: a single dark plate ~6mm out → reads as a niche.
               *  Framed: same dark plate + a thin stone rim (4 strips for portrait, ring for medallion). */
              const plateZ = thicknessM + 0.006;
              const frameZ = thicknessM + 0.014;
              const frameThickness = Math.min(0.018, Math.max(0.008, widthM * 0.018));
              const { w, h } = decorationSize;

              if (decoration === 'cross') {
                /** Classic raised Latin cross carved from the same stone (relief on the face).
                 *  Square-section beams; the crossbar sits in the upper third. */
                const beam = w * 0.26;
                const reliefDepth = Math.max(0.02, widthM * 0.03);
                const crossZ = thicknessM + reliefDepth / 2;
                const crossbarY = h / 2 - h * 0.28;
                return (
                  <group position={[0, decorationCenterY, 0]}>
                    <mesh position={[0, 0, crossZ]} castShadow material={stoneMaterial}>
                      <boxGeometry args={[beam, h, reliefDepth]} />
                    </mesh>
                    <mesh position={[0, crossbarY, crossZ]} castShadow material={stoneMaterial}>
                      <boxGeometry args={[w, beam, reliefDepth]} />
                    </mesh>
                  </group>
                );
              }

              const isMedallion = decoration === 'medallion';
              const isFramed = nicheStyle === 'framed';
              /** Framed: real porcelain-plaque look — keep the dark backing plate at `plateZ`.
               *  Recessed: laser engraving directly on the polished stone — NO plate at all
               *  (the dark plate was the main thing making the portrait look "pasted"). */
              const plateOutZ = plateZ;
              /** Photo geometry: full niche size for recessed (vignette in the shader fades the
               *  edge), slightly inset for framed so the porcelain image has a visible border. */
              const photoW = isFramed ? w * 0.86 : w;
              const photoH = isFramed ? h * 0.86 : h;
              const photoR = isFramed ? (w / 2) * 0.9 : w / 2;
              const photoZ = isFramed
                ? plateOutZ + 0.0066
                : thicknessM + 0.0018;

              return (
                <group position={[0, decorationCenterY, 0]}>
                  {isFramed && (isMedallion ? (
                    /** cylinderGeometry is Y-aligned by default; rotate 90° around X so the disc faces +Z. */
                    <mesh position={[0, 0, plateOutZ]} rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[w / 2, w / 2, 0.012, 48]} />
                      <meshStandardMaterial color={nichePlateColor} roughness={0.6} metalness={0.15} />
                    </mesh>
                  ) : (
                    <mesh position={[0, 0, plateOutZ]}>
                      <boxGeometry args={[w, h, 0.012]} />
                      <meshStandardMaterial color={nichePlateColor} roughness={0.6} metalness={0.15} />
                    </mesh>
                  ))}

                  {photoMaterial && (
                    /** Recessed: photo plane is glued to the stone face — alpha + vignette in the
                     *  shader make it look engraved. Framed: photo sits just in front of the
                     *  porcelain-style plate, with a visible plate rim around it. */
                    <mesh position={[0, 0, photoZ]} material={photoMaterial} renderOrder={1}>
                      {isMedallion ? (
                        <circleGeometry args={[photoR, 64]} />
                      ) : (
                        <planeGeometry args={[photoW, photoH]} />
                      )}
                    </mesh>
                  )}

                  {nicheStyle === 'framed' && isMedallion && (
                    /** ringGeometry sits in the XY plane and faces +Z by default. */
                    <mesh position={[0, 0, frameZ]} material={stoneMaterial}>
                      <ringGeometry args={[w / 2, w / 2 + frameThickness, 64]} />
                    </mesh>
                  )}

                  {nicheStyle === 'framed' && !isMedallion && (
                    <group position={[0, 0, frameZ]}>
                      <mesh material={stoneMaterial} position={[0, h / 2 + frameThickness / 2, 0]}>
                        <boxGeometry args={[w + frameThickness * 2, frameThickness, frameThickness]} />
                      </mesh>
                      <mesh material={stoneMaterial} position={[0, -h / 2 - frameThickness / 2, 0]}>
                        <boxGeometry args={[w + frameThickness * 2, frameThickness, frameThickness]} />
                      </mesh>
                      <mesh material={stoneMaterial} position={[-w / 2 - frameThickness / 2, 0, 0]}>
                        <boxGeometry args={[frameThickness, h, frameThickness]} />
                      </mesh>
                      <mesh material={stoneMaterial} position={[w / 2 + frameThickness / 2, 0, 0]}>
                        <boxGeometry args={[frameThickness, h, frameThickness]} />
                      </mesh>
                    </group>
                  )}
                </group>
              );
            })()}

            <Suspense fallback={null}>
              {txt.inscriptionTrimmed && (
                <Text {...commonTextProps} position={[0, txt.headerY, textZ]} fontSize={txt.headerSize} outlineWidth={txt.headerSize * 0.05} lineHeight={TEXT_LINE_HEIGHT}>
                  {txt.inscriptionTrimmed}
                </Text>
              )}
              {txt.nameTrimmed && (
                <Text {...commonTextProps} position={[0, txt.nameY, textZ]} fontSize={txt.nameSize} outlineWidth={txt.nameSize * 0.06} lineHeight={TEXT_LINE_HEIGHT}>
                  {txt.nameTrimmed}
                </Text>
              )}
              {txt.datesTrimmed && (
                <Text {...commonTextProps} position={[0, txt.datesY, textZ]} fontSize={txt.datesSize} outlineWidth={txt.datesSize * 0.05} lineHeight={TEXT_LINE_HEIGHT}>
                  {txt.datesTrimmed}
                </Text>
              )}
            </Suspense>
          </group>
        );
      })}

      {showCross && (() => {
        /** Wysokość sylwetki nagrobka w x = 0 (gdzie staje stopka krzyża).
         *  Bounding box (= heightM) działa tylko dla rounded i gothic — bo łuk dochodzi do heightM przy x=0.
         *  Classic: quadratic Bezier z punktem kontrolnym (0, heightM) — środek krzywej leży niżej.
         *  Heart: w x = 0 jest „wgłębienie” pomiędzy płatami serca. */
        const headstoneTopAtCenter = (() => {
          switch (shapeKind) {
            case 'classic': {
              const bodyH = Math.max(0.06, heightM - widthM * 0.48);
              const neckY = bodyH * 0.9;
              return (neckY + heightM) / 2;
            }
            case 'heart': {
              const bodyH = Math.max(0.05, heightM - widthM * 0.6);
              const heartTop = heightM * 0.92;
              return bodyH + (heartTop - bodyH) * 0.55;
            }
            /** Asymmetric / tapered (91/83.5 edges, control points at 82.5/103 % H): curve at
             *  x = 0 evaluated where the parametric form crosses centre (t ≈ 0.6) → 0.93 · H. */
            case 'asymmetric':
              return heightM * 0.93;
            /** Steep-wave generic (96/78 edges, control points at 100/105 % H): the curve at
             *  x = 0 sits near the upper bound, around 0.95 · H. */
            case 'wave-steep':
              return heightM * 0.95;
            /** Dome — apex at (51.8 %, 88.4 % H); at x = 0 the curve is essentially the apex
             *  height because the central anchor sits within 2 % of centre. */
            case 'dome':
              return heightM * 0.884;
            /** Arc — at x = 0 the cubic crosses centre near t = 0.5, giving y ≈ 0.844 · H
             *  (peak itself sits left of centre, ≈ 86 % at x ≈ −0.35 · hw). */
            case 'arc':
              return heightM * 0.844;
            case 'cross':
            case 'rounded':
            case 'gothic':
            default:
              return heightM;
          }
        })();
        /** Pionowa belka krzyża ma wysokość widthM*0.32 i jest wycentrowana na origin grupy,
         *  więc jej dolna krawędź leży w group local Y = -widthM*0.16. Dodajemy ten offset,
         *  żeby stopka krzyża dotykała korony nagrobka (+ drobne zatopienie 5 mm dla schludności). */
        const crossBaseOffset = widthM * 0.16 - 0.005;
        const crossY = headstoneBaseY + headstoneTopAtCenter + crossBaseOffset;
        return (
          <>
            {stelaOffsetsX.map((offsetX, idx) => (
              <group key={`cross-${idx}`} position={[offsetX, crossY, 0]}>
                <mesh castShadow material={stoneMaterial}>
                  <boxGeometry args={[widthM * 0.06, widthM * 0.32, thicknessM * 0.4]} />
                </mesh>
                <mesh castShadow position={[0, widthM * 0.06, 0]} material={stoneMaterial}>
                  <boxGeometry args={[widthM * 0.22, widthM * 0.06, thicknessM * 0.4]} />
                </mesh>
              </group>
            ))}
          </>
        );
      })()}

    </group>
  );
};