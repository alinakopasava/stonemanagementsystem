import { Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
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

interface MonumentViewerProps {
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
  layout?: MonumentLayout;
  secondaryInscription?: string;
  secondaryName?: string;
  secondaryDates?: string;
  doubleGapCm?: number;
}

export const MonumentViewer = (props: MonumentViewerProps) => {
  return (
    <div className="h-[540px] w-full overflow-hidden rounded-2xl border border-slate-200/30 bg-[#eceae8]">
      <Canvas
        shadows={{ enabled: true, type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        camera={{ position: [-1.6, 1.7, 3.1], fov: 34 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
          outputColorSpace: THREE.SRGBColorSpace
        }}
      >
        <color attach="background" args={['#eceae8']} />

        {/* Soft ambient — keeps shadow areas readable without washing out highlights */}
        <ambientLight intensity={0.28} />

        {/* Strong key light from upper-left — creates the sharp edge highlights on polished granite */}
        <directionalLight
          castShadow
          position={[-4.5, 8, 4]}
          intensity={4.0}
          shadow-mapSize={[2048, 2048]}
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
        <directionalLight position={[4, 3, 2]} intensity={0.55} />

        {/* Low front-bottom fill — lifts base/plinth shadow slightly */}
        <directionalLight position={[0, -1, 4]} intensity={0.18} />

        <Suspense fallback={null}>
          {/* Studio preset: clean white-box environment — ideal for polished stone reflections */}
          <Environment preset="studio" />

          {/* Subtle ground shadow plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <shadowMaterial opacity={0.18} />
          </mesh>

          <MonumentModel {...props} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={1.4}
          maxDistance={6}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0.6, 0]}
          makeDefault
        />
      </Canvas>
    </div>
  );
};