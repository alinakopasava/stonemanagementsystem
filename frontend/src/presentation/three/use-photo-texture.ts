import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Loads a user-provided portrait photo (data URL or http URL) into a THREE.Texture.
 * Returns `null` while loading or when no URL is provided. Disposes its own texture on change.
 */
export function usePhotoTexture(photoUrl: string | undefined): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const ownedTextureRef = useRef<THREE.Texture | null>(null);

  const disposeOwned = () => {
    ownedTextureRef.current?.dispose();
    ownedTextureRef.current = null;
  };

  useEffect(() => {
    const url = photoUrl?.trim();
    if (!url) {
      disposeOwned();
      setTexture(null);
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
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      () => {
        if (!cancelled) {
          disposeOwned();
          setTexture(null);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [photoUrl]);

  useEffect(
    () => () => {
      disposeOwned();
    },
    []
  );

  return texture;
}
