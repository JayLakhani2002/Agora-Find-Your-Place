import { fontVariables } from "@/lib/fonts"
import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agora — Find your place.",
  description:
    "The job app for international students in Berlin — visa-aware, German-level-aware, ATS-tested.",
  metadataBase: new URL("https://joinagora.eu"),
  openGraph: {
    title: "Agora — Find your place.",
    description:
      "The job app for international students in Berlin — visa-aware, German-level-aware, ATS-tested.",
    type: "website",
    locale: "en_DE",
  },
  icons: { icon: "/favicon.svg" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF8F3",
}

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Agora",
  description: "The job app for international students in Berlin.",
  url: "https://joinagora.eu",
  areaServed: "Berlin, Germany",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-laurel focus:px-4 focus:py-2 focus:text-marble"
        >
          Skip to content
        </a>
        {children}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
      </body>
    </html>
  )
}
