import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Object3D } from 'three';
import type { FinishType } from '@domain/entities/order-card';
import type { MonumentDecoration, MonumentDimensionsCm } from './monument-model';
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

/** Native headstone width in the Blender GLB. Scale is uniform so the arch,
 *  planter and medallion keep their modeled proportions. */
const SOURCE_HEADSTONE_WIDTH_M = 0.679;

const NON_STONE_NAME = /medalion|napis|imie|daty|ziemia|punkt|text/i;
const LETTER_NAME = /napis|imie|daty|text/i;

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

/** Drop Napis / Imię / Daty under the photo — keep dates on the slab. */
const LETTER_SHIFT_Y = -0.1;
/** Slightly smaller inscription block so years stay on the stone. */
const LETTER_FIT_SCALE = 0.92;
/** Blender text starts ~24 mm in front of the slab. Pull it close while retaining
 * a tiny render clearance so the caps remain fully visible. */
const LETTER_ENGRAVE_SHIFT_Z = -0.02;

/** Pogrubienie bez powiększania: tylko szersze glify (X), wysokość i głębokość bez zmian. */
const LETTER_BOLD_SCALE_X = 1.22;
/** Photo above stone face; letters keep Blender Z (~0.069) — on the slab, not floating. */
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
  photoUrl?: string;
  photoCrop?: PhotoCrop;
  photoBrightness?: number;
  photoContrast?: number;
  photoBlend?: number;
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

export const ClassicMonumentModel = ({
  modelUrl = CLASSIC_MODEL_URL,
  dimensions,
  textureUrl,
  materialName,
  finish,
  stoneContrast: stoneContrastProp = 1,
  decoration = 'portrait',
  photoUrl,
  photoCrop,
  photoBrightness = 0,
  photoContrast = 1.1,
  photoBlend = 0.08
}: ClassicMonumentModelProps) => {
  const invalidate = useThree((state) => state.invalidate);
  const { scene } = useGLTF(modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);
  const stoneFaceZ = useMemo(() => getStoneFaceZ(model), [model]);
  const engravedPhotoZ = stoneFaceZ + ENGRAVE_SURFACE_OFFSET;
  const albedoMap = useStoneAlbedoTexture(textureUrl, materialName);
  const showOvalMedallion = decoration === 'medallion';
  const showEngravedPhoto = decoration === 'portrait';
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

  const bakedPhotoMap = useMemo(() => {
    let map: THREE.Texture | null = null;
    model.traverse((child) => {
      if (!isMesh(child) || !isPhotoMesh(child)) return;
      const material = Array.isArray(child.material) ? child.material[0] : child.material;
      if (material && 'map' in material && material.map) {
        map = material.map as THREE.Texture;
      }
    });
    return map;
  }, [model]);

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
    if (!showOvalMedallion) return null;
    const map = uploadedPhoto ?? bakedPhotoMap;
    if (!map) return null;
    return new THREE.MeshBasicMaterial({
      map,
      toneMapped: false,
      transparent: Boolean(uploadedPhoto)
    });
  }, [showOvalMedallion, uploadedPhoto, bakedPhotoMap]);

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

  const inscription = getInscriptionColors(materialName, stoneTextureStats);

  const letterMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(inscription.fill),
      roughness: inscription.roughness,
      metalness: inscription.metalness,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    if (inscription.emissive) {
      mat.emissive = new THREE.Color(inscription.emissive);
      mat.emissiveIntensity = inscription.emissiveIntensity ?? 0.25;
    }
    return mat;
  }, [
    inscription.fill,
    inscription.metalness,
    inscription.roughness,
    inscription.emissive,
    inscription.emissiveIntensity
  ]);

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
  useEffect(() => () => letterMaterial.dispose(), [letterMaterial]);
  useEffect(() => () => medallionPhotoMaterial?.dispose(), [medallionPhotoMaterial]);
  useEffect(() => () => engravedPhotoMaterial?.dispose(), [engravedPhotoMaterial]);

  useEffect(() => {
    invalidate();
  }, [invalidate, uploadedPhoto, stoneMaterial, letterMaterial, engravedPhotoMaterial]);

  useLayoutEffect(() => {
    albedoMap.wrapS = THREE.RepeatWrapping;
    albedoMap.wrapT = THREE.RepeatWrapping;
    albedoMap.repeat.set(1.6, 1.6);
    albedoMap.needsUpdate = true;

    model.traverse((child: Object3D) => {
      if (!isMesh(child)) return;

      if (isMedallionFrame(child) || isPhotoMesh(child)) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.visible = showOvalMedallion;
        if (isPhotoMesh(child) && medallionPhotoMaterial && showOvalMedallion) {
          child.material = medallionPhotoMaterial;
          child.receiveShadow = false;
        }
        return;
      }

      if (isLetterMesh(child)) {
        child.visible = true;
        child.material = letterMaterial;
        child.renderOrder = RENDER_ORDER_TEXT;
        child.castShadow = false;
        child.receiveShadow = false;
        if (typeof child.userData.baseY !== 'number') {
          child.userData.baseY = child.position.y;
        }
        if (typeof child.userData.baseZ !== 'number') {
          child.userData.baseZ = child.position.z;
        }
        if (typeof child.userData.baseScaleX !== 'number') {
          child.userData.baseScaleX = child.scale.x;
          child.userData.baseScaleY = child.scale.y;
          child.userData.baseScaleZ = child.scale.z;
        }
        child.position.y =
          child.userData.baseY + (showEngravedPhoto ? LETTER_SHIFT_Y : 0);
        const fit = showEngravedPhoto ? LETTER_FIT_SCALE : 1;
        child.scale.x = child.userData.baseScaleX * LETTER_BOLD_SCALE_X * fit;
        child.scale.y = child.userData.baseScaleY * fit;
        child.scale.z = child.userData.baseScaleZ;
        child.position.z = child.userData.baseZ + LETTER_ENGRAVE_SHIFT_Z;
        return;
      }
      if (isStoneMesh(child)) {
        child.material = stoneMaterial;
        child.castShadow = true;
        /** Face stays clean; ground plane still catches the monument's cast shadow. */
        child.receiveShadow = false;
      }
    });
  }, [
    model,
    stoneMaterial,
    letterMaterial,
    medallionPhotoMaterial,
    albedoMap,
    showOvalMedallion,
    showEngravedPhoto,
    stoneFaceZ
  ]);

  const scale = (dimensions.widthCm / 100) / SOURCE_HEADSTONE_WIDTH_M;

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
    </group>
  );
};

useGLTF.preload(CLASSIC_MODEL_URL);
