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
        gray: "#404040",
        surface: "#141414",
        "surface-2": "#1A1A1A",
        border: "#262626",
        blue: "#012EDC",
        yellow: "#FFBE00",
        lime: "#FFBE00", /* alias para compatibilidad; mismo que yellow */
        white: "#FFFFFF",
        muted: "#737373",
      },
    },
  },
  plugins: [],
};

