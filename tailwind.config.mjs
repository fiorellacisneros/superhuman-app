/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        manrope: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        "work-sans": ["Work Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        background: "#0D0D0D",
        surface: "#141414",
        "surface-2": "#1A1A1A",
        border: "#262626",
        lime: "#C6F135",
        white: "#FFFFFF",
        muted: "#737373",
      },
    },
  },
  plugins: [],
};

