import { useEffect, useState } from 'react';

interface SceneLoaderProps {
  visible: boolean;
  label: string;
  variant?: 'compact' | 'full';
}

const MonumentSilhouette = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 160 168" fill="none" aria-hidden="true" className={className}>
    <ellipse cx="80" cy="158" rx="64" ry="7" fill="currentColor" fillOpacity="0.10" />
    <rect x="16" y="148" width="128" height="7" rx="1.5" fill="currentColor" fillOpacity="0.30" />
    <rect x="26" y="126" width="108" height="22" rx="2" fill="currentColor" fillOpacity="0.36" />
    <rect x="42" y="116" width="76" height="12" rx="1.5" fill="currentColor" fillOpacity="0.44" />
    <path d="M48 116V50c0-22 14-36 32-36s32 14 32 36v66H48Z" fill="currentColor" fillOpacity="0.52" />
    <path d="M54 114V52c0-17 11.5-28 26-28s26 11 26 28v62H54Z" fill="currentColor" fillOpacity="0.38" />
    <rect x="70" y="54" width="20" height="26" rx="10" fill="currentColor" fillOpacity="0.58" />
  </svg>
);

/** Studio-canvas overlay that sits on the 3D viewer until the scene is ready. */
export const SceneLoader = ({ visible, label, variant = 'full' }: SceneLoaderProps) => {
  const [mounted, setMounted] = useState(visible);
  const compact = variant === 'compact';

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      aria-busy={visible}
      onTransitionEnd={() => {
        if (!visible) setMounted(false);
      }}
      className={[
        'absolute inset-0 z-[3] flex flex-col items-center justify-center overflow-hidden bg-surface-2',
        'transition-opacity duration-500 ease-out',
        visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      ].join(' ')}
    >
      <div
        className={[
          'relative motion-safe:animate-scene-breathe',
          compact ? 'w-32' : 'w-40 sm:w-52'
        ].join(' ')}
      >
        <MonumentSilhouette className="h-auto w-full text-ink" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-surface/70 to-transparent motion-safe:animate-scene-shimmer motion-reduce:hidden" />
        </div>
      </div>

      {compact ? (
        <span className="sr-only">{label}</span>
      ) : (
        <>
          <p className="mt-6 u-display text-base text-ink-2 sm:text-lg">{label}</p>
          <div className="mt-4 h-px w-28 overflow-hidden bg-line-strong">
            <div className="h-full w-1/3 bg-brand motion-safe:animate-scene-bar motion-reduce:w-full" />
          </div>
        </>
      )}
    </div>
  );
};
