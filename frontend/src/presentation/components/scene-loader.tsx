import { useEffect, useState } from 'react';

interface SceneLoaderProps {
  visible: boolean;
  label: string;
  variant?: 'compact' | 'full';
}

const MonumentSilhouette = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 160 168"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <ellipse cx="80" cy="158" rx="64" ry="7" fill="#c9c3bb" opacity="0.55" />
    <rect x="16" y="148" width="128" height="7" rx="1.5" fill="#9a938c" />
    <rect x="26" y="126" width="108" height="22" rx="2" fill="#8d8680" />
    <rect x="42" y="116" width="76" height="12" rx="1.5" fill="#7a746e" />
    <path
      d="M48 116V50c0-22 14-36 32-36s32 14 32 36v66H48Z"
      fill="#6f6964"
    />
    <path
      d="M54 114V52c0-17 11.5-28 26-28s26 11 26 28v62H54Z"
      fill="#8a837c"
    />
    <rect x="70" y="54" width="20" height="26" rx="10" fill="#5c5752" opacity="0.72" />
  </svg>
);

/** Studio-canvas overlay that sits on the 3D viewer until the scene is ready. */
export const SceneLoader = ({
  visible,
  label,
  variant = 'full'
}: SceneLoaderProps) => {
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
        'absolute inset-0 z-[3] flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200/30 bg-[#eceae8]',
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
        <MonumentSilhouette className="h-auto w-full drop-shadow-sm" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent motion-safe:animate-scene-shimmer motion-reduce:hidden" />
        </div>
      </div>

      {compact ? (
        <span className="sr-only">{label}</span>
      ) : (
        <>
          <p className="mt-6 font-serif text-base tracking-wide text-stone-600 sm:text-lg">
            {label}
          </p>
          <div className="mt-4 h-[2px] w-28 overflow-hidden rounded-full bg-stone-300/80">
            <div className="h-full w-1/3 bg-amber-700/70 motion-safe:animate-scene-bar motion-reduce:w-full" />
          </div>
        </>
      )}
    </div>
  );
};
