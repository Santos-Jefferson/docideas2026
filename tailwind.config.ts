import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Capsyl-inspired palette: clean white surfaces + friendly blue brand.
        brand: {
          50: "#eef6ff",
          100: "#d9ebff",
          200: "#bcdcff",
          300: "#8ec6ff",
          400: "#59a6ff",
          500: "#2f86f6", // primary
          600: "#1d6fe0",
          700: "#1858b8",
          800: "#194b94",
          900: "#1a4179",
        },
        canvas: "#f4f7fb",
        surface: "#ffffff",
        ink: "#0f1b2d",
        muted: "#64748b",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 27, 45, 0.04), 0 8px 24px rgba(15, 27, 45, 0.06)",
        soft: "0 1px 3px rgba(15, 27, 45, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
