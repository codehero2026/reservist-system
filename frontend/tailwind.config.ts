import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sidebar: "rgb(var(--sidebar-bg))",
        page:    "rgb(var(--page-bg))",
        card:    "rgb(var(--card-bg))",
        border:  "rgb(var(--border))",
        ink:     "rgb(var(--text-primary))",
        ink2:    "rgb(var(--text-secondary))",
        ink3:    "rgb(var(--text-muted))",
        // accent colours
        "ac-green":  "rgb(var(--c-green))",
        "ac-orange": "rgb(var(--c-orange))",
        "ac-yellow": "rgb(var(--c-yellow))",
        "ac-blue":   "rgb(var(--c-blue))",
        "ac-purple": "rgb(var(--c-purple))",
        "ac-red":    "rgb(var(--c-red))",
        "ac-teal":   "rgb(var(--c-teal))",
        "ac-pink":   "rgb(var(--c-pink))",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "1.4" }],
        xs:    ["11px", { lineHeight: "1.5" }],
        sm:    ["12px", { lineHeight: "1.5" }],
        base:  ["13px", { lineHeight: "1.5" }],
        md:    ["14px", { lineHeight: "1.5" }],
        lg:    ["16px", { lineHeight: "1.4" }],
        xl:    ["20px", { lineHeight: "1.3" }],
        "2xl": ["24px", { lineHeight: "1.2" }],
        "3xl": ["30px", { lineHeight: "1.1" }],
      },
      boxShadow: {
        card: "0 2px 8px rgb(0 0 0 / 0.06)",
        "card-md": "0 4px 16px rgb(0 0 0 / 0.08)",
        "card-lg": "0 8px 32px rgb(0 0 0 / 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
