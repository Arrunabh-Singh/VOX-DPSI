/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#003366',
          50: '#e6edf5',
          100: '#ccd9eb',
          200: '#99b3d7',
          300: '#668ec2',
          400: '#3368ae',
          500: '#003366',
          600: '#002952',
          700: '#001f3d',
          800: '#001429',
          900: '#000a14',
        },
        gold: {
          DEFAULT: '#FFD700',
          light: '#FFF3B0',
          dark: '#B8970A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
