/** @type {import('tailwindcss').Config} */

/**
 * Every colour resolves to a CSS variable declared in
 * `src/presentation/design/tokens.css`, so light and dark mode are one
 * definition rather than a `dark:` variant on every utility. The
 * `<alpha-value>` placeholder keeps modifiers like `bg-surface/70`
 * working.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),

        /* Nested scales, so each family reads as one thing here and still
           spells out as `bg-surface-2`, `text-ink-3`, `border-line-strong`. */
        surface: { DEFAULT: token('surface'), 2: token('surface-2') },

        ink: { DEFAULT: token('ink'), 2: token('ink-2'), 3: token('ink-3') },

        line: { DEFAULT: token('line'), strong: token('line-strong') },

        brand: {
          DEFAULT: token('brand'),
          strong: token('brand-strong'),
          soft: token('brand-soft'),
          ink: token('brand-ink')
        },

        band: { DEFAULT: token('band'), ink: token('band-ink') },

        positive: { DEFAULT: token('positive'), soft: token('positive-soft') },
        critical: { DEFAULT: token('critical'), soft: token('critical-soft') },
        notice: { DEFAULT: token('notice'), soft: token('notice-soft') },
        info: { DEFAULT: token('info'), soft: token('info-soft') }
      },

      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-body)',
        mono: 'var(--font-mono)'
      },

      /* Shape lock: cut stone has edges. Radius 0 is the system; the
         segmented language control opts out with `rounded-full`. */
      borderRadius: {
        DEFAULT: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px'
      },

      /* Three levels, each tied to a meaning, all tinted to the ground
         hue rather than pure black. */
      boxShadow: {
        raised: '0 1px 2px rgb(38 44 41 / 0.06), 0 1px 1px rgb(38 44 41 / 0.04)',
        overlay: '0 8px 24px -8px rgb(38 44 41 / 0.18), 0 2px 6px rgb(38 44 41 / 0.06)',
        modal: '0 24px 64px -16px rgb(38 44 41 / 0.28)'
      },

      maxWidth: {
        prose: '65ch'
      },

      keyframes: {
        'scene-shimmer': {
          '0%': { transform: 'translateX(-140%) skewX(-12deg)' },
          '100%': { transform: 'translateX(240%) skewX(-12deg)' }
        },
        'scene-breathe': {
          '0%, 100%': { opacity: '0.62' },
          '50%': { opacity: '1' }
        },
        'scene-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' }
        }
      },
      animation: {
        'scene-shimmer': 'scene-shimmer 1.85s ease-in-out infinite',
        'scene-breathe': 'scene-breathe 2.8s ease-in-out infinite',
        'scene-bar': 'scene-bar 1.35s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
