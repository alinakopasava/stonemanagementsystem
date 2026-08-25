/** Canonical English names stored in `materials.name`. Keep these stable. */
import * as THREE from 'three';

export const MATERIAL_IMAGE_BY_NAME: Record<string, string> = {
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
  'Tiffany Granite': '/images/materials/tiffany.jpg',
  /** Legacy DB names from the previous 4-stone catalog. */
  'Black Granite': '/images/materials/gabbro-diabase.jpg',
  'Grey Granite': '/images/materials/gandhi.jpg',
  'Labradorite Blue': '/images/materials/labradorite.jpg'
};

export const DEFAULT_MATERIAL_IMAGE = MATERIAL_IMAGE_BY_NAME['Gabbro-Diabase'];

/** Dark stones (avg luma < ~0.42): used for photo-engraving polarity seeding. */
const DARK_STONE_MATERIALS = new Set([
  'Gabbro-Diabase',
  'Labradorite Granite',
  'Amadeus Granite',
  'Maslovsky Granite',
  'Africa Granite',
  'Aurora Granite',
  'Baltic Granite',
  'Leznikovsky Granite',
  'Black Granite',
  'Labradorite Blue'
]);

export type InscriptionColors = {
  fill: string;
  outline: string;
  metalness: number;
  roughness: number;
  /** Optional self-illumination so light fills read as true white on dark/red stone. */
  emissive?: string;
  emissiveIntensity?: number;
};

export type StoneTextureStats = {
  meanLuma: number;
  /** Share of pixels brighter than ~65 % — white veins, light specks. */
  brightFraction: number;
  /** Share of pixels darker than ~25 % — black grains, dark veins. */
  darkFraction: number;
  p90Luma: number;
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
    for (let i = 0; i < data.length; i += 4) {
      lumas.push(lumaFromRgb(data[i], data[i + 1], data[i + 2]));
    }
    if (lumas.length === 0) return null;
    lumas.sort((a, b) => a - b);
    const n = lumas.length;
    const meanLuma = lumas.reduce((sum, value) => sum + value, 0) / n;
    const brightFraction = lumas.filter((value) => value > 0.65).length / n;
    const darkFraction = lumas.filter((value) => value < 0.25).length / n;
    const p90Luma = lumas[Math.min(n - 1, Math.floor(n * 0.9))];
    return { meanLuma, brightFraction, darkFraction, p90Luma };
  } catch {
    return null;
  }
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
  'Black Granite': {
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
  'Labradorite Blue': {
    fill: '#e0b85a',
    outline: '#071018',
    metalness: 0.54,
    roughness: 0.28,
    emissive: '#c4a04a',
    emissiveIntensity: 0.2
  },
  /** Mostly black with thick white veins — ivory fill, dark outline on the veins. */
  'Amadeus Granite': {
    fill: '#f3efe6',
    outline: '#12100c',
    metalness: 0.08,
    roughness: 0.42,
    emissive: '#f3efe6',
    emissiveIntensity: 0.18
  },
  /** Dark forest green + black grains — warm ivory. */
  'Maslovsky Granite': {
    fill: '#f0e6cc',
    outline: '#0e1610',
    metalness: 0.06,
    roughness: 0.44,
    emissive: '#efe4c8',
    emissiveIntensity: 0.16
  },
  /** Saturated terracotta red — white so letters stay crisp. */
  'Africa Granite': {
    fill: '#ffffff',
    outline: '#1a0a08',
    metalness: 0,
    roughness: 0.5,
    emissive: '#ffffff',
    emissiveIntensity: 0.62
  },
  /** Black bands + terracotta — ivory (dark fill vanished on the black). */
  'Aurora Granite': {
    fill: '#f4eadc',
    outline: '#140c08',
    metalness: 0.08,
    roughness: 0.4,
    emissive: '#f0e4d4',
    emissiveIntensity: 0.16
  },
  /** Burnt orange + charcoal grains — warm cream. */
  'Baltic Granite': {
    fill: '#f6ebd8',
    outline: '#1a1008',
    metalness: 0.08,
    roughness: 0.4,
    emissive: '#f2e4cc',
    emissiveIntensity: 0.14
  },
  /** Mid-dark brick red — cool ivory. */
  'Leznikovsky Granite': {
    fill: '#f5ece6',
    outline: '#1c0c0c',
    metalness: 0.06,
    roughness: 0.42,
    emissive: '#f2e8e2',
    emissiveIntensity: 0.18
  },
  /** Light-mid salt-and-pepper grey — charcoal. */
  'Gandhi Granite': {
    fill: '#161410',
    outline: '#eeeae4',
    metalness: 0.06,
    roughness: 0.46
  },
  'Grey Granite': {
    fill: '#161410',
    outline: '#eeeae4',
    metalness: 0.06,
    roughness: 0.46
  },
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
  /** Salmon-pink field + black veins — espresso. */
  'Juparana Granite': {
    fill: '#1c100c',
    outline: '#faf4ee',
    metalness: 0.08,
    roughness: 0.42
  },
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
  if (materialName && INSCRIPTION_BY_MATERIAL[materialName]) {
    return INSCRIPTION_BY_MATERIAL[materialName];
  }
  if (stats) return pickInscriptionColorsFromStats(stats);
  return isDarkStone(materialName) ? WARM_GOLD_ON_DARK : DARK_ON_LIGHT;
};

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
  /** Cool slate — complementary to warm red-brown granite. */
  sceneBackground: '#75808c',
  environmentIntensity: 0.15,
  exposure: 0.98,
  stoneContrast: 1.34,
  albedoSaturation: 1.28,
  albedoDarken: 0.78,
  rimLightIntensity: 1.25
};

const DARK_STONE_PRESENTATION: StonePresentationProfile = {
  sceneBackground: '#b8aea4',
  environmentIntensity: 0.38,
  exposure: 1.12,
  stoneContrast: 1.16,
  albedoSaturation: 1.06,
  albedoDarken: 0.94,
  rimLightIntensity: 0.45
};

const LIGHT_STONE_PRESENTATION: StonePresentationProfile = {
  sceneBackground: '#eceae8',
  environmentIntensity: 1,
  exposure: 1.25,
  stoneContrast: 1,
  albedoSaturation: 1,
  albedoDarken: 1,
  rimLightIntensity: 0
};

export const getStonePresentationProfile = (
  materialName: string | undefined
): StonePresentationProfile => {
  if (materialName === 'Africa Granite') return AFRICA_PRESENTATION;
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
  'Labradorite Granite',
  'Labradorite Blue'
]);

export const isDarkStone = (materialName: string | undefined) =>
  Boolean(materialName && DARK_STONE_MATERIALS.has(materialName));

export const isSeamlessStone = (materialName: string | undefined) =>
  Boolean(materialName && SEAMLESS_MATERIALS.has(materialName));
