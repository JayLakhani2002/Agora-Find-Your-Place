import { Hanken_Grotesk, Marcellus, Spline_Sans_Mono } from "next/font/google"

// Self-hosted via next/font per §3. Marcellus = display, Hanken = body, Spline Mono = data.
export const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
})

export const hanken = Hanken_Grotesk({
  weight: ["400", "500", "700"],
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

export const fontVariables = `${marcellus.variable} ${hanken.variable} ${splineMono.variable}`
