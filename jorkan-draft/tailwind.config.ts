import type { Config } from 'tailwindcss';

/**
 * Broadcast design tokens. Everything on screen is built from this palette so
 * the presentation reads as one production, not a collection of widgets.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep navy / near-black broadcast ground
        pitch: {
          950: '#03060E',
          900: '#060B18',
          850: '#091223',
          800: '#0C182E',
          700: '#12233F',
          600: '#1A3053',
          500: '#254069',
        },
        // Primary accent: broadcast gold
        gold: {
          400: '#FFD75E',
          500: '#F5C542',
          600: '#D9A21B',
          700: '#A87A0F',
        },
        // Secondary accent: electric blue used for motion + highlights
        volt: {
          400: '#5CC2FF',
          500: '#2E9BFF',
          600: '#1874D6',
        },
        // Urgency
        alert: {
          400: '#FF6B6B',
          500: '#E63946',
          600: '#B4232F',
        },
        // Position identity colours (subtle but distinct on the board)
        pos: {
          qb: '#E4572E',
          rb: '#2BB673',
          wr: '#2E9BFF',
          te: '#F2A03D',
          k: '#9B7BE0',
          def: '#6C8AA6',
          flex: '#23BFA5',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Archivo Narrow"', 'Impact', 'system-ui', 'sans-serif'],
        sans: ['Barlow', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Barlow Semi Condensed"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // TV-scale type ramp, driven by the root font-size set in index.css so
        // the whole layout scales from 1080p to 4K with one variable.
        'tv-xs': ['0.75rem', { lineHeight: '1.1' }],
        'tv-sm': ['1rem', { lineHeight: '1.1' }],
        'tv-md': ['1.5rem', { lineHeight: '1.05' }],
        'tv-lg': ['2.25rem', { lineHeight: '1' }],
        'tv-xl': ['3.5rem', { lineHeight: '0.95' }],
        'tv-2xl': ['5rem', { lineHeight: '0.92' }],
        'tv-3xl': ['7rem', { lineHeight: '0.88' }],
        'tv-4xl': ['9.5rem', { lineHeight: '0.85' }],
      },
      boxShadow: {
        panel: '0 1.5rem 4rem -1rem rgba(0,0,0,0.75)',
        glow: '0 0 3rem -0.5rem rgba(245,197,66,0.55)',
        'glow-volt': '0 0 3rem -0.5rem rgba(46,155,255,0.55)',
      },
      backgroundImage: {
        'panel-glass':
          'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 38%, rgba(255,255,255,0.01) 100%)',
        'field-glow':
          'radial-gradient(ellipse 120% 70% at 50% 0%, rgba(46,155,255,0.18) 0%, rgba(3,6,14,0) 62%)',
        'gold-rule': 'linear-gradient(90deg, rgba(245,197,66,0) 0%, #F5C542 18%, #FFD75E 50%, #F5C542 82%, rgba(245,197,66,0) 100%)',
      },
      keyframes: {
        'ticker-scroll': {
          from: { transform: 'translate3d(0,0,0)' },
          to: { transform: 'translate3d(-50%,0,0)' },
        },
        'pulse-urgent': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        sheen: {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)' },
          '100%': { transform: 'translateX(320%) skewX(-18deg)' },
        },
      },
      animation: {
        'ticker-scroll': 'ticker-scroll var(--ticker-duration,60s) linear infinite',
        'pulse-urgent': 'pulse-urgent 1s ease-in-out infinite',
        sheen: 'sheen 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
