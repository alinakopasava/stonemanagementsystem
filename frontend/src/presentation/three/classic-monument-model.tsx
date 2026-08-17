import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Object3D } from 'three';
import type { FinishType } from '@domain/entities/order-card';
import type { MonumentDimensionsCm } from './monument-model';
import { useStoneAlbedoTexture } from './use-stone-albedo-texture';

const CLASSIC_MODEL_URL = '/models/classic-monument.glb';

/** Native headstone width in the Blender GLB. Scale is uniform so the arch,
 *  planter and medallion keep their modeled proportions. */
const SOURCE_HEADSTONE_WIDTH_M = 0.679;

const NON_STONE_NAME = /medalion|napis|imie|daty|ziemia|punkt|text/i;
const LETTER_NAME = /napis|imie|daty|text/i;

interface ClassicMonumentModelProps {
  dimensions: MonumentDimensionsCm;
  textureUrl?: string;
  materialName?: string;
  finish: FinishType;
  stoneContrast?: number;
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

export const ClassicMonumentModel = ({
  dimensions,
  textureUrl,
  materialName,
  finish,
  stoneContrast = 1
}: ClassicMonumentModelProps) => {
  const { scene } = useGLTF(CLASSIC_MODEL_URL);
  const model = useMemo(() => scene.clone(true), [scene]);
  const albedoMap = useStoneAlbedoTexture(textureUrl, materialName);
  const photoMap = useMemo(() => {
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

  const photoMaterial = useMemo(() => {
    if (!photoMap) return null;
    return new THREE.MeshBasicMaterial({
      map: photoMap,
      toneMapped: false
    });
  }, [photoMap]);
  const isDarkStone =
    materialName === 'Black Granite' || materialName === 'Labradorite Blue';

  const letterMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: isDarkStone ? 0xf5e9c8 : 0x1a1208,
      roughness: isDarkStone ? 0.28 : 0.45,
      metalness: isDarkStone ? 0.55 : 0.08
    });
    return mat;
  }, [isDarkStone]);

  const stoneMaterial = useMemo(() => {
    const surface = finishToSurface(finish);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: albedoMap,
      roughness: surface.roughness,
      metalness: surface.metalness,
      clearcoat: surface.clearcoat,
      clearcoatRoughness: surface.clearcoatRoughness
    });
    if (Math.abs(stoneContrast - 1) > 0.001) {
      const amount = stoneContrast.toFixed(3);
      mat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          {
            float _l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float _target = mix(0.35, _l, ${amount});
            diffuseColor.rgb *= _target / max(_l, 0.001);
          }`
        );
      };
    }
    return mat;
  }, [albedoMap, finish, stoneContrast]);

  useEffect(() => () => stoneMaterial.dispose(), [stoneMaterial]);
  useEffect(() => () => letterMaterial.dispose(), [letterMaterial]);
  useEffect(() => () => photoMaterial?.dispose(), [photoMaterial]);

  useLayoutEffect(() => {
    albedoMap.wrapS = THREE.RepeatWrapping;
    albedoMap.wrapT = THREE.RepeatWrapping;
    albedoMap.repeat.set(1.6, 1.6);
    albedoMap.needsUpdate = true;

    model.traverse((child: Object3D) => {
      if (!isMesh(child)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (isPhotoMesh(child) && photoMaterial) {
        child.material = photoMaterial;
        child.receiveShadow = false;
        return;
      }
      if (isLetterMesh(child)) {
        child.material = letterMaterial;
        return;
      }
      if (isStoneMesh(child)) {
        child.material = stoneMaterial;
      }
    });
  }, [model, stoneMaterial, letterMaterial, photoMaterial, albedoMap]);

  const scale = (dimensions.widthCm / 100) / SOURCE_HEADSTONE_WIDTH_M;

  return (
    <group scale={[scale, scale, scale]}>
      <primitive object={model} dispose={null} />
    </group>
  );
};

useGLTF.preload(CLASSIC_MODEL_URL);
