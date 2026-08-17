import type { Config } from "tailwindcss";

/**
 * PMFL Tailwind Config
 * -------------------------------------------
 * Brand palette inspired by NFL-style branding:
 *   navy   - primary background / brand
 *   red    - accent / alerts
 *   gold   - highlights / awards
 *   white  - text on dark
 *
 * Edit `theme.extend.colors.brand` to retune the palette.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            DEFAULT: "#0B1F3A",
            50: "#E6EBF2",
            100: "#C2CDDD",
            200: "#9AABC4",
            300: "#7289AB",
            400: "#4A6792",
            500: "#0B1F3A",
            600: "#091A30",
            700: "#071425",
            800: "#050E1A",
            900: "#03080F",
          },
          red: {
            DEFAULT: "#C8102E",
            50: "#FCE6EA",
            100: "#F7BCC4",
            500: "#C8102E",
            600: "#A50D26",
            700: "#820A1E",
          },
          gold: {
            DEFAULT: "#D4AF37",
            300: "#EAD27A",
            500: "#D4AF37",
            600: "#A88A2C",
            // Para el tema claro: el 300 sobre blanco da 1.3:1 de
            // contraste, ilegible. El 700 sube a 5.1:1.
            700: "#7A6320",
            800: "#5C4A18",
          },
        },
      },
      fontFamily: {
        display: ["Oswald", "Impact", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Sombras del tema claro: en navy suave. Una sombra negra al 60%
        // sobre fondo claro ensucia en vez de elevar.
        card: "0 1px 2px rgba(11,31,58,0.04), 0 10px 30px -14px rgba(11,31,58,0.18)",
        glow: "0 0 0 1px rgba(168,138,44,0.35), 0 8px 24px -12px rgba(11,31,58,0.25)",
        // Las de siempre, para el tema oscuro.
        cardDark: "0 10px 30px -10px rgba(0,0,0,0.6)",
        glowDark: "0 0 24px rgba(212, 175, 55, 0.25)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out both",
        "fade-in": "fadeIn 0.5s ease-out both",
        "slide-in": "slideIn 0.5s ease-out both",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
