/**
 * Tailwind CSS Configuration — Vox DPSI
 *
 * Color system derived from DPS Indore's official brand:
 *   - Primary green  #1B4D2B  (shield color from the school logo)
 *   - Gold accent    #C9920A  (torch flame from the school logo)
 *
 * These replace the original navy (#003366) used in v1.
 * Every component uses Tailwind utilities + the custom tokens below.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  // Tell Tailwind which files to scan for class names.
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],

  theme: {
    extend: {

      /* ── Brand Color Tokens ───────────────────────────────────────────── */
      colors: {
        // DPS Indore forest green — primary brand color
        green: {
          DEFAULT: '#1B4D2B',   // shield / main brand
          hover:   '#163D22',   // darker hover state
          light:   '#2A6B3F',   // slightly lighter for gradients
          50:      '#EEF2EC',   // surface / page background
          100:     '#D5E4D9',
          200:     '#A9C9B2',
          300:     '#7DAF8B',
          400:     '#519464',
          500:     '#1B4D2B',   // DEFAULT
          600:     '#163D22',
          700:     '#112E1A',
          800:     '#0B1E11',
          900:     '#060F09',
        },

        // DPS Indore warm gold — accent / highlights
        gold: {
          DEFAULT: '#C9920A',   // torch flame
          light:   '#F0B429',   // lighter version
          lighter: '#FDE68A',   // very light bg tint
          dark:    '#9A6F07',   // darker hover
        },

        // Semantic surface colors
        surface: {
          DEFAULT: '#EEF2EC',   // page background (warm green-tinted off-white)
          card:    '#FFFFFF',   // card backgrounds
        },
      },

      /* ── Typography ───────────────────────────────────────────────────── */
      fontFamily: {
        // Outfit is used for the brand feel; falls back to system sans-serif
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },

      /* ── Custom Box Shadows ───────────────────────────────────────────── */
      boxShadow: {
        // Subtle card shadow with green tint
        'card':   '0 4px 24px rgba(27, 77, 43, 0.07)',
        // Heavier shadow for modals / dialogs
        'modal':  '0 24px 64px rgba(27, 77, 43, 0.18), 0 4px 16px rgba(0,0,0,0.08)',
        // Nav shadow
        'nav':    '0 2px 16px rgba(27, 77, 43, 0.12)',
      },

      /* ── Border Radius ────────────────────────────────────────────────── */
      borderRadius: {
        'xl2': '20px',
        'xl3': '28px',
      },

      /* ── Backdrop Blur ────────────────────────────────────────────────── */
      backdropBlur: {
        'xs':  '4px',
        'xl2': '32px',
      },
    },
  },

  plugins: [],
}
