import type { Config } from "tailwindcss"

/**
 * Agora marketing site — design tokens v5, "indigo & apricot on ivory".
 * Chosen by Jay 2026-08-04 (Wobo reference). Explicitly NO green and NO black: the darkest
 * surface is `ink` #1E1B3A, a deep indigo, and every neutral is warm rather than grey.
 *
 * Canvas rule: the page is light-dominant. Dark appears as CARDS and the terminal, plus one
 * closing band — never as alternating full-width bands.
 *
 * Contrast, measured not estimated (AA needs 4.5:1 body, 3:1 large):
 *   text/ivory 16.26 AAA · mute/ivory 7.55 AAA · soft/ivory 5.72 · indigo/ivory 5.93
 *   indigo-deep/ivory 7.45 AAA · white/indigo 6.29 · apricot-ink/ivory 5.89
 *   on-dark/ink 14.09 AAA · on-dark-mute/ink 6.74 · indigo-soft/ink 8.25 AAA
 *   apricot/ink 8.14 AAA · on-dark/ink-card 12.63 AAA · indigo-soft/ink-card 7.39 AAA
 * `apricot` is 1.91 on ivory — decoration ONLY there (rules, glows, dots). Never text.
 * `apricot.ink` is the text-safe apricot for light surfaces.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "#FAF8F4", // page canvas — warm ivory
          deep: "#F3EFE8", // insets, section washes
          line: "#E7E1D6", // hairlines on ivory
        },
        ink: {
          DEFAULT: "#1E1B3A", // deep indigo — dark cards, the terminal, the closing band
          card: "#272348", // raised surfaces on ink
          line: "#39345E", // hairlines on ink
        },
        indigo: {
          DEFAULT: "#4F46E5", // primary actions, links, active states
          deep: "#4338CA", // hover / pressed
          soft: "#A9B2FF", // indigo-family text ON ink (AA-safe)
          wash: "#EEEDFD", // indigo-tinted surface on ivory
        },
        apricot: {
          DEFAULT: "#FF9F5A", // warm accent — decoration only on ivory
          soft: "#FFC49A", // apricot text on ink
          ink: "#9A4A12", // the only apricot allowed as text on ivory
          wash: "#FDF0E6", // apricot-tinted surface on ivory
        },
        text: {
          DEFAULT: "#1A1830",
          mute: "#514D6B",
          soft: "#635F7C", // 5.72 on ivory — safe down to 13px labels
          "on-dark": "#EDECF7",
          "on-dark-mute": "#A6A2C4",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        data: ["var(--font-data)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Sora runs wider and taller than the previous face, so the display scale is
        // pulled back slightly and tracking tightened to keep hero lines from wrapping.
        d1: ["clamp(2.5rem, 5.9vw, 5.25rem)", { lineHeight: "1.02", letterSpacing: "-0.035em" }],
        d2: ["clamp(2rem, 4.1vw, 3.25rem)", { lineHeight: "1.08", letterSpacing: "-0.03em" }],
        d3: ["clamp(1.4375rem, 2.3vw, 2rem)", { lineHeight: "1.16", letterSpacing: "-0.024em" }],
        quote: [
          "clamp(1.4375rem, 2.9vw, 2.125rem)",
          { lineHeight: "1.28", letterSpacing: "-0.02em" },
        ],
        lead: ["clamp(1.0625rem, 1.2vw, 1.25rem)", { lineHeight: "1.62" }],
        eyebrow: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.16em" }],
        micro: ["0.8125rem", { lineHeight: "1.5" }],
      },
      spacing: {
        band: "clamp(4.5rem, 8vw, 7.5rem)",
        "band-lg": "clamp(5.5rem, 11vw, 10rem)",
      },
      maxWidth: {
        shell: "1320px",
        prose: "62ch",
      },
      borderRadius: {
        card: "20px",
        frame: "14px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,27,58,0.04), 0 10px 30px -18px rgba(30,27,58,0.22)",
        float: "0 2px 4px rgba(30,27,58,0.04), 0 28px 60px -24px rgba(30,27,58,0.32)",
        lift: "0 2px 6px rgba(30,27,58,0.05), 0 18px 40px -20px rgba(30,27,58,0.28)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "300ms",
        slow: "600ms",
      },
    },
  },
  plugins: [],
} satisfies Config
