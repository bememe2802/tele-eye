import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff8ff",
          100: "#dbeffe",
          200: "#bfe3fd",
          300: "#93d1fc",
          400: "#60b6f9",
          500: "#3b96f5",
          600: "#1d77ea",
          700: "#1761d8",
          800: "#194faf",
          900: "#1a448a",
          950: "#142b55",
        },
        sky: {
          400: "#38bdf8",
          500: "#0ea5e9",
        },
        teal: {
          400: "#2dd4bf",
          500: "#14b8a6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
        display: ["var(--font-cabinet)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      keyframes: {
        fadeIn: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideIn: { from: { transform: "translateX(-16px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        pulse2: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        fadeIn: "fadeIn 0.4s ease forwards",
        slideIn: "slideIn 0.3s ease forwards",
        shimmer: "shimmer 2s linear infinite",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
        float: "0 20px 60px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
