/** @type {import('tailwindcss').Config} */
export default {
  content: [
     "./index.html",
    "./**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e6f2ff',
          100: '#cce5ff',
          200: '#99ccff',
          300: '#66b2ff',
          400: '#3399ff',
          500: '#0073e6',
          600: '#0066cc',
          700: '#0052a3',
          800: '#003d7a',
          900: '#002952',
        }
      }
    }
  },
  plugins: []
}