import * as THREE from 'three';

/**
 * Deterministic procedural stone textures. We generate them on a 2D canvas
 * so the 3D viewer always has a believable material even when the original
 * texture image fails to load.
 */

export type StonePalette = {
  base: string;
  speckle: string[];
  vein?: string;
  veinDensity?: number;
  grain?: 'fine' | 'coarse' | 'marble';
};

const PALETTES: Record<string, StonePalette> = {
  'Gabbro-Diabase': {
    base: '#1f2024',
    speckle: ['#3a3d44', '#6b6f78', '#a9adb6', '#0c0d10'],
    grain: 'coarse'
  },
  'Gandhi Granite': {
    base: '#4a5560',
    speckle: ['#2b333c', '#7a8694', '#c5cdd6', '#1a1e24'],
    grain: 'coarse'
  },
  'Labradorite Granite': {
    base: '#2b3a4a',
    speckle: ['#1a2331', '#5b7da3', '#86b6e6', '#cfe5ff'],
    grain: 'coarse'
  },
  Marble: {
    base: '#ece8df',
    speckle: ['#d8d2c4', '#f5f1e6'],
    vein: '#7a716a',
    veinDensity: 0.6,
    grain: 'marble'
  },
  'Africa Granite': {
    base: '#8a3d2a',
    speckle: ['#2a1a14', '#c46a48', '#e0a07a', '#1a0e0a'],
    grain: 'coarse'
  },
  'Amadeus Granite': {
    base: '#1c1d22',
    speckle: ['#3a3d44', '#d8dce3'],
    vein: '#e8eaee',
    veinDensity: 0.45,
    grain: 'marble'
  },
  'Aurora Granite': {
    base: '#8b3a28',
    speckle: ['#1a1210', '#c45c38', '#e8c4a0'],
    vein: '#1a1210',
    veinDensity: 0.5,
    grain: 'coarse'
  },
  'Baltic Granite': {
    base: '#8a5a3a',
    speckle: ['#1f1612', '#c48a58', '#e2c4a0', '#3a2418'],
    grain: 'coarse'
  },
  'Juparana Granite': {
    base: '#d4a080',
    speckle: ['#2a2420', '#f0d4c0', '#8a7060'],
    vein: '#2a2420',
    veinDensity: 0.4,
    grain: 'marble'
  },
  'Leznikovsky Granite': {
    base: '#b85a62',
    speckle: ['#2a1818', '#e8a8a8', '#f5d0d0', '#1a1010'],
    grain: 'coarse'
  },
  'Maslovsky Granite': {
    base: '#3d5a3a',
    speckle: ['#1a2418', '#7a9a68', '#c5d8b0', '#0e140c'],
    grain: 'coarse'
  },
  'Silk Granite': {
    base: '#c8c4bc',
    speckle: ['#e8e4dc', '#9a9690'],
    vein: '#8a8680',
    veinDensity: 0.45,
    grain: 'marble'
  },
  'Tiffany Granite': {
    base: '#4a8a82',
    speckle: ['#e8ece8', '#2a3a38', '#c45a28'],
    vein: '#d8dcd8',
    veinDensity: 0.35,
    grain: 'coarse'
  },
  'Black Granite': {
    base: '#1f2024',
    speckle: ['#3a3d44', '#6b6f78', '#a9adb6', '#0c0d10'],
    grain: 'coarse'
  },
  'Grey Granite': {
    base: '#8c8f93',
    speckle: ['#5e6166', '#b8bbc0', '#d6d8db', '#3c3e42'],
    grain: 'coarse'
  },
  'Labradorite Blue': {
    base: '#2b3a4a',
    speckle: ['#1a2331', '#5b7da3', '#86b6e6', '#cfe5ff'],
    grain: 'coarse'
  }
};

const DEFAULT_PALETTE: StonePalette = PALETTES['Gabbro-Diabase'];

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const mulberry32 = (seed: number) => {
  let state = seed || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const drawSpeckles = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: StonePalette,
  rand: () => number
) => {
  // Lower density + lighter opacity = cleaner, more uniform slab (less “busy” noise).
  const density =
    { coarse: 3800, fine: 2400, marble: 900 }[palette.grain ?? 'coarse'] ?? 3800;
  for (let i = 0; i < density; i += 1) {
    const x = rand() * width;
    const y = rand() * height;
    const size =
      palette.grain === 'coarse'
        ? rand() * 1.05 + 0.25
        : palette.grain === 'fine'
          ? rand() * 0.75 + 0.15
          : rand() * 0.55 + 0.12;
    const color = palette.speckle[Math.floor(rand() * palette.speckle.length)];
    ctx.fillStyle = color;
    ctx.globalAlpha =
      palette.grain === 'marble' ? 0.08 + rand() * 0.12 : 0.1 + rand() * 0.22;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

const drawVeins = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: StonePalette,
  rand: () => number
) => {
  if (!palette.vein) return;
  const veins = Math.floor((palette.veinDensity ?? 0.4) * 10);
  for (let i = 0; i < veins; i += 1) {
    ctx.strokeStyle = palette.vein;
    ctx.globalAlpha = 0.06 + rand() * 0.12;
    ctx.lineWidth = 0.45 + rand() * 1.1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let x = rand() * width;
    let y = rand() * height;
    ctx.moveTo(x, y);
    const segments = 22 + Math.floor(rand() * 24);
    const dirX = (rand() - 0.5) * 5;
    const dirY = (rand() - 0.5) * 5;
    for (let s = 0; s < segments; s += 1) {
      x += dirX + (rand() - 0.5) * 9;
      y += dirY + (rand() - 0.5) * 9;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

const drawNoiseOverlay = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rand: () => number,
  grain: StonePalette['grain']
) => {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const amp = grain === 'marble' ? 9 : grain === 'fine' ? 7 : 8;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rand() - 0.5) * amp;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(image, 0, 0);
};

/** Very soft highlights so the slab doesn’t look flat; kept minimal for a clean polish. */
const drawPolishWash = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _base: string,
  rand: () => number
) => {
  ctx.globalCompositeOperation = 'soft-light';
  for (let b = 0; b < 3; b += 1) {
    const gy = rand() * height;
    const band = ctx.createLinearGradient(0, gy - 160, 0, gy + 160);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, `rgba(255,255,255,${0.02 + rand() * 0.03})`);
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.globalCompositeOperation = 'source-over';
};

const cache = new Map<string, THREE.CanvasTexture>();

/** Bump when procedural art changes so cached CanvasTextures are regenerated. */
const TEXTURE_REVISION = '2026-05-clean';

export const buildStoneTexture = (materialName?: string): THREE.CanvasTexture => {
  const key = materialName ?? 'default';
  const cacheKey = `${key}@${TEXTURE_REVISION}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  if (typeof document === 'undefined') {
    const placeholder = { width: 1, height: 1 } as unknown as HTMLCanvasElement;
    return new THREE.CanvasTexture(placeholder);
  }

  const palette = PALETTES[materialName ?? ''] ?? DEFAULT_PALETTE;
  const width = 512;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const rand = mulberry32(hashString(key) || 1);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, palette.base);
  gradient.addColorStop(0.5, shade(palette.base, 4));
  gradient.addColorStop(1, shade(palette.base, -5));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawSpeckles(ctx, width, height, palette, rand);
  drawVeins(ctx, width, height, palette, rand);
  drawNoiseOverlay(ctx, width, height, rand, palette.grain);
  drawPolishWash(ctx, width, height, palette.base, rand);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  cache.set(cacheKey, texture);
  return texture;
};

const shade = (hex: string, percent: number) => {
  const value = hex.replace('#', '');
  const num = parseInt(value, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + percent));
  const b = Math.max(0, Math.min(255, (num & 0xff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};
