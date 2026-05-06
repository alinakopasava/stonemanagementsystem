import { useMemo } from 'react';
import * as THREE from 'three';
import { Text, useTexture } from '@react-three/drei';
import type { FinishType } from '@domain/entities/order-card';

export interface MonumentDimensionsCm {
  heightCm: number;
  widthCm: number;
  thicknessCm: number;
}

export interface InscriptionStyleHints {
  /** Optional URL to a TTF/OTF file for troika-three-text. */
  fontUrl?: string;
  letterSpacing: number;
  transform: 'none' | 'uppercase';
}

const DEFAULT_INSCRIPTION_STYLE: InscriptionStyleHints = {
  letterSpacing: 0,
  transform: 'none'
};

/**
 * Materials whose texture is a single-slab photograph (large unique veining
 * pattern). Tiling these produces visible seams, so we map the image once
 * across the whole monument with ClampToEdge wrapping.
 */
const UNIQUE_SLAB_MATERIALS = new Set(['Marble', 'Labradorite Blue']);

interface MonumentModelProps {
  textureUrl: string;
  materialName?: string;
  finish: FinishType;
  dimensions: MonumentDimensionsCm;
  inscription: string;
  name?: string;
  dates?: string;
  inscriptionStyle?: InscriptionStyleHints;
  fallbackColor?: string;
}

const CM_TO_M = 0.01;

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

const buildHeadstoneShape = (widthM: number, heightM: number) => {
  const shape = new THREE.Shape();
  const bodyHeight = Math.max(0.05, heightM - widthM / 2);
  shape.moveTo(-widthM / 2, 0);
  shape.lineTo(widthM / 2, 0);
  shape.lineTo(widthM / 2, bodyHeight);
  shape.absarc(0, bodyHeight, widthM / 2, 0, Math.PI, false);
  shape.lineTo(-widthM / 2, 0);
  return shape;
};

const applyTextureSettings = (texture: THREE.Texture | undefined, isUniqueSlab: boolean) => {
  if (!texture) return;
  if (isUniqueSlab) {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);
  } else {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1.5);
  }
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
};

export const MonumentModel = ({
  textureUrl,
  materialName,
  finish,
  dimensions,
  inscription,
  name,
  dates,
  inscriptionStyle = DEFAULT_INSCRIPTION_STYLE,
  fallbackColor = '#5a5a5a'
}: MonumentModelProps) => {
  const texture = useTexture(textureUrl);
  const isUniqueSlab = UNIQUE_SLAB_MATERIALS.has(materialName ?? '');

  useMemo(() => {
    applyTextureSettings(texture, isUniqueSlab);
  }, [texture, isUniqueSlab]);

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

  // Layout for the engraved lines, top-down on the headstone body:
  //   header inscription → name (largest) → dates
  const bodyHeight = Math.max(0.05, heightM - widthM / 2);
  const textZ = thicknessM + 0.01;
  const baseSize = Math.max(0.04, Math.min(widthM * 0.11, bodyHeight * 0.15));

  const headerSize = baseSize * 0.7;
  const nameSize = baseSize * 1.15;
  const datesSize = baseSize * 0.75;

  const headerY = bodyHeight * 0.62;
  const nameY = bodyHeight * 0.45;
  const datesY = bodyHeight * 0.3;

  const transformText = (value: string) =>
    inscriptionStyle.transform === 'uppercase' ? value.toUpperCase() : value;

  const inscriptionTrimmed = inscription?.trim() ?? '';
  const nameTrimmed = name?.trim() ?? '';
  const datesTrimmed = dates?.trim() ?? '';

  const commonTextProps = {
    color: '#f3eccd' as const,
    outlineColor: '#1a1208' as const,
    outlineOpacity: 0.9,
    anchorX: 'center' as const,
    anchorY: 'middle' as const,
    textAlign: 'center' as const,
    maxWidth: widthM * 0.85,
    letterSpacing: inscriptionStyle.letterSpacing,
    font: inscriptionStyle.fontUrl,
    renderOrder: 2
  };

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

        {inscriptionTrimmed ? (
          <Text
            {...commonTextProps}
            position={[0, headerY, textZ]}
            fontSize={headerSize}
            outlineWidth={headerSize * 0.05}
          >
            {transformText(inscriptionTrimmed)}
          </Text>
        ) : null}

        {nameTrimmed ? (
          <Text
            {...commonTextProps}
            position={[0, nameY, textZ]}
            fontSize={nameSize}
            outlineWidth={nameSize * 0.06}
          >
            {transformText(nameTrimmed)}
          </Text>
        ) : null}

        {datesTrimmed ? (
          <Text
            {...commonTextProps}
            position={[0, datesY, textZ]}
            fontSize={datesSize}
            outlineWidth={datesSize * 0.05}
          >
            {datesTrimmed}
          </Text>
        ) : null}
      </group>
    </group>
  );
};
