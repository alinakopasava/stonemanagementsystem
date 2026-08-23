import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Text, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Object3D } from 'three';
import type { FinishType } from '@domain/entities/order-card';
import type {
  InscriptionStyleHints,
  MonumentDecoration,
  MonumentDimensionsCm,
  NicheStyle
} from './monument-model';
import { useStoneAlbedoTexture } from './use-stone-albedo-texture';
import { usePhotoTexture, type PhotoCrop } from './use-photo-texture';
import {
  applyStoneAlbedoGrade,
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

/** Native headstone width in the Blender GLB. Scale is uniform so the arch,
 *  planter and medallion keep their modeled proportions. */
const SOURCE_HEADSTONE_WIDTH_M = 0.679;

const NON_STONE_NAME = /medalion|napis|imie|daty|ziemia|punkt|text/i;
const LETTER_NAME = /napis|imie|daty|text/i;
const FLOWERBED_NAME = /ziemia/i;
const SLAB_NAME = /plyta_(?:klasyczna|polokragla)/i;

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
const TEXT_MAX_WIDTH = SOURCE_HEADSTONE_WIDTH_M * 0.78;
const TEXT_BOTTOM_Y = 0.52;

const DEFAULT_INSCRIPTION_STYLE: InscriptionStyleHints = {
  letterSpacing: 0,
  transform: 'none'
};

/** Photo above stone face; live text sits above baked meshes. */
const RENDER_ORDER_PHOTO = 3;
const RENDER_ORDER_TEXT = 5;

interface ClassicMonumentModelProps {
  modelUrl?: string;
  dimensions: MonumentDimensionsCm;
  textureUrl?: string;
  materialName?: string;
  finish: FinishType;
  stoneContrast?: number;
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
}

const finishToSurface = (finish: FinishType) => {
  switch (finish) {
    case 'Polished':
      return { roughness: 0.04, metalness: 0.42, clearcoat: 1.0, clearcoatRoughness: 0.04 };
    case 'Honed':
      return { roughness: 0.38, metalness: 0.14, clearcoat: 0.22, clearcoatRoughness: 0.28 };
    case 'Matte':
    default:
      return { roughness: 0.88, metalness: 0.04, clearcoat: 0, clearcoatRoughness: 0 };
  }
};

const isMesh = (object: Object3D): object is THREE.Mesh =>
  'isMesh' in object && (object as THREE.Mesh).isMesh === true;

const isStoneMesh = (mesh: THREE.Mesh) => !NON_STONE_NAME.test(mesh.name);
const isLetterMesh = (mesh: THREE.Mesh) => LETTER_NAME.test(mesh.name);
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

const getHeadstoneTopY = (root: Object3D) => {
  const box = new THREE.Box3();
  let found = false;
  root.traverse((child) => {
    if (!isMesh(child) || !isStoneMesh(child)) return;
    box.expandByObject(child);
    found = true;
  });
  return found && Number.isFinite(box.max.y) ? box.max.y : 1.58;
};

export const ClassicMonumentModel = ({
  modelUrl = CLASSIC_MODEL_URL,
  dimensions,
  textureUrl,
  materialName,
  finish,
  stoneContrast: stoneContrastProp = 1,
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
  showFlowerbed = true
}: ClassicMonumentModelProps) => {
  const invalidate = useThree((state) => state.invalidate);
  const { scene } = useGLTF(modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);
  const stoneFaceZ = useMemo(() => getStoneFaceZ(model), [model]);
  const headstoneTopY = useMemo(() => getHeadstoneTopY(model), [model]);
  const engravedPhotoZ = stoneFaceZ + ENGRAVE_SURFACE_OFFSET;
  const albedoMap = useStoneAlbedoTexture(textureUrl, materialName);
  const showOvalMedallion = decoration === 'medallion';
  const showEngravedPhoto = decoration === 'portrait';
  const showFaceCross = decoration === 'cross';
  const finishSurface = finishToSurface(finish);
  const presentation = getStonePresentationProfile(materialName);
  const stoneContrast =
    stoneContrastProp === 1 ? presentation.stoneContrast : stoneContrastProp;
  const stoneSurface = presentation.surfaceOverride ?? finishSurface;
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
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: albedoMap,
      roughness: stoneSurface.roughness,
      metalness: stoneSurface.metalness,
      clearcoat: stoneSurface.clearcoat,
      clearcoatRoughness: stoneSurface.clearcoatRoughness
    });
    if (Math.abs(stoneContrast - 1) > 0.001) {
      applyStoneAlbedoGrade(
        mat,
        stoneContrast,
        presentation.albedoSaturation,
        presentation.albedoDarken
      );
    } else if (
      Math.abs(presentation.albedoSaturation - 1) > 0.001 ||
      Math.abs(presentation.albedoDarken - 1) > 0.001
    ) {
      applyStoneAlbedoGrade(mat, 1, presentation.albedoSaturation, presentation.albedoDarken);
    }
    return mat;
  }, [albedoMap, stoneSurface, stoneContrast, presentation.albedoSaturation, presentation.albedoDarken]);

  useEffect(() => () => stoneMaterial.dispose(), [stoneMaterial]);
  useEffect(() => () => medallionPhotoMaterial?.dispose(), [medallionPhotoMaterial]);
  useEffect(() => () => engravedPhotoMaterial?.dispose(), [engravedPhotoMaterial]);

  useEffect(() => {
    invalidate();
  }, [invalidate, uploadedPhoto, stoneMaterial, engravedPhotoMaterial, inscription, name, dates]);

  useLayoutEffect(() => {
    albedoMap.wrapS = THREE.RepeatWrapping;
    albedoMap.wrapT = THREE.RepeatWrapping;
    albedoMap.repeat.set(1.6, 1.6);
    albedoMap.needsUpdate = true;

    model.traverse((child: Object3D) => {
      if (!isMesh(child)) return;

      if (isFlowerbedMesh(child)) {
        child.visible = showFlowerbed;
        child.material = stoneMaterial;
        child.castShadow = true;
        child.receiveShadow = false;
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
    showFlowerbed,
    nicheStyle
  ]);

  const transformText = (value: string) =>
    inscriptionStyle.transform === 'uppercase' ? value.toUpperCase() : value;

  const inscriptionTrimmed = transformText(inscription.trim());
  const nameTrimmed = transformText(name.trim());
  const datesTrimmed = dates.trim();

  const charFactor = 0.7 + inscriptionStyle.letterSpacing * 0.9;
  const autoFit = (text: string, desired: number) => {
    if (!text) return desired;
    const longest = text.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 1);
    return Math.min(desired, TEXT_MAX_WIDTH / (longest * charFactor));
  };

  const headerSize = autoFit(inscriptionTrimmed, 0.042);
  const nameSize = autoFit(nameTrimmed, 0.055);
  const datesSize = autoFit(datesTrimmed, 0.038);
  const blockGap = 0.028;
  const headerHeight = inscriptionTrimmed ? headerSize * TEXT_LINE_HEIGHT : 0;
  const nameHeight = nameTrimmed ? nameSize * TEXT_LINE_HEIGHT : 0;
  const datesHeight = datesTrimmed ? datesSize * TEXT_LINE_HEIGHT : 0;

  const occupiesUpperBand = showEngravedPhoto || showFaceCross || showOvalMedallion;
  const textTopY = occupiesUpperBand
    ? ENGRAVED_PHOTO.position[1] - ENGRAVED_PHOTO.height / 2 - 0.05
    : 1.22;

  let cursor = textTopY;
  const headerY = inscriptionTrimmed ? cursor - headerHeight / 2 : 0;
  if (inscriptionTrimmed) cursor -= headerHeight + blockGap;
  const nameY = nameTrimmed ? cursor - nameHeight / 2 : 0;
  if (nameTrimmed) cursor -= nameHeight + blockGap;
  const datesY = datesTrimmed ? Math.max(TEXT_BOTTOM_Y + datesHeight / 2, cursor - datesHeight / 2) : 0;

  const textZ = stoneFaceZ + ENGRAVE_SURFACE_OFFSET;
  const commonTextProps = {
    color: inscriptionColors.fill,
    outlineColor: inscriptionColors.outline,
    outlineOpacity: 0.85,
    anchorX: 'center' as const,
    anchorY: 'middle' as const,
    textAlign: 'center' as const,
    maxWidth: TEXT_MAX_WIDTH,
    letterSpacing: inscriptionStyle.letterSpacing,
    font: inscriptionStyle.fontUrl,
    renderOrder: RENDER_ORDER_TEXT,
    depthOffset: -1
  };

  const scale = (dimensions.widthCm / 100) / SOURCE_HEADSTONE_WIDTH_M;
  const faceCrossW = SOURCE_HEADSTONE_WIDTH_M * 0.34;
  const faceCrossH = faceCrossW * 1.7;
  const faceCrossBeam = faceCrossW * 0.26;
  const faceCrossDepth = 0.022;
  const standingCrossH = SOURCE_HEADSTONE_WIDTH_M * 0.32;
  const isFramedPortrait = showEngravedPhoto && nicheStyle === 'framed' && engravedPhotoMaterial;
  const frameThickness = 0.012;

  return (
    <group scale={[scale, scale, scale]}>
      <primitive object={model} dispose={null} />
      {engravedPhotoMaterial ? (
        <mesh
          position={[
            ENGRAVED_PHOTO.position[0],
            ENGRAVED_PHOTO.position[1],
            engravedPhotoZ
          ]}
          material={engravedPhotoMaterial}
          renderOrder={RENDER_ORDER_PHOTO}
          frustumCulled={false}
        >
          <planeGeometry args={[ENGRAVED_PHOTO.width, ENGRAVED_PHOTO.height]} />
        </mesh>
      ) : null}
      {isFramedPortrait ? (
        <group position={[0, ENGRAVED_PHOTO.position[1], stoneFaceZ + 0.012]}>
          <mesh material={stoneMaterial} position={[0, ENGRAVED_PHOTO.height / 2 + frameThickness / 2, 0]}>
            <boxGeometry args={[ENGRAVED_PHOTO.width + frameThickness * 2, frameThickness, frameThickness]} />
          </mesh>
          <mesh material={stoneMaterial} position={[0, -ENGRAVED_PHOTO.height / 2 - frameThickness / 2, 0]}>
            <boxGeometry args={[ENGRAVED_PHOTO.width + frameThickness * 2, frameThickness, frameThickness]} />
          </mesh>
          <mesh material={stoneMaterial} position={[-ENGRAVED_PHOTO.width / 2 - frameThickness / 2, 0, 0]}>
            <boxGeometry args={[frameThickness, ENGRAVED_PHOTO.height, frameThickness]} />
          </mesh>
          <mesh material={stoneMaterial} position={[ENGRAVED_PHOTO.width / 2 + frameThickness / 2, 0, 0]}>
            <boxGeometry args={[frameThickness, ENGRAVED_PHOTO.height, frameThickness]} />
          </mesh>
        </group>
      ) : null}
      {showFaceCross ? (
        <group position={[0, ENGRAVED_PHOTO.position[1], 0]}>
          <mesh
            position={[0, 0, stoneFaceZ + faceCrossDepth / 2]}
            castShadow
            material={stoneMaterial}
          >
            <boxGeometry args={[faceCrossBeam, faceCrossH, faceCrossDepth]} />
          </mesh>
          <mesh
            position={[0, faceCrossH / 2 - faceCrossH * 0.28, stoneFaceZ + faceCrossDepth / 2]}
            castShadow
            material={stoneMaterial}
          >
            <boxGeometry args={[faceCrossW, faceCrossBeam, faceCrossDepth]} />
          </mesh>
        </group>
      ) : null}
      {showCross ? (
        <group position={[0, headstoneTopY + standingCrossH / 2 - 0.005, 0]}>
          <mesh castShadow material={stoneMaterial}>
            <boxGeometry args={[SOURCE_HEADSTONE_WIDTH_M * 0.06, standingCrossH, 0.045]} />
          </mesh>
          <mesh
            position={[0, SOURCE_HEADSTONE_WIDTH_M * 0.06, 0]}
            castShadow
            material={stoneMaterial}
          >
            <boxGeometry args={[SOURCE_HEADSTONE_WIDTH_M * 0.22, SOURCE_HEADSTONE_WIDTH_M * 0.06, 0.045]} />
          </mesh>
        </group>
      ) : null}
      <Suspense fallback={null}>
        {inscriptionTrimmed ? (
          <Text
            {...commonTextProps}
            position={[0, headerY, textZ]}
            fontSize={headerSize}
            outlineWidth={headerSize * 0.05}
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
            outlineWidth={nameSize * 0.06}
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
            outlineWidth={datesSize * 0.05}
            lineHeight={TEXT_LINE_HEIGHT}
          >
            {datesTrimmed}
          </Text>
        ) : null}
      </Suspense>
    </group>
  );
};

useGLTF.preload(CLASSIC_MODEL_URL);
useGLTF.preload(ROUNDED_MODEL_URL);
useGLTF.preload(STELE_MODEL_URL);
