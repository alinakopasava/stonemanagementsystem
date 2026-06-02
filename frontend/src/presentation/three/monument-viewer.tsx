import { Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { MonumentModel } from './monument-model';
import type {
  InscriptionStyleHints,
  MonumentDimensionsCm,
  MonumentShape
} from './monument-model';
import type { FinishType } from '@domain/entities/order-card';

interface MonumentViewerProps {
  textureUrl?: string;
  materialName?: string;
  finish: FinishType;
  dimensions: MonumentDimensionsCm;
  inscription: string;
  name?: string;
  dates?: string;
  inscriptionStyle?: InscriptionStyleHints;
  shape?: MonumentShape;
  showCross?: boolean;
}

export const MonumentViewer = (props: MonumentViewerProps) => {
  return (
    <div className="h-[540px] w-full overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 to-slate-950">
      <Canvas
        /* PCFShadowMap: PCFSoft jest przestarzały w Three ≥ r183 i bywa mapowany na PCF. */
        shadows={{ enabled: true, type: THREE.PCFShadowMap }}
        dpr={[1, 2]}
        camera={{ position: [2, 1.8, 3.2], fov: 35 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace
        }}
        onCreated={(state) => {
          if (!import.meta.env.DEV) return;
          const gl = state.gl;
          console.debug('[MonumentViewer] scena 3D', {
            shadowMapEnabled: gl.shadowMap?.enabled,
            shadowMapType: gl.shadowMap?.type,
            toneMapping: gl.toneMapping,
            note: 'Headstone: receiveShadow wyłączone w monument-model — cień kierunkowy nie nakłada się na czolo tablicy.'
          });
        }}
      >
        <color attach="background" args={['#0b1220']} />

        {/* Światło otoczenia - lekko podbite dla lepszej widoczności detali kamienia */}
        <ambientLight intensity={0.5} />
        
        {/* Główne światło rzucające cień */}
        <directionalLight
          castShadow
          position={[5, 8, 5]}
          intensity={1.8}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
          shadow-normalBias={0.12}
          
          // Zawężenie obszaru cienia do granic pomnika poprawia jego jakość
          shadow-camera-left={-2}
          shadow-camera-right={2}
          shadow-camera-top={2}
          shadow-camera-bottom={-2}
          shadow-camera-near={0.1}
          shadow-camera-far={20}
        />
        
        {/* Światło doświetlające tył i boki, aby model nie był płaski */}
        <directionalLight position={[-4, 3, -2]} intensity={0.4} />

        <Suspense fallback={null}>
          <Environment preset="city" />
          <MonumentModel {...props} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={1.4}
          maxDistance={6}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0.5, 0]} // Celowanie w środek pomnika
          makeDefault
        />
      </Canvas>
    </div>
  );
};