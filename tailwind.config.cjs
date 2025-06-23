/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mint': {
          'start': '#8FFAD4',
          'end': '#2EC4B6',
        }
      }
    },
  },
  plugins: [],
}
