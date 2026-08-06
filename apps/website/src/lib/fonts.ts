import { Fraunces, Inter, Spline_Sans_Mono } from "next/font/google"

/**
 * Type system v7 — Fraunces replaces Instrument Sans on display (Jay, 2026-08-06).
 *
 * The reason is competitive, not decorative. Every AI job platform surveyed runs a rounded
 * geometric sans on a blue palette; Instrument Sans put us inside that same grammar. A warm
 * humanist serif steps out of it instantly, and type is the cheapest differentiator we have.
 *
 * Fraunces specifically, over the obvious luxury serifs (Playfair, Bodoni, Cinzel): those
 * read fashion/spa/law-firm — wrong and faintly intimidating for an audience that includes
 * tradespeople and warehouse staff, many of whom arrive here anxious. Fraunces has soft
 * optical curves and a `SOFT` axis that keeps it friendly at display sizes without becoming
 * decorative. `opsz` is enabled so large sizes get the high-contrast cut and small sizes stay
 * sturdy.
 *
 * Inter stays on body — nothing beats it at 16–21px, and its glyph coverage is the widest of
 * any free sans, which matters for a multilingual EU audience. Spline Sans Mono stays for the
 * receipt motif and for numbers (match %, salary, counts), the Stripe trick: monospaced
 * figures read as measured rather than marketed.
 *
 * Two weights only, per the scale-driven hierarchy in tailwind.config.ts.
 * All self-hosted through next/font — no external request at runtime.
 */
// No `weight` here on purpose: next/font rejects a fixed weight list alongside `axes`, and
// Fraunces is variable. The full wght range loads; we still only USE 400 and 600 (see the
// scale-driven hierarchy in tailwind.config.ts).
export const fraunces = Fraunces({
  axes: ["SOFT", "opsz"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
})

export const inter = Inter({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
})

export const splineMono = Spline_Sans_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-data",
})

export const fontVariables = `${fraunces.variable} ${inter.variable} ${splineMono.variable}`
