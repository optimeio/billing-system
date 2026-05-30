/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,vue,html}"
  ],
  theme: {
    extend: {},
  },
  corePlugins: {
    backdropFilter: true,
  },
  safelist: [
    "backdrop-blur-xl",
  ],
};
