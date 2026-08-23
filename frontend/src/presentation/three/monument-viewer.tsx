import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { ClassicMonumentModel } from './classic-monument-model';
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
  stoneContrast?: number;
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
    /** frameloop="demand" (catalog grid) does not paint until invalidate() — GLB looked missing. */
    invalidate();
    if (!onReady) return;
    const id = requestAnimationFrame(() => onReady());
    return () => cancelAnimationFrame(id);
  }, [invalidate, onReady]);

  return null;
};

export const MonumentViewer = ({
  heightClassName = 'h-[540px]',
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
      ? '/models/rounded-monument.glb'
      : props.shape === 'stele'
        ? '/models/modern-stele-monument.glb'
      : '/models/classic-monument.glb';
  const presentation = getStonePresentationProfile(props.materialName);

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
          position: isDetailedGlb ? [1.7, 1.35, 3.6] : [-1.6, 1.7, 3.1],
          fov: 34
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
              stoneContrast={props.stoneContrast}
              decoration={props.decoration}
              photoUrl={props.photoUrl}
              photoCrop={props.photoCrop}
              photoBrightness={props.photoBrightness}
              photoContrast={props.photoContrast}
              photoBlend={props.photoBlend}
            />
          ) : (
            <MonumentModel {...props} layout={layout} />
          )}

          <SceneReadyNotifier onReady={onSceneReady} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={1.4}
          maxDistance={6}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.1}
          target={isDetailedGlb ? [0, 0.95, 0] : [0, 0.6, 0]}
          makeDefault
        />
      </Canvas>
    </div>
  );
};