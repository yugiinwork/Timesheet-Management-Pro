/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  // darkMode: 'selector', // Removed in favor of CSS custom variant
  theme: {
    extend: {},
  },
  plugins: [],
}
