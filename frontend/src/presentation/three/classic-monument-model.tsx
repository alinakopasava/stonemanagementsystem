import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Text, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Object3D } from 'three';
import type { FinishType } from '@domain/entities/order-card';
import {
  DEFAULT_INSCRIPTION_STYLE,
  wordAwareLineCount,
  type BaseDimensionsCm,
  type InscriptionStyleHints,
  type MonumentDecoration,
  type MonumentDimensionsCm,
  type NicheStyle,
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
 *  the chosen size; overlays (text, photo, cross) stay in world space so letters
 *  are not squashed when width and height change independently. */
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
  position: [0, 1.18, 0] as const,
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
const RENDER_ORDER_TEXT = 5;

interface ClassicMonumentModelProps {
  modelUrl?: string;
  dimensions: MonumentDimensionsCm;
  textureUrl?: string;
  materialName?: string;
  finish: FinishType;
  baseDimensions?: BaseDimensionsCm;
  decoration?: MonumentDecoration;
  nicheStyle?: NicheStyle;
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

const isPhotoMesh = (mesh: THREE.Mesh) => /medalion_zdjecie/i.test(mesh.name);
const isMedallionFrame = (mesh: THREE.Mesh) => /medalion_ramijka/i.test(mesh.name);
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
  nicheStyle = 'recessed',
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
  const slabWidth = slabBox ? slabBox.max.x - slabBox.min.x : SOURCE_HEADSTONE_WIDTH_M;
  const slabHeight = slabBox ? slabBox.max.y - slabBox.min.y : 1.15;
  const slabDepth = slabBox ? Math.max(0.04, slabBox.max.z - slabBox.min.z) : 0.08;
  const slabMinY = slabBox ? slabBox.min.y : 0.32;
  const headstoneTopY = slabBox ? slabBox.max.y : 1.58;
  const engravedPhotoZ = stoneFaceZ + ENGRAVE_SURFACE_OFFSET;
  const albedoMap = useStoneAlbedoTexture(textureUrl, materialName);
  const showOvalMedallion = decoration === 'medallion';
  const showEngravedPhoto = decoration === 'portrait';
  const showFaceCross = decoration === 'cross';
  const stoneSurface = finishToSurface(finish);
  const darkStone = isDarkStone(materialName);
  const [stoneLuma, setStoneLuma] = useState(darkStone ? 0.08 : 0.6);
  const [stoneTextureStats, setStoneTextureStats] = useState<StoneTextureStats | undefined>();

  const uploadedPhoto = usePhotoTexture(
    photoUrl,
    showOvalMedallion ? 'square' : 'portrait',
    showOvalMedallion ? 'radial' : 'sides',
    photoCrop
  );

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

  const medallionPhotoMaterial = useMemo(() => {
    if (!showOvalMedallion || !uploadedPhoto) return null;
    return new THREE.MeshBasicMaterial({
      map: uploadedPhoto,
      toneMapped: false,
      transparent: true
    });
  }, [showOvalMedallion, uploadedPhoto]);

  const stoneRepeat = useMemo(() => new THREE.Vector2(1.6, 1.6), []);

  const engravedPhotoMaterial = useMemo(() => {
    if (!showEngravedPhoto || !uploadedPhoto) return null;
    return createNaturalEngravedPhotoMaterial({
      photoMap: uploadedPhoto,
      stoneMap: albedoMap,
      stoneRepeat,
      stoneLuma,
      roughness: stoneSurface.roughness,
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

  useEffect(() => () => stoneMaterial.dispose(), [stoneMaterial]);
  useEffect(() => () => medallionPhotoMaterial?.dispose(), [medallionPhotoMaterial]);
  useEffect(() => () => engravedPhotoMaterial?.dispose(), [engravedPhotoMaterial]);

  useEffect(() => {
    invalidate();
  }, [invalidate, uploadedPhoto, stoneMaterial, engravedPhotoMaterial, inscription, name, dates, finish, dimensions, baseDimensions]);

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

      if (isMedallionFrame(child) || isPhotoMesh(child)) {
        child.castShadow = false;
        child.receiveShadow = false;
        if (isPhotoMesh(child)) {
          child.visible = Boolean(showOvalMedallion && medallionPhotoMaterial);
          if (child.visible && medallionPhotoMaterial) {
            child.material = medallionPhotoMaterial;
          }
          return;
        }
        child.visible = showOvalMedallion && nicheStyle === 'framed';
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
  }, [
    model,
    stoneMaterial,
    medallionPhotoMaterial,
    albedoMap,
    showOvalMedallion,
    nicheStyle
  ]);

  const scaleX = (dimensions.widthCm / 100) / slabWidth;
  const scaleY = (dimensions.heightCm / 100) / slabHeight;
  const scaleZ = (dimensions.thicknessCm / 100) / slabDepth;
  const worldWidth = dimensions.widthCm / 100;
  const worldTextMaxWidth = worldWidth * 0.78;
  /** Letters follow the tighter axis so a 50 cm stele does not keep 60 cm type. */
  const textScale = Math.min(scaleX, scaleY);
  const blockGap = TEXT_BLOCK_GAP * textScale;

  const transformText = (value: string) =>
    inscriptionStyle.transform === 'uppercase' ? value.toUpperCase() : value;

  const inscriptionTrimmed = transformText(inscription.trim());
  const nameTrimmed = transformText(name.trim());
  const datesTrimmed = dates.trim();

  const charFactor = 0.7 + inscriptionStyle.letterSpacing * 0.9;
  const autoFit = (text: string, desired: number) => {
    if (!text) return desired;
    const longest = text.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 1);
    return Math.min(desired, worldTextMaxWidth / (longest * charFactor));
  };

  const fontScale = inscriptionStyle.fontScale ?? 1;
  const headerSize = autoFit(inscriptionTrimmed, 0.042 * textScale * fontScale);
  const nameSize = autoFit(nameTrimmed, 0.055 * textScale * fontScale);
  const datesSize = autoFit(datesTrimmed, 0.038 * textScale * fontScale);
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

  const occupiesUpperBand = showEngravedPhoto || showFaceCross || showOvalMedallion;

  const slots = [
    inscriptionTrimmed
      ? { y: BAKED_INSCRIPTION_Y * scaleY, h: headerHeight, key: 'header' as const }
      : null,
    nameTrimmed ? { y: BAKED_NAME_Y * scaleY, h: nameHeight, key: 'name' as const } : null,
    datesTrimmed ? { y: BAKED_DATES_Y * scaleY, h: datesHeight, key: 'dates' as const } : null
  ].filter((slot): slot is { y: number; h: number; key: 'header' | 'name' | 'dates' } => slot !== null);

  const packFromCeiling = (ceiling: number) => {
    let cursor = ceiling;
    for (const slot of slots) {
      slot.y = cursor - slot.h / 2;
      cursor -= slot.h + blockGap;
    }
  };

  let photoW = ENGRAVED_PHOTO.width * scaleY;
  let photoH = ENGRAVED_PHOTO.height * scaleY;
  const photoWidthCap = worldWidth * 0.72;
  if (photoW > photoWidthCap) {
    const fit = photoWidthCap / photoW;
    photoW *= fit;
    photoH *= fit;
  }
  const photoY = ENGRAVED_PHOTO.position[1] * scaleY;

  if (occupiesUpperBand && slots.length > 0) {
    /** Catalog/designer portraits sit in the upper band — keep the live text
     *  immediately under the photo, not down in the plinth where the compact
     *  catalog camera crops it away. */
    packFromCeiling(photoY - photoH / 2 - 0.05 * scaleY);
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
        Math.min(BAKED_INSCRIPTION_Y * scaleY + 0.06 * scaleY, BAKED_NAME_Y * scaleY + totalHeight / 2)
      );
    }
  }

  const headerY = slots.find((slot) => slot.key === 'header')?.y ?? 0;
  const nameY = slots.find((slot) => slot.key === 'name')?.y ?? 0;
  const datesY = slots.find((slot) => slot.key === 'dates')?.y ?? 0;

  const textZ = (stoneFaceZ + ENGRAVE_SURFACE_OFFSET) * scaleZ;
  const photoZ = engravedPhotoZ * scaleZ;
  const commonTextProps = {
    color: inscriptionColors.fill,
    outlineColor: inscriptionColors.outline,
    /** A firm opposite-colour outline keeps lettering legible on veins and speckled granite. */
    outlineOpacity: 1,
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
    tombstoneSlab === 'half' ? Math.max(baseDepthM * 1.15, slabDepth * scaleZ * 2.8) : Math.max(baseDepthM * 2, slabDepth * scaleZ * 5.5);
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
  const isFramedPortrait = showEngravedPhoto && nicheStyle === 'framed' && engravedPhotoMaterial;
  const frameThickness = 0.012;

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
      <mesh
        position={[0, baseHeightM / 2, 0]}
        material={stoneMaterial}
        castShadow
        receiveShadow
      >
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
          position={[
            ENGRAVED_PHOTO.position[0],
            photoY,
            photoZ
          ]}
          material={engravedPhotoMaterial}
          renderOrder={RENDER_ORDER_PHOTO}
          frustumCulled={false}
        >
          <planeGeometry args={[photoW, photoH]} />
        </mesh>
      ) : null}
      {isFramedPortrait ? (
        <group position={[0, photoY, stoneFaceZ * scaleZ + 0.012]}>
          <mesh material={stoneMaterial} position={[0, photoH / 2 + frameThickness / 2, 0]}>
            <boxGeometry args={[photoW + frameThickness * 2, frameThickness, frameThickness]} />
          </mesh>
          <mesh material={stoneMaterial} position={[0, -photoH / 2 - frameThickness / 2, 0]}>
            <boxGeometry args={[photoW + frameThickness * 2, frameThickness, frameThickness]} />
          </mesh>
          <mesh material={stoneMaterial} position={[-photoW / 2 - frameThickness / 2, 0, 0]}>
            <boxGeometry args={[frameThickness, photoH, frameThickness]} />
          </mesh>
          <mesh material={stoneMaterial} position={[photoW / 2 + frameThickness / 2, 0, 0]}>
            <boxGeometry args={[frameThickness, photoH, frameThickness]} />
          </mesh>
        </group>
      ) : null}
      {showFaceCross ? (
        <group position={[0, photoY, 0]}>
          <mesh
            position={[0, 0, stoneFaceZ * scaleZ + faceCrossDepth / 2]}
            castShadow
            material={stoneMaterial}
          >
            <boxGeometry args={[faceCrossBeam, faceCrossH, faceCrossDepth]} />
          </mesh>
          <mesh
            position={[0, faceCrossH / 2 - faceCrossH * 0.28, stoneFaceZ * scaleZ + faceCrossDepth / 2]}
            castShadow
            material={stoneMaterial}
          >
            <boxGeometry args={[faceCrossW, faceCrossBeam, faceCrossDepth]} />
          </mesh>
        </group>
      ) : null}
      {showCross ? (
        <group position={[0, headstoneTopY * scaleY + standingCrossH / 2 - 0.005, 0]}>
          <mesh castShadow material={stoneMaterial}>
            <boxGeometry args={[SOURCE_HEADSTONE_WIDTH_M * 0.06 * scaleY, standingCrossH, 0.045]} />
          </mesh>
          <mesh
            position={[0, SOURCE_HEADSTONE_WIDTH_M * 0.06 * scaleY, 0]}
            castShadow
            material={stoneMaterial}
          >
            <boxGeometry args={[SOURCE_HEADSTONE_WIDTH_M * 0.22 * scaleY, SOURCE_HEADSTONE_WIDTH_M * 0.06 * scaleY, 0.045]} />
          </mesh>
        </group>
      ) : null}
      <Suspense fallback={null}>
        {inscriptionTrimmed ? (
          <Text
            {...commonTextProps}
            position={[0, headerY, textZ]}
            fontSize={headerSize}
            outlineWidth={headerSize * 0.11}
            lineHeight={TEXT_LINE_HEIGHT}
          >
            {inscriptionTrimmed}
          </Text>
        ) : null}
        {nameTrimmed ? (
          <Text
            {...commonTextProps}
            position={[0, nameY, textZ]}
            fontSize={nameSize}
            outlineWidth={nameSize * 0.12}
            lineHeight={TEXT_LINE_HEIGHT}
          >
            {nameTrimmed}
          </Text>
        ) : null}
        {datesTrimmed ? (
          <Text
            {...commonTextProps}
            position={[0, datesY, textZ]}
            fontSize={datesSize}
            outlineWidth={datesSize * 0.11}
            lineHeight={TEXT_LINE_HEIGHT}
          >
            {datesTrimmed}
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
