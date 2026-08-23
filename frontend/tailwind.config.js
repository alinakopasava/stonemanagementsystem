/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#080B12'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 60px rgba(148, 163, 184, 0.2)'
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
