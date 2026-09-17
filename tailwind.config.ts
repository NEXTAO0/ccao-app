/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        brand: {
          DEFAULT: "#2563eb",
          light: "#3b82f6",
          dark: "#1d4ed8",
          ink: "#0b1220",
        },
      },
      boxShadow: {
        glow: "0 0 40px -12px rgba(37, 99, 235, 0.45)",
      },
    },
  },
  plugins: [],
};