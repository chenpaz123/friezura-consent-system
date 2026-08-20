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
        // A pink-to-purple (fuchsia) scale: pairs with the soft pink page
        // backgrounds (literal Tailwind `pink-*`) while its darker end
        // matches the brand's deep-purple logo.
        brand: {
          50: "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf",
          800: "#86198f",
          900: "#701a75",
        },
      },
    },
  },
  plugins: [],
};

export default config;
