import type { Config } from "tailwindcss"

// Agora marketing site — design tokens per CLAUDE-agora-website.md §5 ("Sunlit stoa")
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marble: { DEFAULT: "#FAF8F3", deep: "#F0ECE3" },
        ink: { DEFAULT: "#14161B", soft: "#1E2128" },
        laurel: { DEFAULT: "#1F7A53", bright: "#2EA06C", text: "#176647" },
        amber: "#E8A33D",
        text: { DEFAULT: "#1A1C21", mute: "#5C6066", "on-ink": "#F2F0EA" },
        skin: "#E7C9A9",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        data: ["var(--font-data)", "monospace"],
      },
      fontSize: {
        h1: ["clamp(3rem, 7vw, 6.5rem)", { lineHeight: "1.02", letterSpacing: "0.02em" }],
        h2: ["clamp(2rem, 4vw, 3.5rem)", { lineHeight: "1.08", letterSpacing: "0.01em" }],
        eyebrow: ["0.8125rem", { lineHeight: "1.4", letterSpacing: "0.14em" }],
      },
      borderRadius: {
        DEFAULT: "16px",
        pill: "999px",
      },
      transitionTimingFunction: {
        "agora-out": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        fast: "200ms",
        base: "450ms",
        slow: "900ms",
      },
      maxWidth: {
        band: "1200px",
      },
    },
  },
  plugins: [],
} satisfies Config
