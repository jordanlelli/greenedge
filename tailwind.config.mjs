import intake from "./client-intake.json";

const brand = intake.style?.brand || "#1F3D2B";
const paper = "#FAFAF7";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: brand,
          dark: intake.style?.brandDark || "#0F2417",
        },
        accent: {
          DEFAULT: intake.style?.accent || "#C2410C",
        },
        highlight: {
          DEFAULT: intake.style?.highlight || "#65A30D",
        },
        paper,
        tint: {
          DEFAULT: `color-mix(in srgb, ${brand} 5%, ${paper} 95%)`,
        },
        bg: {
          DEFAULT: paper,
        },
        card: {
          DEFAULT: "#FFFFFF",
        },
        ink: {
          DEFAULT: "#1F2937",
        },
        muted: {
          DEFAULT: "#6B7280",
        },
        border: {
          DEFAULT: "rgba(31, 61, 43, 0.12)",
        },
      },
      fontFamily: {
        heading: ['"Fraunces"', "Georgia", "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
