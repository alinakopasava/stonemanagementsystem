/** Canonical English names stored in `materials.name`. Keep these stable. */
import * as THREE from 'three';
import type { FinishType } from '@domain/entities/order-card';
import { canonicalMaterialName } from '@domain/entities/material';

const MATERIAL_IMAGES: Record<string, string> = {
  'Africa Granite': '/images/materials/africa.jpg',
  'Amadeus Granite': '/images/materials/amadeus.jpg',
  'Aurora Granite': '/images/materials/aurora.jpg',
  'Baltic Granite': '/images/materials/baltic.jpg',
  'Gabbro-Diabase': '/images/materials/gabbro-diabase.jpg',
  'Gandhi Granite': '/images/materials/gandhi.jpg',
  'Juparana Granite': '/images/materials/juparana.jpg',
  'Labradorite Granite': '/images/materials/labradorite.jpg',
  'Leznikovsky Granite': '/images/materials/leznikovsky.jpg',
  Marble: '/images/materials/marble.jpg',
  'Maslovsky Granite': '/images/materials/maslovsky.jpg',
  'Silk Granite': '/images/materials/silk.jpg',
  'Tiffany Granite': '/images/materials/tiffany.jpg'
};

export const DEFAULT_MATERIAL_IMAGE = MATERIAL_IMAGES['Gabbro-Diabase'];

/** Slab image for a material name, legacy names included. */
export const materialImageUrl = (materialName: string | null | undefined) =>
  MATERIAL_IMAGES[canonicalMaterialName(materialName)] ?? DEFAULT_MATERIAL_IMAGE;

/** Dark stones (avg luma < ~0.42): used for photo-engraving polarity seeding. */
const DARK_STONE_MATERIALS = new Set([
  'Gabbro-Diabase',
  'Labradorite Granite',
  'Amadeus Granite',
  'Maslovsky Granite',
  'Africa Granite',
  'Aurora Granite',
  'Baltic Granite',
  'Leznikovsky Granite'
]);

export type InscriptionColors = {
  fill: string;
  outline: string;
  metalness: number;
  roughness: number;
  /** Optional self-illumination so light fills read as true white on dark/red stone. */
  emissive?: string;
  emissiveIntensity?: number;
  /** Scales the letter outline width (1 = default). Set 0 for no outline. */
  outlineScale?: number;
  /** Soft blur on the outline, as a fraction of font size — turns the hard outline
   *  into a soft shadow/halo. */
  outlineBlur?: number;
  /** Outline opacity (default 1). Lower it for a gentler shadow. */
  outlineOpacity?: number;
  /** Faux-bold: glyph stroke width as a fraction of font size, drawn in the fill
   *  colour so the letters thicken without a contrasting border. */
  boldStroke?: number;
  /** Render the letters unlit at full brightness (bypasses scene tone-mapping) so a
   *  white fill reads as a true, luminous white rather than a dimmed grey. */
  glow?: boolean;
  /** Draw a soft darkened panel behind the inscription so the text reads on a calm
   *  surface instead of fighting a very busy, speckled slab. */
  textPanel?: boolean;
  /** Explicit plaque tint (hex). When set, overrides the auto tint taken from the
   *  slab's average colour. */
  panelColor?: string;
};

export type StoneTextureStats = {
  meanLuma: number;
  /** Share of pixels brighter than ~65 % — white veins, light specks. */
  brightFraction: number;
  /** Share of pixels darker than ~25 % — black grains, dark veins. */
  darkFraction: number;
  p90Luma: number;
  /** Average colour of the slab (0–1), used to tint UI drawn over it. */
  meanColor: { r: number; g: number; b: number };
};

const lumaFromRgb = (r: number, g: number, b: number) =>
  (0.299 * r + 0.587 * g + 0.114 * b) / 255;

/** Sample albedo to detect both average tone and light/dark inclusions. */
export const sampleStoneTextureStats = (
  image: CanvasImageSource,
  size = 32
): StoneTextureStats | null => {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const lumas: number[] = [];
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    for (let i = 0; i < data.length; i += 4) {
      lumas.push(lumaFromRgb(data[i], data[i + 1], data[i + 2]));
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
    }
    if (lumas.length === 0) return null;
    lumas.sort((a, b) => a - b);
    const n = lumas.length;
    const meanLuma = lumas.reduce((sum, value) => sum + value, 0) / n;
    const brightFraction = lumas.filter((value) => value > 0.65).length / n;
    const darkFraction = lumas.filter((value) => value < 0.25).length / n;
    const p90Luma = lumas[Math.min(n - 1, Math.floor(n * 0.9))];
    const meanColor = { r: sumR / n / 255, g: sumG / n / 255, b: sumB / n / 255 };
    return { meanLuma, brightFraction, darkFraction, p90Luma, meanColor };
  } catch {
    return null;
  }
};

/**
 * The plaque treatment: a calm grey tablet carrying white, thickened letters
 * with a black outline.
 *
 * A coarse, high-contrast slab swallows an engraved inscription whatever colour
 * the letters are given, because the pattern competes with them everywhere at
 * once. These stones get a surface of their own for the text instead of a
 * louder colour on the stone itself.
 */
const PLAQUE_ON_BUSY_STONE: InscriptionColors = {
  fill: '#ffffff',
  outline: '#000000',
  metalness: 0,
  roughness: 0.5,
  outlineScale: 1.4,
  outlineBlur: 0,
  outlineOpacity: 1,
  boldStroke: 0.1,
  glow: true,
  textPanel: true,
  panelColor: '#54575c'
};

/**
 * Per-material inscription colours tuned against `/public/images/materials/*.jpg`.
 * Fill must read on its own (classic GLB letters have no outline). Outline is for
 * procedural 3D text on busy slabs.
 */
const INSCRIPTION_BY_MATERIAL: Record<string, InscriptionColors> = {
  /** Near-black, fine grey flecks — bright gold, monument-typical. */
  'Gabbro-Diabase': {
    fill: '#ecc57a',
    outline: '#0a0804',
    metalness: 0.58,
    roughness: 0.26,
    emissive: '#c9a050',
    emissiveIntensity: 0.22
  },
  /** Dark navy + iridescent blue — gold, not silver (silver fights the flash). */
  'Labradorite Granite': {
    fill: '#e0b85a',
    outline: '#071018',
    metalness: 0.54,
    roughness: 0.28,
    emissive: '#c4a04a',
    emissiveIntensity: 0.2
  },
  /** Mostly black with thick white veins, which cut straight through lettering:
   *  the inscription gets a plaque of its own. */
  'Amadeus Granite': PLAQUE_ON_BUSY_STONE,
  /** Dark forest green with heavy black grains. */
  'Maslovsky Granite': PLAQUE_ON_BUSY_STONE,
  /** Saturated terracotta red — white so letters stay crisp. */
  'Africa Granite': {
    fill: '#ffffff',
    outline: '#1a0a08',
    metalness: 0,
    roughness: 0.5,
    emissive: '#ffffff',
    emissiveIntensity: 0.62
  },
  /** Black bands crossing terracotta, so no single letter colour works over the
   *  whole face. */
  'Aurora Granite': PLAQUE_ON_BUSY_STONE,
  /** Burnt orange with charcoal grains. */
  'Baltic Granite': PLAQUE_ON_BUSY_STONE,
  /** Mid-dark brick red — cool ivory. */
  'Leznikovsky Granite': {
    fill: '#f5ece6',
    outline: '#1c0c0c',
    metalness: 0.06,
    roughness: 0.42,
    emissive: '#f2e8e2',
    emissiveIntensity: 0.18
  },
  /** Light salt-and-pepper grey, speckled edge to edge. */
  'Gandhi Granite': PLAQUE_ON_BUSY_STONE,
  /** Bright white Carrara — near-black. */
  Marble: {
    fill: '#141210',
    outline: '#f7f3ec',
    metalness: 0.04,
    roughness: 0.48
  },
  /** High-key grey swirls — deep charcoal. */
  'Silk Granite': {
    fill: '#1a1816',
    outline: '#f2eee8',
    metalness: 0.05,
    roughness: 0.46
  },
  /** Salmon-pink field broken by black veins. */
  'Juparana Granite': PLAQUE_ON_BUSY_STONE,
  /** Mid teal + cream veins — deep pine. */
  'Tiffany Granite': {
    fill: '#0c1614',
    outline: '#e8f2ee',
    metalness: 0.06,
    roughness: 0.44
  }
};

const WARM_GOLD_ON_DARK: InscriptionColors = {
  fill: '#ecc57a',
  outline: '#0a0804',
  metalness: 0.54,
  roughness: 0.26,
  emissive: '#c9a050',
  emissiveIntensity: 0.2
};

const DARK_ON_LIGHT: InscriptionColors = {
  fill: '#141210',
  outline: '#f7f3ec',
  metalness: 0.06,
  roughness: 0.46
};

const LIGHT_ON_BUSY_DARK: InscriptionColors = {
  fill: '#f3efe6',
  outline: '#12100c',
  metalness: 0.08,
  roughness: 0.42,
  emissive: '#f0ece4',
  emissiveIntensity: 0.14
};

/** Pick contrasting inscription when material has no preset (uses inclusion stats). */
export const pickInscriptionColorsFromStats = (
  stats: StoneTextureStats
): InscriptionColors => {
  const { meanLuma, brightFraction, darkFraction, p90Luma } = stats;
  const hasLightInclusions = brightFraction > 0.05 || p90Luma > 0.5;
  const hasHeavyDarkInclusions = darkFraction > 0.2;
  const isMostlyDark =
    meanLuma < 0.32 && !hasLightInclusions && p90Luma < 0.38;

  if (isMostlyDark) return WARM_GOLD_ON_DARK;
  if (hasLightInclusions || meanLuma > 0.44) return DARK_ON_LIGHT;
  if (hasHeavyDarkInclusions) return LIGHT_ON_BUSY_DARK;
  return meanLuma < 0.42 ? WARM_GOLD_ON_DARK : DARK_ON_LIGHT;
};

/** Contrasting inscription palette for a material. */
export const getInscriptionColors = (
  materialName: string | undefined,
  stats?: StoneTextureStats
): InscriptionColors => {
  const preset = INSCRIPTION_BY_MATERIAL[canonicalMaterialName(materialName)];
  if (preset) {
    return preset;
  }
  if (stats) return pickInscriptionColorsFromStats(stats);
  return isDarkStone(materialName) ? WARM_GOLD_ON_DARK : DARK_ON_LIGHT;
};

/**
 * Portrait engraving tuned per stone, the same way the lettering is.
 *
 * The shader already anchors the engraving to the stone's measured luminance,
 * which settles light-on-dark against dark-on-light. What it cannot know is how
 * *busy* the slab is: a face cut into speckled red Africa or veined Amadeus
 * competes with the pattern, and needs a harder tonal separation than the same
 * face on calm marble, where the extra contrast would only look harsh.
 */
export type PhotoEngravingProfile = {
  brightness: number;
  contrast: number;
  /** How far the engraving fades back into the slab. */
  blend: number;
};

/**
 * The portrait is a fixed black-and-white image, so the tones pass straight through
 * (contrast 1). Dark stones keep the photo as-is; light stones (pale marble etc.)
 * get a small negative brightness so the engraving reads a touch darker against the
 * bright slab instead of washing out.
 */
const PHOTO_DARK: PhotoEngravingProfile = { brightness: 0, contrast: 1, blend: 0.08 };
const PHOTO_LIGHT: PhotoEngravingProfile = { brightness: -0.1, contrast: 1, blend: 0.08 };

export const getPhotoEngravingProfile = (
  materialName: string | undefined
): PhotoEngravingProfile => (isDarkStone(materialName) ? PHOTO_DARK : PHOTO_LIGHT);

/** Scene + material tuning so each stone reads clearly in the 3D viewer. */
export type StonePresentationProfile = {
  sceneBackground: string;
  environmentIntensity: number;
  exposure: number;
  stoneContrast: number;
  albedoSaturation: number;
  albedoDarken: number;
  rimLightIntensity: number;
};

const AFRICA_PRESENTATION: StonePresentationProfile = {
  /** Dark brown backdrop, shared across stones. */
  sceneBackground: '#2b211a',
  environmentIntensity: 0.15,
  exposure: 0.98,
  stoneContrast: 1.34,
  albedoSaturation: 1.28,
  albedoDarken: 0.78,
  rimLightIntensity: 1.25
};

const DARK_STONE_PRESENTATION: StonePresentationProfile = {
  sceneBackground: '#2b211a',
  environmentIntensity: 0.38,
  exposure: 1.12,
  stoneContrast: 1.16,
  albedoSaturation: 1.06,
  albedoDarken: 0.94,
  rimLightIntensity: 0.45
};

const LIGHT_STONE_PRESENTATION: StonePresentationProfile = {
  sceneBackground: '#2b211a',
  // Pale stone (marble, Silk, Tiffany) reads clearly light but is pulled well back
  // from the blown-out near-white it started at: lower exposure and environment
  // plus a firmer albedo darken keep visible tone and grain.
  environmentIntensity: 0.62,
  exposure: 0.96,
  stoneContrast: 1.08,
  albedoSaturation: 1,
  albedoDarken: 0.72,
  rimLightIntensity: 0
};

export const getStonePresentationProfile = (
  materialName: string | undefined
): StonePresentationProfile => {
  if (canonicalMaterialName(materialName) === 'Africa Granite') return AFRICA_PRESENTATION;
  if (isDarkStone(materialName)) return DARK_STONE_PRESENTATION;
  return LIGHT_STONE_PRESENTATION;
};

/** Grade albedo in the stone shader — contrast, saturation, slight darken. */
export const applyStoneAlbedoGrade = (
  mat: THREE.MeshPhysicalMaterial,
  contrast: number,
  saturation: number,
  darken: number
) => {
  if (
    Math.abs(contrast - 1) < 0.001 &&
    Math.abs(saturation - 1) < 0.001 &&
    Math.abs(darken - 1) < 0.001
  ) {
    return;
  }
  const c = contrast.toFixed(3);
  const s = saturation.toFixed(3);
  const d = darken.toFixed(3);
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
          {
            float _l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float _target = mix(0.35, _l, ${c});
            diffuseColor.rgb *= _target / max(_l, 0.001);
            diffuseColor.rgb = mix(vec3(_l), diffuseColor.rgb, ${s});
            diffuseColor.rgb *= ${d};
          }`
    );
  };
};

/** Figured / veined slabs look wrong when tiled. */
const SEAMLESS_MATERIALS = new Set([
  'Marble',
  'Silk Granite',
  'Amadeus Granite',
  'Juparana Granite',
  'Aurora Granite',
  'Tiffany Granite',
  'Labradorite Granite'
]);

export const isDarkStone = (materialName: string | undefined) =>
  DARK_STONE_MATERIALS.has(canonicalMaterialName(materialName));

export const isSeamlessStone = (materialName: string | undefined) =>
  SEAMLESS_MATERIALS.has(canonicalMaterialName(materialName));

/** Maps a finish type to the PBR surface parameters used by MeshPhysicalMaterial. */
export const finishToSurface = (finish: FinishType) => {
  switch (finish) {
    case 'Polished':
      return {
        roughness: 0.04,
        metalness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.45
      };
    case 'Honed':
      return {
        roughness: 0.42,
        metalness: 0.08,
        clearcoat: 0.2,
        clearcoatRoughness: 0.36,
        envMapIntensity: 0.72
      };
    case 'Matte':
    default:
      return {
        roughness: 0.92,
        metalness: 0.02,
        clearcoat: 0,
        clearcoatRoughness: 1,
        envMapIntensity: 0.32
      };
  }
};
