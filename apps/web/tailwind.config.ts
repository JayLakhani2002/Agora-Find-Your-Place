import type { Config } from "tailwindcss"

// Agora design tokens — see Business Planning/Agents/CLAUDE_frontendagent.md §Design Tokens
export default {
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0369A1", light: "#0EA5E9" },
        cta: "#22C55E",
        surface: "#F0F9FF",
        ink: "#0C4A6E",
        muted: "#475569",
        line: "#E2E8F0",
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 10px 25px rgba(3, 105, 161, 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config
