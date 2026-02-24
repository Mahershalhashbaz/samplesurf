import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "var(--brand-primary)",
        violet: "var(--brand-violet)",
        coral: "var(--brand-coral)",
        "coral-soft": "var(--brand-coral-soft)",
        anchor: "var(--anchor)",
        ink: "var(--ink)",
        slate1: "var(--slate1)",
        slate2: "var(--slate2)",
        canvas: "var(--canvas)",
        card: "var(--card)",
        ice: "var(--ice)",
        blush: "var(--blush)",
      },
      boxShadow: {
        soft: "0 18px 40px rgba(40, 40, 59, 0.08)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
