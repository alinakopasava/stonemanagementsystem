import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { SceneLoader } from '@presentation/components/scene-loader';
import type { MonumentViewerProps } from '@presentation/three/monument-viewer';

const MonumentViewer = lazy(() =>
  import('@presentation/three/monument-viewer').then((mod) => ({ default: mod.MonumentViewer }))
);

interface LazyMonumentViewerProps extends MonumentViewerProps {
  label: string;
  variant?: 'compact' | 'full';
  /** Mount the WebGL canvas only after the wrapper is near the viewport. */
  deferUntilVisible?: boolean;
  rootMargin?: string;
}

/**
 * Lazy-loads the Three.js viewer chunk and keeps a studio overlay up until the
 * environment and model have resolved. Catalog cards pass `deferUntilVisible`.
 */
export const LazyMonumentViewer = ({
  label,
  variant = 'full',
  deferUntilVisible = false,
  rootMargin = '250px',
  heightClassName = 'h-[540px]',
  onSceneReady,
  ...viewerProps
}: LazyMonumentViewerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(!deferUntilVisible);
  const [sceneReady, setSceneReady] = useState(false);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
    onSceneReady?.();
  }, [onSceneReady]);

  useEffect(() => {
    if (!deferUntilVisible) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        setInView(visible);
        if (!visible) setSceneReady(false);
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [deferUntilVisible, rootMargin]);

  useEffect(() => {
    if (!inView || sceneReady) return;
    const id = window.setTimeout(() => setSceneReady(true), 8000);
    return () => window.clearTimeout(id);
  }, [inView, sceneReady]);

  return (
    <div ref={ref} className={`relative w-full ${heightClassName}`}>
      {inView ? (
        <Suspense fallback={null}>
          <MonumentViewer
            {...viewerProps}
            quality={variant === 'compact' ? 'catalog' : 'full'}
            heightClassName={heightClassName}
            onSceneReady={handleSceneReady}
          />
        </Suspense>
      ) : null}
      <SceneLoader visible={!sceneReady} label={label} variant={variant} />
    </div>
  );
};
