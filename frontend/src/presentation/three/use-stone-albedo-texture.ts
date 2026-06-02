import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildStoneTexture } from './stone-textures';

/**
 * Loads the same image used in the material picker; falls back to procedural on failure.
 * Does not dispose cached procedural CanvasTextures from {@link buildStoneTexture}.
 */
export function useStoneAlbedoTexture(textureUrl: string | undefined, materialName: string | undefined) {
  const [map, setMap] = useState<THREE.Texture>(() => buildStoneTexture(materialName));
  const ownedTextureRef = useRef<THREE.Texture | null>(null);

  const disposeOwned = () => {
    ownedTextureRef.current?.dispose();
    ownedTextureRef.current = null;
  };

  useEffect(() => {
    const url = textureUrl?.trim();
    if (!url) {
      disposeOwned();
      setMap(buildStoneTexture(materialName));
      return;
    }

    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        disposeOwned();
        ownedTextureRef.current = tex;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        setMap(tex);
      },
      undefined,
      () => {
        if (!cancelled) {
          disposeOwned();
          setMap(buildStoneTexture(materialName));
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [textureUrl, materialName]);

  useEffect(
    () => () => {
      disposeOwned();
    },
    []
  );

  return map;
}
