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
        /*
         * Broadcast on paper.
         *
         * The presentation reads on a white ground with solid, printed-looking
         * colour - the palette of a printed programme or a stadium scoreboard
         * graphic rather than a glowing dashboard. Nothing here is a neon: every
         * accent is a flat ink that holds its weight on white and survives a
         * television's contrast handling.
         */
        paper: '#FFFFFF',

        // The one foreground colour. Opacity does the rest of the work, which
        // is why almost everything on screen is `text-ink/70` and friends.
        ink: '#16222F',

        /*
         * Ink at fixed strengths, as real colours rather than `ink/10`.
         *
         * `@apply` will not resolve an opacity modifier on a custom colour on
         * every Tailwind build - it failed on a clean Windows install while
         * compiling fine here - and index.css is exactly where that breaks the
         * whole stylesheet and leaves the presentation unstyled. Utilities in
         * markup can still say `text-ink/45`; anything inside `@apply` uses
         * these.
         */
        line: 'rgba(22,34,47,0.10)',
        'line-strong': 'rgba(22,34,47,0.16)',
        muted: 'rgba(22,34,47,0.55)',

        // Surfaces, lightest first: the page, panels, raised fills, rules.
        surface: {
          950: '#FFFFFF',
          900: '#FBFCFD',
          850: '#F3F5F8',
          800: '#E9ECF1',
          700: '#DCE1E8',
          600: '#C7CEDA',
          500: '#AEB8C7',
        },

        // Primary accent: a solid bronze-gold that stays legible on white.
        gold: {
          300: '#E2B245',
          400: '#C8901A',
          500: '#A67512',
          600: '#875E0D',
          700: '#63450A',
        },
        // Secondary accent: a flat navy blue for motion and highlights.
        volt: {
          400: '#356FAF',
          500: '#20548C',
          600: '#173F6B',
        },
        // Urgency.
        alert: {
          400: '#C13A29',
          500: '#A22A1C',
          600: '#7B2015',
        },
        // Position identity colours, weighted for a white ground.
        pos: {
          qb: '#B04724',
          rb: '#1C7548',
          wr: '#1D5C9F',
          te: '#A06C10',
          k: '#66499B',
          def: '#465C6E',
          flex: '#0F7566',
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
        'tv-xs': ['0.82rem', { lineHeight: '1.1' }],
        'tv-sm': ['1.08rem', { lineHeight: '1.1' }],
        'tv-md': ['1.62rem', { lineHeight: '1.05' }],
        'tv-lg': ['2.4rem', { lineHeight: '1' }],
        'tv-xl': ['3.75rem', { lineHeight: '0.95' }],
        'tv-2xl': ['5.4rem', { lineHeight: '0.92' }],
        'tv-3xl': ['7.5rem', { lineHeight: '0.88' }],
        'tv-4xl': ['10.2rem', { lineHeight: '0.85' }],
      },
      boxShadow: {
        /*
         * Weight, not glow. A printed panel sits on the page with a hairline
         * and the faintest lift; it does not radiate.
         */
        panel: '0 0.0625rem 0.125rem rgba(22,34,47,0.05), 0 0.75rem 1.75rem -0.75rem rgba(22,34,47,0.16)',
        glow: '0 0 0 0.125rem rgba(166,117,18,0.28)',
        'glow-volt': '0 0 0 0.125rem rgba(32,84,140,0.24)',
      },
      backgroundImage: {
        'panel-glass': 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FB 100%)',
        'field-glow': 'linear-gradient(180deg, #FFFFFF 0%, #F4F6F9 100%)',
        'gold-rule': 'linear-gradient(90deg, #A67512 0%, #A67512 100%)',
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
      },
      animation: {
        'ticker-scroll': 'ticker-scroll var(--ticker-duration,60s) linear infinite',
        'pulse-urgent': 'pulse-urgent 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
