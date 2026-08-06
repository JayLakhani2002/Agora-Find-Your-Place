import { Instrument_Sans, Inter, Spline_Sans_Mono } from "next/font/google"

/**
 * Type system v6 — replaces Sora, which read too geometric and rounded once the page had
 * cinematic photography in it.
 *
 * Instrument Sans carries display: slightly narrow, tight apertures, a little editorial
 * character, and it holds its shape at large sizes over a photograph — which is exactly
 * where Sora went soft. Inter carries body text, because nothing beats it for long-form
 * legibility at 16–20px. Spline Sans Mono stays for the receipt motif.
 *
 * All self-hosted through next/font, so there is no external request at runtime.
 */
export const instrument = Instrument_Sans({
  weight: ["500", "600", "700"],
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

export const fontVariables = `${instrument.variable} ${inter.variable} ${splineMono.variable}`
