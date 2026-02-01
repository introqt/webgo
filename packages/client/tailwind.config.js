/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'board': '#DEB887',
        'board-dark': '#C4A46D',
        'stone-black': '#1a1a1a',
        'stone-white': '#f5f5f5',
      },
    },
  },
  plugins: [],
};
