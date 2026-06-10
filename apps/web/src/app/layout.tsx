import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agora Jobs",
  description: "Job matching for international students in Germany",
  manifest: "/manifest.json",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
