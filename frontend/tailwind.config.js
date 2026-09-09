/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b9d0ff",
          300: "#8bb0ff",
          400: "#5a86ff",
          500: "#3660fa",
          600: "#2444ef",
          700: "#1d34cf",
          800: "#1e2ea6",
          900: "#1e2c83",
        },
      },
    },
  },
  plugins: [],
};
