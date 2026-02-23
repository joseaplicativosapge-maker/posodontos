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
          50:  '#e6f9f0',
          100: '#ccf2e0',
          200: '#99e6c2',
          300: '#66d9a3',
          400: '#33cc85',
          500: '#00b36b',
          600: '#00995c',
          700: '#007a49',
          800: '#005c36',
          900: '#003d24',
        }
      }
    }
  },
  plugins: []
}