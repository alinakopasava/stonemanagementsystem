import { Suspense, useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import {
  ClassicMonumentModel,
  ROUNDED_MODEL_URL,
  STELE_MODEL_URL
} from './classic-monument-model';
import { MonumentModel } from './monument-model';
import type {
  BaseDimensionsCm,
  InscriptionStyleHints,
  MonumentDecoration,
  MonumentDimensionsCm,
  MonumentLayout,
  MonumentShape,
  NicheStyle,
  TombstoneSlabVariant
} from './monument-model';
import type { FinishType } from '@domain/entities/order-card';
import { getStonePresentationProfile } from './stone-catalog';

import type { PhotoCrop } from './use-photo-texture';

export interface MonumentViewerProps {
  textureUrl?: string;
  materialName?: string;
  finish: FinishType;
  dimensions: MonumentDimensionsCm;
  baseDimensions?: BaseDimensionsCm;
  inscription: string;
  name?: string;
  dates?: string;
  inscriptionStyle?: InscriptionStyleHints;
  shape?: MonumentShape;
  showCross?: boolean;
  showFlowerbed?: boolean;
  tombstoneSlab?: TombstoneSlabVariant;
  slabThicknessCm?: number;
  decoration?: MonumentDecoration;
  nicheStyle?: NicheStyle;
  photoUrl?: string;
  photoCrop?: PhotoCrop;
  photoBrightness?: number;
  photoContrast?: number;
  photoBlend?: number;
  layout?: MonumentLayout;
  secondaryInscription?: string;
  secondaryName?: string;
  secondaryDates?: string;
  doubleGapCm?: number;
  /** Tailwind height class for the canvas container. Defaults to the tall designer view. */
  heightClassName?: string;
  /** 'demand' renders only on change/interaction — use for catalog grids with many canvases. */
  frameloop?: 'always' | 'demand';
  /** Catalog previews trade supersampling and large shadow maps for much lower GPU cost. */
  quality?: 'catalog' | 'full';
  /** Fires after the 3D scene (environment + model) has resolved inside Suspense. */
  onSceneReady?: () => void;
}

/** Mounts only after Suspense fallbacks resolve, so the parent can drop its skeleton. */
const SceneReadyNotifier = ({ onReady }: { onReady?: () => void }) => {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    /** frameloop="demand" (catalog grid) does not paint until invalidate() — GLB looked missing.
     *  Troika text fonts resolve in a nested Suspense after the first frame, so keep
     *  requesting draws until the inscription has had a chance to sync. */
    invalidate();
    const retries = [80, 250, 700].map((ms) => window.setTimeout(() => invalidate(), ms));
    const readyId = onReady ? requestAnimationFrame(() => onReady()) : 0;
    return () => {
      retries.forEach((id) => window.clearTimeout(id));
      if (readyId) cancelAnimationFrame(readyId);
    };
  }, [invalidate, onReady]);

  return null;
};

/** Frames the current stele + base so the monument fills the view without clipping. */
const FrameCamera = ({
  position,
  fov
}: {
  position: [number, number, number];
  fov: number;
}) => {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(position[0], position[1], position[2]);
    cam.fov = fov;
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, fov, invalidate, position]);

  return null;
};

export const MonumentViewer = ({
  heightClassName = 'h-[640px]',
  frameloop = 'always',
  quality = 'full',
  onSceneReady,
  ...props
}: MonumentViewerProps) => {
  const isCatalogQuality = quality === 'catalog';
  const layout = props.layout ?? 'single';
  /** These single stelas share the detailed Blender assembly and differ only in
   * the silhouette of the main upper slab. */
  const isDetailedGlb =
    (props.shape === 'classic' ||
      props.shape === 'rounded' ||
      props.shape === 'stele') &&
    layout !== 'double';
  const detailedModelUrl =
    props.shape === 'rounded'
      ? ROUNDED_MODEL_URL
      : props.shape === 'stele'
        ? STELE_MODEL_URL
      : '/models/classic-monument.glb';
  const presentation = getStonePresentationProfile(props.materialName);
  const fov = isCatalogQuality ? 26 : 28;
  const framing = useMemo(() => {
    const steleH = props.dimensions.heightCm / 100;
    const steleW = props.dimensions.widthCm / 100;
    const baseH = (props.baseDimensions?.heightCm ?? 20) / 100;
    const baseW = (props.baseDimensions?.widthCm ?? props.dimensions.widthCm) / 100;
    const totalH = steleH + baseH;
    const totalW = Math.max(steleW, baseW);
    const aspect = isCatalogQuality ? 1.2 : 1.35;
    const vHalf = Math.tan((fov * Math.PI) / 360);
    const hHalf = vHalf * aspect;
    const distForHeight = (totalH * 0.72) / vHalf;
    const distForWidth = (totalW * 1.28) / hHalf;
    const distance = (distForWidth * 0.55 + distForHeight * 0.45) * 1.08;
    const side = isDetailedGlb ? 0.18 : -0.22;
    return {
      position: [distance * side, totalH * 0.5, distance] as [number, number, number],
      target: [0, totalH * 0.45, 0] as [number, number, number],
      minDistance: Math.max(0.8, distance * 0.6),
      maxDistance: Math.max(4, distance * 2.6)
    };
  }, [
    fov,
    isCatalogQuality,
    isDetailedGlb,
    props.baseDimensions?.heightCm,
    props.baseDimensions?.widthCm,
    props.dimensions.heightCm,
    props.dimensions.widthCm
  ]);

  return (
    <div className={`${heightClassName} w-full overflow-hidden rounded-2xl border border-slate-200/30 bg-[#eceae8]`}>
      <Canvas
        frameloop={frameloop}
        shadows={{
          enabled: true,
          type: isCatalogQuality ? THREE.BasicShadowMap : THREE.PCFShadowMap
        }}
        dpr={isCatalogQuality ? 1 : [1, 2]}
        camera={{
          position: framing.position,
          fov,
          near: 0.05,
          far: 40
        }}
        gl={{
          antialias: !isCatalogQuality,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: presentation.exposure,
          outputColorSpace: THREE.SRGBColorSpace
        }}
      >
        <color attach="background" args={[presentation.sceneBackground]} />

        {/* Soft ambient — keeps shadow areas readable without washing out highlights */}
        <ambientLight intensity={0.22} />

        {/* Strong key light from upper-left — creates the sharp edge highlights on polished granite */}
        <directionalLight
          castShadow
          position={[-4.5, 8, 4]}
          intensity={4.0}
          shadow-mapSize={
            isCatalogQuality
              ? [512, 512]
              : [2048, 2048]
          }
          shadow-bias={-0.0001}
          shadow-normalBias={0.10}
          shadow-camera-left={-2.5}
          shadow-camera-right={2.5}
          shadow-camera-top={3}
          shadow-camera-bottom={-1}
          shadow-camera-near={0.1}
          shadow-camera-far={22}
        />

        {/* Soft right fill — illuminates right face without competing with key */}
        <directionalLight position={[4, 3, 2]} intensity={0.42} />

        {/* Low front-bottom fill — lifts base/plinth shadow slightly */}
        <directionalLight position={[0, -1, 4]} intensity={0.12} />

        <Suspense fallback={null}>
          <Environment preset="studio" environmentIntensity={presentation.environmentIntensity} />

          {presentation.rimLightIntensity > 0 ? (
            <directionalLight
              position={[0.8, 2.8, -5]}
              intensity={presentation.rimLightIntensity}
              color="#eef2f8"
            />
          ) : null}

          {/* Subtle ground shadow plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <shadowMaterial opacity={0.32} />
          </mesh>

          {isDetailedGlb ? (
            <ClassicMonumentModel
              modelUrl={detailedModelUrl}
              dimensions={props.dimensions}
              textureUrl={props.textureUrl}
              materialName={props.materialName}
              finish={props.finish}
              decoration={props.decoration}
              nicheStyle={props.nicheStyle}
              photoUrl={props.photoUrl}
              photoCrop={props.photoCrop}
              photoBrightness={props.photoBrightness}
              photoContrast={props.photoContrast}
              photoBlend={props.photoBlend}
              inscription={props.inscription}
              name={props.name}
              dates={props.dates}
              inscriptionStyle={props.inscriptionStyle}
              showCross={props.showCross}
              showFlowerbed={props.showFlowerbed}
              baseDimensions={props.baseDimensions}
            />
          ) : (
            <MonumentModel {...props} layout={layout} />
          )}

          <SceneReadyNotifier onReady={onSceneReady} />
          <FrameCamera position={framing.position} fov={fov} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={framing.minDistance}
          maxDistance={framing.maxDistance}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.05}
          target={framing.target}
          makeDefault
        />
      </Canvas>
    </div>
  );
};