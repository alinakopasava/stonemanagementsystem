import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Text, useGLTF, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Object3D } from 'three';
import type { FinishType } from '@domain/entities/order-card';
import {
  DEFAULT_INSCRIPTION_STYLE,
  baseCharWidth,
  wordAwareLineCount,
  type BaseDimensionsCm,
  type InscriptionStyleHints,
  type MonumentDecoration,
  type MonumentDimensionsCm,
  type TombstoneSlabVariant
} from './monument-model';
import { useStoneAlbedoTexture } from './use-stone-albedo-texture';
import { usePhotoTexture, type PhotoCrop } from './use-photo-texture';
import {
  applyStoneAlbedoGrade,
  finishToSurface,
  getInscriptionColors,
  getStonePresentationProfile,
  isDarkStone,
  sampleStoneTextureStats,
  type StoneTextureStats
} from './stone-catalog';
import { getPhotoAspectRatio } from './photo-crop';
import { createNaturalEngravedPhotoMaterial } from './engraved-photo-material';

const CLASSIC_MODEL_URL = '/models/classic-monument.glb';
export const ROUNDED_MODEL_URL = '/models/rounded-monument.glb';
export const STELE_MODEL_URL = '/models/modern-stele-monument.glb';

/** Native headstone width in the Blender GLB. The slab scales non-uniformly to
 * the chosen size; overlays (text, photo, cross) stay in world space so letters
 * are not squashed when width and height change independently. */
const SOURCE_HEADSTONE_WIDTH_M = 0.679;

const NON_STONE_NAME = /medalion|napis|imie|daty|ziemia|punkt|text/i;
const LETTER_NAME = /napis|imie|daty|text/i;
const FLOWERBED_NAME = /ziemia/i;
const SLAB_NAME = /plyta_(?:klasyczna|polokragla)/i;
const BAKED_PEDESTAL_NAME = /cokol|stopien|plyta_pozioma|donica/i;

/** Tiny render clearance above the polished face. At 0.6 mm it prevents the opaque
 * stone from hiding the engraving without creating a visible side-view gap. */
const ENGRAVE_SURFACE_OFFSET = 0.0006;
/** Engraved portrait — aspect matches `portrait` photo texture (1 : 1.25). */
const ENGRAVED_PHOTO_HEIGHT = 0.44;
const ENGRAVED_PHOTO = {
  position: [0, 0.98, 0] as const,
  width: ENGRAVED_PHOTO_HEIGHT * getPhotoAspectRatio('portrait'),
  height: ENGRAVED_PHOTO_HEIGHT
};

const TEXT_LINE_HEIGHT = 1.15;
/** Rest pose of Blender letter empties (Napis / Imię / Daty) in the GLB. */
const BAKED_INSCRIPTION_Y = 0.91;
const BAKED_NAME_Y = 0.72;
const BAKED_DATES_Y = 0.53;
const TEXT_BLOCK_GAP = 0.028;

/** Photo above stone face; live text sits above baked meshes. */
const RENDER_ORDER_PHOTO = 3;

/** Panel sits on the stone, behind both the photo and the text. */
const RENDER_ORDER_TEXT_PANEL = 1;
const RENDER_ORDER_TEXT = 5;

interface ClassicMonumentModelProps {
  modelUrl?: string;
  dimensions: MonumentDimensionsCm;
  textureUrl?: string;
  materialName?: string;
  finish: FinishType;
  baseDimensions?: BaseDimensionsCm;
  decoration?: MonumentDecoration;
  photoUrl?: string;
  photoCrop?: PhotoCrop;
  photoBrightness?: number;
  photoContrast?: number;
  photoBlend?: number;
  inscription?: string;
  name?: string;
  dates?: string;
  inscriptionStyle?: InscriptionStyleHints;
  showCross?: boolean;
  showFlowerbed?: boolean;
  tombstoneSlab?: TombstoneSlabVariant;
  slabThicknessCm?: number;
}

const isMesh = (object: Object3D): object is THREE.Mesh =>
  'isMesh' in object && (object as THREE.Mesh).isMesh === true;

const isStoneMesh = (mesh: THREE.Mesh) => !NON_STONE_NAME.test(mesh.name);
const isLetterMesh = (mesh: THREE.Mesh) => LETTER_NAME.test(mesh.name);

const countTextLines = (text: string, fontSize: number, charFactor: number, maxWidth: number) => {
  if (!text || fontSize <= 0) return 0;
  const charsPerLine = Math.max(1, Math.floor(maxWidth / (fontSize * charFactor)));
  return wordAwareLineCount(text, charsPerLine);
};

/** Parts of the medallion baked into the Blender model: the photo recess and the
 *  ring around it. The catalogue no longer sells a medallion and the portrait is
 *  etched onto the polished face, so both stay hidden whatever is ordered. */
const isBakedMedallionMesh = (mesh: THREE.Mesh) => /medalion/i.test(mesh.name);
const isFlowerbedMesh = (mesh: THREE.Mesh) => FLOWERBED_NAME.test(mesh.name);

/** Front face of the arched slab in model space (+Z toward the viewer). */
const getStoneFaceZ = (root: Object3D) => {
  let faceZ = 0.045;
  root.traverse((child) => {
    if (!isMesh(child) || !SLAB_NAME.test(child.name)) return;
    child.updateWorldMatrix(true, false);
    faceZ = new THREE.Box3().setFromObject(child).max.z;
  });
  return faceZ;
};

/** Vertical resolution of the silhouette profile below. */
const SLAB_PROFILE_BANDS = 48;

type SlabProfile = {
  minY: number;
  maxY: number;
  /** Left and right edge of the slab per height band, bottom to top. */
  bands: { minX: number; maxX: number }[];
};

/**
 * The slab's real left and right edge at every height, taken from its own
 * vertices instead of its bounding box.
 *
 * The modern stele is asymmetric and its sides curve inward, so a plaque sized
 * from the bounding box hangs off the stone lower down, where the silhouette
 * has already pulled in. Only the outline itself can say how much room there
 * actually is.
 */
const getSlabProfile = (root: Object3D): SlabProfile | null => {
  const box = getSlabBox(root);
  if (!box) return null;
  const minY = box.min.y;
  const span = box.max.y - minY;
  if (!(span > 0)) return null;

  const bands = Array.from({ length: SLAB_PROFILE_BANDS }, () => ({
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY
  }));

  /*
   * Cut the outline at each band's height rather than bucketing vertices into
   * it. A straight edge carries vertices only at its two ends, so bucketing
   * leaves the bands in between with nothing from that side of the stone and
   * reports a width that is not merely wrong but can come out inverted.
   */
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const cutEdge = (yLevel: number, index: number) => {
    if ((a.y - yLevel) * (b.y - yLevel) > 0 || a.y === b.y) return;
    const x = a.x + ((b.x - a.x) * (yLevel - a.y)) / (b.y - a.y);
    const band = bands[index];
    if (x < band.minX) band.minX = x;
    if (x > band.maxX) band.maxX = x;
  };

  root.traverse((child) => {
    if (!isMesh(child) || !SLAB_NAME.test(child.name)) return;
    child.updateWorldMatrix(true, false);
    const position = child.geometry.getAttribute('position');
    if (!position) return;
    const index = child.geometry.getIndex();
    const cornerCount = index ? index.count : position.count;
    const cornerAt = (i: number) => (index ? index.getX(i) : i);

    for (let i = 0; i + 2 < cornerCount; i += 3) {
      for (let edge = 0; edge < 3; edge += 1) {
        a.fromBufferAttribute(position as THREE.BufferAttribute, cornerAt(i + edge));
        b.fromBufferAttribute(position as THREE.BufferAttribute, cornerAt(i + ((edge + 1) % 3)));
        a.applyMatrix4(child.matrixWorld);
        b.applyMatrix4(child.matrixWorld);
        const from = Math.min(a.y, b.y);
        const to = Math.max(a.y, b.y);
        const firstBand = Math.max(0, Math.floor(((from - minY) / span) * SLAB_PROFILE_BANDS));
        const lastBand = Math.min(
          SLAB_PROFILE_BANDS - 1,
          Math.floor(((to - minY) / span) * SLAB_PROFILE_BANDS)
        );
        for (let band = firstBand; band <= lastBand; band += 1) {
          cutEdge(minY + ((band + 0.5) * span) / SLAB_PROFILE_BANDS, band);
        }
      }
    }
  });

  return { minY, maxY: box.max.y, bands };
};

/**
 * Half-width that stays inside the silhouette over a range of heights, measured
 * from the centre line the plaque is built on. Null when the slab could not be
 * sampled, which leaves the caller on its bounding-box figure.
 */
const slabHalfWidthBetween = (profile: SlabProfile, yFrom: number, yTo: number) => {
  const span = profile.maxY - profile.minY;
  const bandAt = (y: number) =>
    Math.min(
      SLAB_PROFILE_BANDS - 1,
      Math.max(0, Math.floor(((y - profile.minY) / span) * SLAB_PROFILE_BANDS))
    );
  const from = bandAt(Math.min(yFrom, yTo));
  const to = bandAt(Math.max(yFrom, yTo));

  let half = Number.POSITIVE_INFINITY;
  for (let i = from; i <= to; i += 1) {
    const band = profile.bands[i];
    if (!Number.isFinite(band.minX) || !Number.isFinite(band.maxX)) continue;
    half = Math.min(half, Math.min(-band.minX, band.maxX));
  }
  // A measurement that comes back non-positive means the sampling missed, and
  // the caller is better off with its bounding-box figure than with a plaque
  // collapsed to nothing.
  return Number.isFinite(half) && half > 0 ? half : null;
};

const getSlabBox = (root: Object3D) => {
  const box = new THREE.Box3();
  let found = false;
  root.traverse((child) => {
    if (!isMesh(child) || !SLAB_NAME.test(child.name)) return;
    child.updateWorldMatrix(true, false);
    box.expandByObject(child);
    found = true;
  });
  return found && Number.isFinite(box.min.y) ? box : null;
};

export const ClassicMonumentModel = ({
  modelUrl = CLASSIC_MODEL_URL,
  dimensions,
  textureUrl,
  materialName,
  finish,
  baseDimensions = { heightCm: 20, widthCm: 60, depthCm: 15 },
  decoration = 'none',
  photoUrl,
  photoCrop,
  photoBrightness = 0,
  photoContrast = 1.3,
  photoBlend = 0.08,
  inscription = '',
  name = '',
  dates = '',
  inscriptionStyle = DEFAULT_INSCRIPTION_STYLE,
  showCross = false,
  showFlowerbed = true,
  tombstoneSlab = 'full',
  slabThicknessCm = 5
}: ClassicMonumentModelProps) => {
  const invalidate = useThree((state) => state.invalidate);
  const { scene } = useGLTF(modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);
  const stoneFaceZ = useMemo(() => getStoneFaceZ(model), [model]);
  const slabBox = useMemo(() => getSlabBox(model), [model]);
  const slabProfile = useMemo(() => getSlabProfile(model), [model]);
  const slabWidth = slabBox ? slabBox.max.x - slabBox.min.x : SOURCE_HEADSTONE_WIDTH_M;
  const slabHeight = slabBox ? slabBox.max.y - slabBox.min.y : 1.15;
  const slabDepth = slabBox ? Math.max(0.04, slabBox.max.z - slabBox.min.z) : 0.08;
  const slabMinY = slabBox ? slabBox.min.y : 0.32;
  const headstoneTopY = slabBox ? slabBox.max.y : 1.58;
  const engravedPhotoZ = stoneFaceZ + ENGRAVE_SURFACE_OFFSET;
  const albedoMap = useStoneAlbedoTexture(textureUrl, materialName);
  const showEngravedPhoto = decoration === 'portrait';
  const showFaceCross = decoration === 'cross';
  const stoneSurface = finishToSurface(finish);
  const darkStone = isDarkStone(materialName);
  const [stoneLuma, setStoneLuma] = useState(darkStone ? 0.08 : 0.6);
  const [stoneTextureStats, setStoneTextureStats] = useState<StoneTextureStats | undefined>();

  const uploadedPhoto = usePhotoTexture(photoUrl, 'portrait', photoCrop);

  useEffect(() => {
    const img = albedoMap.image as CanvasImageSource | undefined;
    if (!img) return;
    const stats = sampleStoneTextureStats(img);
    if (stats) {
      setStoneLuma(Math.min(1, Math.max(0, stats.meanLuma)));
      setStoneTextureStats(stats);
      return;
    }
    setStoneLuma(darkStone ? 0.08 : 0.6);
    setStoneTextureStats(undefined);
  }, [albedoMap, darkStone]);

  const stoneRepeat = useMemo(() => new THREE.Vector2(1.6, 1.6), []);

  /** Neutral grey granite used for the inscription plaque — a real stone image so
   *  it reads as stone, not a flat colour. */
  const panelStoneTex = useTexture('/images/materials/gandhi.jpg');

  const engravedPhotoMaterial = useMemo(() => {
    if (!showEngravedPhoto || !uploadedPhoto) return null;
    return createNaturalEngravedPhotoMaterial({
      photoMap: uploadedPhoto,
      stoneMap: albedoMap,
      stoneRepeat,
      stoneLuma,
      photoBrightness,
      photoContrast,
      photoBlend
    });
  }, [
    showEngravedPhoto,
    uploadedPhoto,
    albedoMap,
    stoneRepeat,
    stoneLuma,
    stoneSurface.roughness,
    photoBrightness,
    photoContrast,
    photoBlend
  ]);

  const inscriptionColors = getInscriptionColors(materialName, stoneTextureStats);

  const stoneMaterial = useMemo(() => {
    const surface = finishToSurface(finish);
    const pres = getStonePresentationProfile(materialName);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: albedoMap,
      roughness: surface.roughness,
      metalness: surface.metalness,
      clearcoat: surface.clearcoat,
      clearcoatRoughness: surface.clearcoatRoughness,
      envMapIntensity: surface.envMapIntensity
    });
    applyStoneAlbedoGrade(mat, pres.stoneContrast, pres.albedoSaturation, pres.albedoDarken);
    return mat;
  }, [albedoMap, finish, materialName]);

  /** Engraved cross on the face: a flat incised mark, not a granite-on-granite
   *  relief (which is invisible and z-fights the slab). Unlit and toned against
   *  the stone — frosted light on dark granite, dark cut into pale stone — so it
   *  reads clearly on any material, matching the portrait engraving. */
  const faceCrossMaterial = useMemo(() => {
    const tone = stoneLuma < 0.45 ? 0.66 : 0.12;
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(tone, tone, tone),
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
  }, [stoneLuma]);

  useEffect(() => () => stoneMaterial.dispose(), [stoneMaterial]);
  useEffect(() => () => engravedPhotoMaterial?.dispose(), [engravedPhotoMaterial]);
  useEffect(() => () => faceCrossMaterial.dispose(), [faceCrossMaterial]);

  useEffect(() => {
    invalidate();
  }, [
    invalidate,
    uploadedPhoto,
    stoneMaterial,
    engravedPhotoMaterial,
    inscription,
    name,
    dates,
    finish,
    dimensions,
    baseDimensions
  ]);

  useLayoutEffect(() => {
    albedoMap.wrapS = THREE.RepeatWrapping;
    albedoMap.wrapT = THREE.RepeatWrapping;
    albedoMap.repeat.set(1.6, 1.6);
    albedoMap.needsUpdate = true;

    model.traverse((child: Object3D) => {
      if (!isMesh(child)) return;

      if (isFlowerbedMesh(child) || BAKED_PEDESTAL_NAME.test(child.name)) {
        child.visible = false;
        return;
      }

      if (isBakedMedallionMesh(child)) {
        child.visible = false;
        return;
      }

      if (isLetterMesh(child)) {
        /** Live troika text replaces baked Blender glyphs. */
        child.visible = false;
        return;
      }
      if (isStoneMesh(child)) {
        child.material = stoneMaterial;
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });
  }, [model, stoneMaterial, albedoMap]);

  const scaleX = dimensions.widthCm / 100 / slabWidth;
  const scaleY = dimensions.heightCm / 100 / slabHeight;
  const scaleZ = dimensions.thicknessCm / 100 / slabDepth;
  const worldWidth = dimensions.widthCm / 100;
  // Plaque width (computed early so the inscription can be held inside it).
  const panelEnabled = Boolean(inscriptionColors.textPanel);
  // A touch larger lettering, only on the plaque-with-portrait layout.
  const panelPhoto = panelEnabled && showEngravedPhoto && Boolean(engravedPhotoMaterial);
  const textSizeBoost = panelPhoto ? 1.4 : 1;
  const panelMarginX = Math.max(0.05, worldWidth * 0.16);
  const panelHalfW = Math.max(0.05, worldWidth / 2 - panelMarginX);
  const worldTextMaxWidth = panelEnabled
    ? Math.min(worldWidth * 0.78, panelHalfW * 2 * 0.86)
    : worldWidth * 0.78;
  /** Letters follow the tighter axis so a 50 cm stele does not keep 60 cm type. */
  const textScale = Math.min(scaleX, scaleY);
  const blockGap = TEXT_BLOCK_GAP * textScale;

  const transformText = (value: string) =>
    inscriptionStyle.transform === 'uppercase' ? value.toUpperCase() : value;

  const inscriptionTrimmed = transformText(inscription.trim());
  const nameTrimmed = transformText(name.trim());
  const datesTrimmed = dates.trim();

  const charFactor =
    baseCharWidth(`${inscriptionTrimmed}${nameTrimmed}`) + inscriptionStyle.letterSpacing * 0.9;
  const autoFit = (text: string, desired: number) => {
    if (!text) return desired;
    const longest = text.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 1);
    return Math.min(desired, worldTextMaxWidth / (longest * charFactor));
  };

  const fontScale = inscriptionStyle.fontScale ?? 1;
  const headerSize = autoFit(inscriptionTrimmed, 0.042 * textScale * fontScale * textSizeBoost);
  const nameSize = autoFit(nameTrimmed, 0.055 * textScale * fontScale * textSizeBoost);
  const datesSize = autoFit(datesTrimmed, 0.038 * textScale * fontScale * textSizeBoost);
  const headerHeight =
    countTextLines(inscriptionTrimmed, headerSize, charFactor, worldTextMaxWidth) *
    headerSize *
    TEXT_LINE_HEIGHT;
  const nameHeight =
    countTextLines(nameTrimmed, nameSize, charFactor, worldTextMaxWidth) *
    nameSize *
    TEXT_LINE_HEIGHT;
  const datesHeight =
    countTextLines(datesTrimmed, datesSize, charFactor, worldTextMaxWidth) *
    datesSize *
    TEXT_LINE_HEIGHT;

  const occupiesUpperBand = showEngravedPhoto || showFaceCross;

  const slots = [
    inscriptionTrimmed
      ? { y: BAKED_INSCRIPTION_Y * scaleY, h: headerHeight, key: 'header' as const }
      : null,
    nameTrimmed ? { y: BAKED_NAME_Y * scaleY, h: nameHeight, key: 'name' as const } : null,
    datesTrimmed ? { y: BAKED_DATES_Y * scaleY, h: datesHeight, key: 'dates' as const } : null
  ].filter(
    (slot): slot is { y: number; h: number; key: 'header' | 'name' | 'dates' } => slot !== null
  );

  const packFromCeiling = (ceiling: number) => {
    let cursor = ceiling;
    for (const slot of slots) {
      slot.y = cursor - slot.h / 2;
      cursor -= slot.h + blockGap;
    }
  };

  let photoW = ENGRAVED_PHOTO.width * scaleY;
  let photoH = ENGRAVED_PHOTO.height * scaleY;
  const photoWidthCap = worldWidth * 0.6;
  if (photoW > photoWidthCap) {
    const fit = photoWidthCap / photoW;
    photoW *= fit;
    photoH *= fit;
  }
  // On the plaque, shrink the portrait a little so there is room for larger lettering.
  if (panelPhoto) {
    photoW *= 0.82;
    photoH *= 0.82;
  }
  // Plaque top anchored to where the inscription sits WITHOUT a photo (baked header
  // position + pad). The panel-without-photo layout is left exactly as it was; on the
  // panel-with-photo layout the portrait is lowered to that same line so the gap from
  // the slab top matches.
  const panelTopAnchor = BAKED_INSCRIPTION_Y * scaleY + headerHeight / 2 + 0.16 * scaleY;
  const contentHalfH = photoH / 2;
  const photoY = panelPhoto
    ? panelTopAnchor - 0.05 * scaleY - contentHalfH
    : ENGRAVED_PHOTO.position[1] * scaleY;

  let textFitScale = 1;
  if (occupiesUpperBand && slots.length > 0) {
    /** Catalog/designer portraits sit in the upper band — keep the live text
     * immediately under the photo, not down in the plinth where the compact
     * catalog camera crops it away. */
    const bandBottom = photoY - photoH / 2;
    const ceiling = bandBottom - 0.05 * scaleY;
    // Shrink the whole block if it would run past the lower face — a long, wrapped
    // inscription (e.g. Polish) must not push the dates off the slab.
    const floor = slabMinY * scaleY + 0.12 * scaleY;
    const blockHeight = slots.reduce((sum, s) => sum + s.h, 0) + blockGap * (slots.length - 1);
    const avail = ceiling - floor;
    if (blockHeight > avail && avail > 0.02) {
      textFitScale = avail / blockHeight;
      for (const s of slots) s.h *= textFitScale;
    }
    packFromCeiling(ceiling);
  } else {
    const linesOverlap = slots.some((slot, index) => {
      const next = slots[index + 1];
      if (!next) return false;
      return slot.y - slot.h / 2 < next.y + next.h / 2 + blockGap;
    });
    if (slots.length > 0 && linesOverlap) {
      const totalHeight =
        slots.reduce((sum, slot) => sum + slot.h, 0) + blockGap * (slots.length - 1);
      packFromCeiling(
        Math.min(
          BAKED_INSCRIPTION_Y * scaleY + 0.06 * scaleY,
          BAKED_NAME_Y * scaleY + totalHeight / 2
        )
      );
    }
  }

  const headerY = slots.find((slot) => slot.key === 'header')?.y ?? 0;
  const nameY = slots.find((slot) => slot.key === 'name')?.y ?? 0;
  const datesY = slots.find((slot) => slot.key === 'dates')?.y ?? 0;

  /** Backing panel: an inset copy of the headstone silhouette (arched top) so it
   *  repeats the monument's shape, big enough to hold the photo and the whole
   *  inscription. Busy stones only. */
  const hasUpperPhoto = showEngravedPhoto && Boolean(engravedPhotoMaterial);
  const slotsTop = slots.length ? Math.max(...slots.map((s) => s.y + s.h / 2)) : photoY;
  const slotsBottom = slots.length ? Math.min(...slots.map((s) => s.y - s.h / 2)) : photoY;
  const showTextPanel = panelEnabled && (slots.length > 0 || hasUpperPhoto);
  // No-photo panel keeps its original top (a fixed pad above its own content); the
  // photo panel uses the shared anchor so its top gap matches the no-photo one.
  /** Held inside the slab's own height as well: a long wrapped inscription used
   *  to drag the plaque's foot below the stone. */
  const panelFloorY = (slabMinY + 0.03) * scaleY;
  const panelCeilY = (headstoneTopY - 0.03) * scaleY;
  const panelTopY = Math.min(panelPhoto ? panelTopAnchor : slotsTop + 0.16 * scaleY, panelCeilY);
  const panelBottomY = Math.max(slotsBottom - 0.09 * scaleY, panelFloorY);
  const panelCenterY = (panelTopY + panelBottomY) / 2;
  const panelHalfH = Math.max(0.05, (panelTopY - panelBottomY) / 2);

  /*
   * Narrowed to the stone it is actually lying on.
   *
   * The width above comes from the bounding box, which on the modern stele is
   * set by the widest point of a curved silhouette. Lower down, where the
   * plaque's foot sits, the outline has already pulled in, and the plaque
   * (with its 1 cm rim) hung off the left edge of the stone. Measuring the
   * outline across the plaque's own span is the only thing that knows this.
   *
   * The text keeps the width it was wrapped to: the plaque carries a 14 %
   * reserve around the inscription, so a small trim comes out of that reserve
   * rather than out of the lettering.
   */
  const panelClearance = 0.012;
  const silhouetteHalfW = slabProfile
    ? slabHalfWidthBetween(slabProfile, panelBottomY / scaleY, panelTopY / scaleY)
    : null;
  const panelDrawHalfW =
    silhouetteHalfW === null
      ? panelHalfW
      : Math.max(
          Math.min(panelHalfW, worldTextMaxWidth / 2 + panelClearance),
          Math.min(panelHalfW, silhouetteHalfW * scaleX - panelClearance)
        );
  const panelArchH = Math.min(panelDrawHalfW * 1.0, panelHalfH * 0.6);

  const qPanel = (v: number) => Math.round(v * 200) / 200;
  const panelGeometry = useMemo(() => {
    const hw = panelDrawHalfW;
    const hh = panelHalfH;
    const shoulder = hh - panelArchH;
    const shape = new THREE.Shape();
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, shoulder);
    shape.quadraticCurveTo(hw, hh, 0, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, shoulder);
    shape.lineTo(-hw, -hh);
    const geom = new THREE.ShapeGeometry(shape, 22);
    // ShapeGeometry UVs are the raw vertex XY; normalise them across the shape and
    // tile so the stone texture reads at a believable grain.
    geom.computeBoundingBox();
    const bb = geom.boundingBox;
    if (bb) {
      const gw = bb.max.x - bb.min.x || 1;
      const gh = bb.max.y - bb.min.y || 1;
      const rep = 2.4;
      const uv = geom.attributes.uv;
      for (let i = 0; i < uv.count; i += 1) {
        uv.setXY(i, ((uv.getX(i) - bb.min.x) / gw) * rep, ((uv.getY(i) - bb.min.y) / gh) * rep);
      }
      uv.needsUpdate = true;
    }
    return geom;
  }, [qPanel(panelDrawHalfW), qPanel(panelHalfH), qPanel(panelArchH)]);
  useEffect(() => () => panelGeometry.dispose(), [panelGeometry]);

  // Plaque tint: an explicit per-stone colour when given, otherwise coordinated with
  // the slab's own average hue (muted, mid tone) so it belongs to the monument.
  const mc = stoneTextureStats?.meanColor;
  const panelColorOverride = inscriptionColors.panelColor;
  const panelTintKey = panelColorOverride
    ? panelColorOverride
    : mc
      ? `${mc.r.toFixed(2)}-${mc.g.toFixed(2)}-${mc.b.toFixed(2)}`
      : 'none';
  const makePanelTint = (lightness: number, satScale: number, satCap: number) => {
    const tint = new THREE.Color(0.5, 0.5, 0.5);
    if (panelColorOverride) {
      tint.set(panelColorOverride);
      return tint;
    }
    if (mc) tint.setRGB(mc.r, mc.g, mc.b);
    const hsl = { h: 0, s: 0, l: 0 };
    tint.getHSL(hsl);
    tint.setHSL(hsl.h, Math.min(hsl.s * satScale, satCap), lightness);
    return tint;
  };
  const panelFillMaterial = useMemo(() => {
    panelStoneTex.wrapS = THREE.RepeatWrapping;
    panelStoneTex.wrapT = THREE.RepeatWrapping;
    panelStoneTex.needsUpdate = true;
    return new THREE.MeshBasicMaterial({
      map: panelStoneTex,
      color: makePanelTint(0.6, 0.55, 0.32),
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      toneMapped: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelStoneTex, panelTintKey]);
  const panelFrameMaterial = useMemo(() => {
    const tint = makePanelTint(0.72, 0.5, 0.28);
    if (panelColorOverride) tint.offsetHSL(0, 0, 0.14);
    return new THREE.MeshBasicMaterial({
      color: tint,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      toneMapped: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelTintKey]);
  // The stone texture is shared via useTexture's cache — dispose only the materials.
  useEffect(
    () => () => {
      panelFillMaterial.dispose();
      panelFrameMaterial.dispose();
    },
    [panelFillMaterial, panelFrameMaterial]
  );
  const panelFrameScaleX = (panelDrawHalfW + 0.01) / panelDrawHalfW;
  const panelFrameScaleY = (panelHalfH + 0.01) / panelHalfH;

  const textZ = (stoneFaceZ + ENGRAVE_SURFACE_OFFSET) * scaleZ;
  const panelZ = (stoneFaceZ * scaleZ + (stoneFaceZ + ENGRAVE_SURFACE_OFFSET) * scaleZ) / 2;
  const photoZ = engravedPhotoZ * scaleZ;
  const outlineScale = inscriptionColors.outlineScale ?? 1;
  const outlineBlurFrac = inscriptionColors.outlineBlur ?? 0;
  const boldStrokeFrac = inscriptionColors.boldStroke ?? 0;
  const textGlow = inscriptionColors.glow ?? false;
  const commonTextProps = {
    color: inscriptionColors.fill,
    outlineColor: inscriptionColors.outline,
    /** A firm opposite-colour outline keeps lettering legible on veins and speckled granite. */
    outlineOpacity: inscriptionColors.outlineOpacity ?? 1,
    /** Faux-bold: a stroke in the fill colour thickens the glyphs with no border. */
    strokeColor: inscriptionColors.fill,
    anchorX: 'center' as const,
    anchorY: 'middle' as const,
    textAlign: 'center' as const,
    maxWidth: worldTextMaxWidth,
    letterSpacing: inscriptionStyle.letterSpacing,
    font: inscriptionStyle.fontUrl,
    renderOrder: RENDER_ORDER_TEXT,
    depthOffset: -4,
    frustumCulled: false
  };

  const baseWidthM = Math.max(0.2, baseDimensions.widthCm / 100);
  const baseHeightM = Math.max(0.06, baseDimensions.heightCm / 100);
  const baseDepthM = Math.max(0.08, baseDimensions.depthCm / 100);
  const hasTombstoneSlab = tombstoneSlab !== 'none';
  const tombstoneSlabHeightM = Math.max(0.03, slabThicknessCm / 100);
  const tombstoneSlabWidthM = Math.max(baseWidthM * 1.25, worldWidth * 1.5);
  const tombstoneSlabDepthM =
    tombstoneSlab === 'half'
      ? Math.max(baseDepthM * 1.15, slabDepth * scaleZ * 2.8)
      : Math.max(baseDepthM * 2, slabDepth * scaleZ * 5.5);
  const tombstoneSlabOffsetZ =
    tombstoneSlab === 'half' ? tombstoneSlabDepthM * 0.32 : tombstoneSlabDepthM * 0.18;
  const monumentOffsetY = hasTombstoneSlab ? tombstoneSlabHeightM : 0;
  const slabOffsetY = baseHeightM - slabMinY * scaleY;
  const flowerDepth = Math.max(0.12, baseDepthM * 0.7);
  const flowerHeight = Math.max(0.06, baseHeightM * 0.4);
  const flowerbedWidth = baseWidthM * 0.92;
  const flowerbedWall = Math.max(0.025, flowerDepth * 0.2);
  const flowerbedInnerWidth = Math.max(0.02, flowerbedWidth - flowerbedWall * 2.8);
  const flowerbedInnerDepth = Math.max(0.02, flowerDepth - flowerbedWall * 2);
  const faceCrossW = SOURCE_HEADSTONE_WIDTH_M * 0.34 * scaleY;
  const faceCrossH = faceCrossW * 1.7;
  const faceCrossBeam = faceCrossW * 0.26;
  const faceCrossDepth = 0.022;
  const standingCrossH = SOURCE_HEADSTONE_WIDTH_M * 0.32 * scaleY;

  return (
    <>
      {hasTombstoneSlab ? (
        <mesh
          position={[0, tombstoneSlabHeightM / 2, tombstoneSlabOffsetZ]}
          material={stoneMaterial}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[tombstoneSlabWidthM, tombstoneSlabHeightM, tombstoneSlabDepthM]} />
        </mesh>
      ) : null}
      <group position={[0, monumentOffsetY, 0]}>
        <mesh position={[0, baseHeightM / 2, 0]} material={stoneMaterial} castShadow receiveShadow>
          <boxGeometry args={[baseWidthM, baseHeightM, baseDepthM]} />
        </mesh>
        {showFlowerbed ? (
          <group position={[0, 0, baseDepthM / 2 + flowerDepth / 2]}>
            <mesh position={[0, 0.01, 0]} material={stoneMaterial} castShadow receiveShadow>
              <boxGeometry args={[flowerbedWidth, 0.02, flowerDepth]} />
            </mesh>
            <mesh
              position={[0, 0.02 + flowerHeight / 2, -flowerDepth / 2 + flowerbedWall / 2]}
              material={stoneMaterial}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[flowerbedWidth, flowerHeight, flowerbedWall]} />
            </mesh>
            <mesh
              position={[0, 0.02 + flowerHeight / 2, flowerDepth / 2 - flowerbedWall / 2]}
              material={stoneMaterial}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[flowerbedWidth, flowerHeight, flowerbedWall]} />
            </mesh>
            <mesh
              position={[-flowerbedWidth / 2 + flowerbedWall / 2, 0.02 + flowerHeight / 2, 0]}
              material={stoneMaterial}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[flowerbedWall, flowerHeight, flowerbedInnerDepth]} />
            </mesh>
            <mesh
              position={[flowerbedWidth / 2 - flowerbedWall / 2, 0.02 + flowerHeight / 2, 0]}
              material={stoneMaterial}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[flowerbedWall, flowerHeight, flowerbedInnerDepth]} />
            </mesh>
            <mesh position={[0, 0.02 + flowerHeight * 0.68, 0]} receiveShadow>
              <boxGeometry args={[flowerbedInnerWidth, 0.01, flowerbedInnerDepth]} />
              <meshStandardMaterial color="#2a1d10" roughness={0.95} />
            </mesh>
          </group>
        ) : null}
        <group position={[0, slabOffsetY, 0]} scale={[scaleX, scaleY, scaleZ]}>
          <primitive object={model} dispose={null} />
        </group>
        <group position={[0, slabOffsetY, 0]}>
          {engravedPhotoMaterial ? (
            <mesh
              position={[ENGRAVED_PHOTO.position[0], photoY, photoZ]}
              material={engravedPhotoMaterial}
              renderOrder={RENDER_ORDER_PHOTO}
              frustumCulled={false}
            >
              <planeGeometry args={[photoW, photoH]} />
            </mesh>
          ) : null}
          {showFaceCross ? (
            <group position={[0, photoY, stoneFaceZ * scaleZ + 0.006]}>
              <mesh material={faceCrossMaterial} renderOrder={RENDER_ORDER_PHOTO}>
                <boxGeometry args={[faceCrossBeam, faceCrossH, faceCrossDepth]} />
              </mesh>
              <mesh
                position={[0, faceCrossH / 2 - faceCrossH * 0.28, 0]}
                material={faceCrossMaterial}
                renderOrder={RENDER_ORDER_PHOTO}
              >
                <boxGeometry args={[faceCrossW, faceCrossBeam, faceCrossDepth]} />
              </mesh>
            </group>
          ) : null}
          {showCross ? (
            <group position={[0, headstoneTopY * scaleY + standingCrossH / 2 - 0.005, 0]}>
              <mesh castShadow material={stoneMaterial}>
                <boxGeometry
                  args={[SOURCE_HEADSTONE_WIDTH_M * 0.06 * scaleY, standingCrossH, 0.045]}
                />
              </mesh>
              <mesh
                position={[0, SOURCE_HEADSTONE_WIDTH_M * 0.06 * scaleY, 0]}
                castShadow
                material={stoneMaterial}
              >
                <boxGeometry
                  args={[
                    SOURCE_HEADSTONE_WIDTH_M * 0.22 * scaleY,
                    SOURCE_HEADSTONE_WIDTH_M * 0.06 * scaleY,
                    0.045
                  ]}
                />
              </mesh>
            </group>
          ) : null}
          {showTextPanel ? (
            <group position={[0, panelCenterY, panelZ]}>
              <mesh
                geometry={panelGeometry}
                material={panelFrameMaterial}
                scale={[panelFrameScaleX, panelFrameScaleY, 1]}
                renderOrder={RENDER_ORDER_TEXT_PANEL}
                frustumCulled={false}
              />
              <mesh
                geometry={panelGeometry}
                material={panelFillMaterial}
                position={[0, 0, 0.0005]}
                renderOrder={RENDER_ORDER_TEXT_PANEL + 1}
                frustumCulled={false}
              />
            </group>
          ) : null}
          {/*
            * Keyed on the lettering mode, because the two modes are two
            * different objects.
            *
            * A glowing inscription carries its own unlit material as a child;
            * a plain one leaves troika to build a lit one. Switching stone
            * used to keep the same Text and pull that child out from under
            * it, and the letters vanished until the page was reloaded. The key
            * rebuilds them instead, which is what the reload was doing.
            */}
          <Suspense fallback={null}>
            {inscriptionTrimmed ? (
              <Text
                key={textGlow ? 'header-glow' : 'header-lit'}
                {...commonTextProps}
                position={[0, headerY, textZ]}
                fontSize={headerSize * textFitScale}
                outlineWidth={headerSize * textFitScale * 0.11 * outlineScale}
                outlineBlur={headerSize * textFitScale * outlineBlurFrac}
                strokeWidth={headerSize * textFitScale * boldStrokeFrac}
                lineHeight={TEXT_LINE_HEIGHT}
              >
                {inscriptionTrimmed}
                {textGlow ? (
                  <meshBasicMaterial color={inscriptionColors.fill} toneMapped={false} />
                ) : null}
              </Text>
            ) : null}
            {nameTrimmed ? (
              <Text
                key={textGlow ? 'name-glow' : 'name-lit'}
                {...commonTextProps}
                position={[0, nameY, textZ]}
                fontSize={nameSize * textFitScale}
                outlineWidth={nameSize * textFitScale * 0.12 * outlineScale}
                outlineBlur={nameSize * textFitScale * outlineBlurFrac}
                strokeWidth={nameSize * textFitScale * boldStrokeFrac}
                lineHeight={TEXT_LINE_HEIGHT}
              >
                {nameTrimmed}
                {textGlow ? (
                  <meshBasicMaterial color={inscriptionColors.fill} toneMapped={false} />
                ) : null}
              </Text>
            ) : null}
            {datesTrimmed ? (
              <Text
                key={textGlow ? 'dates-glow' : 'dates-lit'}
                {...commonTextProps}
                position={[0, datesY, textZ]}
                fontSize={datesSize * textFitScale}
                outlineWidth={datesSize * textFitScale * 0.11 * outlineScale}
                outlineBlur={datesSize * textFitScale * outlineBlurFrac}
                strokeWidth={datesSize * textFitScale * boldStrokeFrac}
                lineHeight={TEXT_LINE_HEIGHT}
              >
                {datesTrimmed}
                {textGlow ? (
                  <meshBasicMaterial color={inscriptionColors.fill} toneMapped={false} />
                ) : null}
              </Text>
            ) : null}
          </Suspense>
        </group>
      </group>
    </>
  );
};

useGLTF.preload(CLASSIC_MODEL_URL);
useGLTF.preload(ROUNDED_MODEL_URL);
useGLTF.preload(STELE_MODEL_URL);
