import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@application/i18n/i18n-context';
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
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(!deferUntilVisible);
  const [sceneReady, setSceneReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
    setTimedOut(false);
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
        if (!visible) {
          setSceneReady(false);
          setTimedOut(false);
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [deferUntilVisible, rootMargin]);

  useEffect(() => {
    if (!inView || sceneReady) return;
    const id = window.setTimeout(() => setTimedOut(true), 15000);
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
      <SceneLoader
        visible={!sceneReady}
        label={timedOut ? t('catalog.previewError') : label}
        variant={variant}
      />
    </div>
  );
};
