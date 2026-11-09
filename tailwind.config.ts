import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sai: {
          navy: {
            950: "#050b14",
            900: "#0a192f",
            850: "#0d203d",
            800: "#132b4f",
            700: "#1e3a68",
            600: "#2a4d85",
          },
          cyan: {
            400: "#22d3ee",
            500: "#06b6d4",
            DEFAULT: "#00d2ff",
          },
          yellow: {
            400: "#facc15",
            500: "#eab308",
            DEFAULT: "#f59e0b",
          },
          red: {
            500: "#ef4444",
            600: "#dc2626",
          },
          green: {
            500: "#10b981",
            600: "#059669",
          }
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "score-bump": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "pulse-subtle": "pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "score-bump": "score-bump 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

