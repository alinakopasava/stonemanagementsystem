import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { MonumentModel } from './monument-model';
import type { InscriptionStyleHints, MonumentDimensionsCm } from './monument-model';
import type { FinishType } from '@domain/entities/order-card';

interface MonumentViewerProps {
  textureUrl: string;
  materialName?: string;
  finish: FinishType;
  dimensions: MonumentDimensionsCm;
  inscription: string;
  name?: string;
  dates?: string;
  inscriptionStyle?: InscriptionStyleHints;
}

const ViewerFallback = () => (
  <mesh>
    <boxGeometry args={[0.6, 1.2, 0.15]} />
    <meshStandardMaterial color="#3f4a5c" />
  </mesh>
);

export const MonumentViewer = (props: MonumentViewerProps) => {
  return (
    <div className="h-[540px] w-full overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 to-slate-950">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [2, 1.8, 3.2], fov: 35 }}
      >
        <color attach="background" args={['#0b1220']} />

        <ambientLight intensity={0.35} />
        <directionalLight
          castShadow
          position={[4, 6, 4]}
          intensity={1.2}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-3, 4, -2]} intensity={0.25} />

        <Suspense fallback={<ViewerFallback />}>
          <Environment preset="city" />
          <MonumentModel {...props} />
          <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={6} blur={2.2} far={4} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={1.6}
          maxDistance={6}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.15}
          target={[0, 0.6, 0]}
          makeDefault
        />
      </Canvas>
    </div>
  );
};
