import { useMemo } from 'react';
import * as THREE from 'three';
import { Text, useTexture } from '@react-three/drei';
import type { FinishType } from '@domain/entities/order-card';

export interface MonumentDimensionsCm {
  heightCm: number;
  widthCm: number;
  thicknessCm: number;
}

interface MonumentModelProps {
  textureUrl: string;
  finish: FinishType;
  dimensions: MonumentDimensionsCm;
  inscription: string;
  fallbackColor?: string;
}

const CM_TO_M = 0.01;

/** Polished stone = nearly specular. Honed = soft sheen. Matte = diffuse. */
const finishToSurface = (finish: FinishType) => {
  switch (finish) {
    case 'Polished':
      return { roughness: 0.12, metalness: 0.25, clearcoat: 0.6 };
    case 'Honed':
      return { roughness: 0.45, metalness: 0.12, clearcoat: 0.15 };
    case 'Matte':
    default:
      return { roughness: 0.9, metalness: 0.05, clearcoat: 0 };
  }
};

/** Arched-top headstone, built from an extruded 2D shape. */
const buildHeadstoneShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const bodyHeight = Math.max(0.05, heightM - widthM / 2);
  shape.moveTo(-widthM / 2, 0);
  shape.lineTo(widthM / 2, 0);
  shape.lineTo(widthM / 2, bodyHeight);
  // semicircular top
  shape.absarc(0, bodyHeight, widthM / 2, 0, Math.PI, false);
  shape.lineTo(-widthM / 2, 0);
  return shape;
};

export const MonumentModel = ({
  textureUrl,
  finish,
  dimensions,
  inscription,
  fallbackColor = '#5a5a5a'
}: MonumentModelProps) => {
  const texture = useTexture(textureUrl);

  useMemo(() => {
    if (!texture) return;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1.5);
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const widthM = dimensions.widthCm * CM_TO_M;
  const heightM = dimensions.heightCm * CM_TO_M;
  const thicknessM = Math.max(0.04, dimensions.thicknessCm * CM_TO_M);

  const baseWidth = widthM * 1.4;
  const baseDepth = thicknessM * 2.2;
  const baseHeight = Math.max(0.08, Math.min(0.18, heightM * 0.12));

  const shape = useMemo(() => buildHeadstoneShape(widthM, heightM), [widthM, heightM]);

  const extrudeSettings = useMemo(
    () => ({
      depth: thicknessM,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 3,
      curveSegments: 32
    }),
    [thicknessM]
  );

  const surface = finishToSurface(finish);

  // Inscription: positioned slightly in front of the slab, centered horizontally,
  // lower third so it reads like a real headstone.
  const bodyHeight = Math.max(0.05, heightM - widthM / 2);
  const textY = baseHeight + bodyHeight * 0.45;
  const textZ = thicknessM + 0.002;
  const inscriptionSize = Math.min(widthM * 0.11, bodyHeight * 0.15);

  return (
    <group>
      {/* Base */}
      <mesh position={[0, baseHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[baseWidth, baseHeight, baseDepth]} />
        <meshPhysicalMaterial
          map={texture ?? null}
          color={texture ? '#ffffff' : fallbackColor}
          roughness={surface.roughness}
          metalness={surface.metalness}
          clearcoat={surface.clearcoat}
          clearcoatRoughness={0.25}
        />
      </mesh>

      {/* Headstone */}
      <group position={[0, baseHeight, -thicknessM / 2]}>
        <mesh castShadow receiveShadow>
          <extrudeGeometry args={[shape, extrudeSettings]} />
          <meshPhysicalMaterial
            map={texture ?? null}
            color={texture ? '#ffffff' : fallbackColor}
            roughness={surface.roughness}
            metalness={surface.metalness}
            clearcoat={surface.clearcoat}
            clearcoatRoughness={0.25}
          />
        </mesh>

        {/* Engraved inscription */}
        {inscription?.trim() ? (
          <Text
            position={[0, textY - baseHeight, textZ]}
            fontSize={inscriptionSize}
            maxWidth={widthM * 0.8}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            color="#1a1a1a"
            outlineWidth={0.0015}
            outlineColor="#000000"
            outlineOpacity={0.6}
          >
            {inscription}
          </Text>
        ) : null}
      </group>
    </group>
  );
};
