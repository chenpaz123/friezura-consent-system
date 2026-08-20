import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-heebo)", "Heebo", "Arial", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f2f7f5",
          100: "#dcebe4",
          200: "#b9d7ca",
          300: "#8fbead",
          400: "#5f9d89",
          500: "#3f8170",
          600: "#2f6759",
          700: "#275249",
          800: "#22423c",
          900: "#1e3733",
        },
      },
    },
  },
  plugins: [],
};

export default config;
