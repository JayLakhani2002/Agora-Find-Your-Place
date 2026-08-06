import { Footer } from "@/components/Footer"
import { Motion } from "@/components/Motion"
import { Nav } from "@/components/Nav"
import { en } from "@/content/en"
import { fontVariables } from "@/lib/fonts"
import type { Metadata, Viewport } from "next"
import "./globals.css"

// Never hardcode a domain we do not own. Vercel sets NEXT_PUBLIC_SITE_URL; local falls
// back to the dev port (BUILD-GUIDE §6).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"

const title = "Agora — an agent that runs your job hunt"
// Names the trades and shift work deliberately. Every AI job platform surveyed describes
// only office/tech roles, so this is both the honest description of what we index (kitchen,
// warehouse and delivery roles are really in there) and the clearest differentiator we have.
const description =
  "Kitchen, warehouse, delivery, care, retail, trades, office — Agora reads every job source we index, tailors your CV and cover letter to each role, and files the application once you approve. Works in English. Early access, starting in Germany."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: { title, description, type: "website", locale: "en_DE", url: siteUrl },
  icons: { icon: "/favicon.svg" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF8F4",
}

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Agora",
  description,
  url: siteUrl,
  // Honest to the index: 786 of 921 indexed roles are Berlin and all five sources are German.
  // Widen this only when the index actually widens, never to match ambition.
  areaServed: "Germany",
}

/**
 * Runs before first paint. It is the ONLY thing that switches on the hidden start-states
 * in globals.css, and it refuses to when the visitor has asked for reduced motion — so a
 * reduced-motion visitor, or anyone with JS disabled, gets the finished page with nothing
 * invisible. Keep it inline and synchronous; a deferred script would flash.
 */
const motionFlag = `try{if(matchMedia('(prefers-reduced-motion: no-preference)').matches)document.documentElement.classList.add('js-motion')}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, no user input */}
        <script dangerouslySetInnerHTML={{ __html: motionFlag }} />
      </head>
      <body className="grain">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-pill focus:bg-clay focus:px-4 focus:py-2 focus:text-white"
        >
          {en.a11y.skipToContent}
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <Motion />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
      </body>
    </html>
  )
}
