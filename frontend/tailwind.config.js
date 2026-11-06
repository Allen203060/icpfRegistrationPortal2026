/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // User-Specified Precision Palette
        slateVoid: '#06141B',      // Darkest slate black (dark background)
        slateMidnight: '#11212D',  // Deep charcoal navy (card / surface dark)
        slateElevated: '#253745',  // Slate navy (borders / secondary surface)
        slateSteel: '#4A5C6A',     // Cool slate blue (accent / muted border)
        slateMuted: '#9BA8AB',     // Cool silver gray (secondary text / light border)
        slateFrost: '#CCD0CF',     // Frost white (light mode bg / dark mode text)
        icpf: {
          50: '#CCD0CF',
          100: '#9BA8AB',
          500: '#4A5C6A',
          600: '#253745',
          700: '#11212D',
          800: '#06141B',
        }
      },
      transitionTimingFunction: {
        'out-custom': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out-custom': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card-dark': '0 4px 20px -2px rgba(6, 20, 27, 0.5), 0 0 0 1px rgba(74, 92, 106, 0.25)',
        'card-light': '0 4px 20px -2px rgba(17, 33, 45, 0.08), 0 0 0 1px rgba(155, 168, 171, 0.3)',
      }
    },
  },
  plugins: [],
}
