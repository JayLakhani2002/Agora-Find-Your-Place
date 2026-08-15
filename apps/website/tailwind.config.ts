import type { Config } from "tailwindcss"

/**
 * Agora marketing site — design tokens v6, "Warm Ink". Chosen by Jay 2026-08-06.
 *
 * Replaces v5's "indigo & apricot on ivory". The indigo went for a strategic reason, not a
 * taste one: #4F46E5 is Tailwind's stock indigo-500, and a competitive scan of twelve AI
 * job platforms (Tsenta, Simplify, Jobscan, Huntr, Careerflow, AIApply, LazyApply, Jobright,
 * Final Round AI, Welcome to the Jungle et al) found every single one using blue or teal.
 * Blue is the category uniform. Terracotta is not.
 *
 * ONE chromatic family (`clay`), Linear-style — everything else is a warm neutral. The accent
 * is reserved for encouragement moments (match found, application sent) and primary actions.
 * Persistent chrome stays neutral, so warmth reads as earned rather than decorative.
 *
 * Still binding from v5: NO green (it is load-bearing in the app's eligibility ticks and must
 * not be diluted into brand chrome) and NO pure black — `ink` is a warm near-black.
 *
 * Canvas rule unchanged: light-dominant. Dark appears as CARDS and one closing band, never as
 * alternating full-width bands.
 *
 * Contrast, computed not estimated (AA needs 4.5:1 body, 3:1 large):
 *   text/ivory 16.23 AAA · mute/ivory 7.52 AAA · soft/ivory 5.43 AA · clay/ivory 4.77 AA
 *   clay-deep/ivory 6.87 AA · white/clay 5.06 AA · white/clay-deep 7.29 AAA
 *   on-dark/ink 16.19 AAA · on-dark-mute/ink 7.75 AAA · clay-soft/ink 6.81 AA
 *   on-dark/ink-card 14.58 AAA · clay-soft/ink-card 6.13 AA · text/ivory-deep 15.02 AAA
 * DECORATION ONLY (both AA-large, never body text):
 *   clay/ivory-deep 4.41 · clay/clay-wash 4.39 — use `clay.deep` for text on those surfaces.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "#FAF8F4", // page canvas — warm ivory, carried over from v5
          deep: "#F3EFE8", // insets, section washes
          line: "#E7E1D6", // hairlines on ivory
        },
        ink: {
          DEFAULT: "#171512", // warm near-black — dark cards and the closing band
          card: "#221F1A", // raised surfaces on ink
          line: "#38332B", // hairlines on ink
        },
        clay: {
          DEFAULT: "#B5502E", // THE accent. Primary actions, links, active states
          deep: "#8F3E23", // hover/pressed, and text on ivory-deep or clay-wash
          soft: "#E0885C", // clay-family text ON ink (AA-safe on a FLAT ink surface)
          /**
           * Accent text over PHOTOGRAPHY or video, where the background is not a flat colour.
           * `soft` is a mid-tone: measured against the hero footage it fell to 2.33:1, below
           * even the 3:1 large-text floor, because a scrubbing clip's background luminance
           * moves under the text. This is lifted to luminance 0.55, which holds 3.57:1 against
           * the worst frame behind the hero copy and 10.4:1 on flat ink.
           * Use `soft` on flat dark surfaces; use this one whenever an image is underneath.
           */
          bright: "#F2B79C",
          wash: "#F7EDE8", // clay-tinted surface on ivory — pair with clay.deep for text
        },
        text: {
          DEFAULT: "#1C1B19",
          mute: "#55504A",
          soft: "#6B655D", // 5.43 on ivory — safe down to 13px labels
          "on-dark": "#F5F1EA",
          "on-dark-mute": "#B0A89D",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        data: ["var(--font-data)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Scale-driven hierarchy, the Apple mechanic: a ~5x ratio between d1 and body, with
        // only TWO weights (400 body / 600 display) doing all the work. Hierarchy comes from
        // size, never from piling on weights.
        //
        // Fraunces is a serif, so tracking is much looser than Sora's -0.035em — negative
        // tracking on a serif collapses the counters and reads cramped at display sizes.
        // Body is 19px (not the usual 16), which measurably lowers reading effort for
        // non-native speakers and anyone reading under stress. Both matter for this audience.
        d1: ["clamp(2.75rem, 6.2vw, 5.75rem)", { lineHeight: "1.04", letterSpacing: "-0.015em" }],
        d2: ["clamp(2.125rem, 4.3vw, 3.5rem)", { lineHeight: "1.1", letterSpacing: "-0.012em" }],
        d3: ["clamp(1.5rem, 2.4vw, 2.125rem)", { lineHeight: "1.18", letterSpacing: "-0.008em" }],
        quote: ["clamp(1.5rem, 3vw, 2.25rem)", { lineHeight: "1.3", letterSpacing: "-0.006em" }],
        lead: ["clamp(1.125rem, 1.25vw, 1.3125rem)", { lineHeight: "1.6" }],
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
        // Tinted to the warm-neutral ink (23,21,18), never neutral grey — a cool shadow on a
        // warm canvas is the tell that a palette was swapped without redoing the depth layer.
        card: "0 1px 2px rgba(23,21,18,0.04), 0 10px 30px -18px rgba(23,21,18,0.22)",
        float: "0 2px 4px rgba(23,21,18,0.04), 0 28px 60px -24px rgba(23,21,18,0.32)",
        lift: "0 2px 6px rgba(23,21,18,0.05), 0 18px 40px -20px rgba(23,21,18,0.28)",
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
