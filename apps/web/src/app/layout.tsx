import { SessionHygiene } from "@/components/SessionHygiene"
import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agora Jobs",
  description: "Job matching for international students in Germany",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Agora" },
}

export const viewport: Viewport = {
  themeColor: "#0369A1",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `dynamic` is required by the strict CSP in src/middleware.ts: the policy carries a
    // per-request nonce, so the shell cannot be statically prerendered. Dropping it
    // silently breaks every Clerk script under the policy.
    <ClerkProvider dynamic>
      <html lang="en">
        <body>
          <SessionHygiene />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
