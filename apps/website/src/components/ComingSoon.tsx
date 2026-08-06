import { Cta } from "@/components/sections/Cta"

import { en } from "@/content/en"
import Link from "next/link"

type PageKey = keyof typeof en.comingSoon.pages

/**
 * Placeholder for the four nav pages (plus the two legal pages) so the shell never
 * 404s. The real pages are W3 — this one still ends in the waitlist band, because
 * every page routes to the same single conversion goal.
 */
export function ComingSoon({ page }: { page: PageKey }) {
  const t = en.comingSoon
  const { title, sub } = t.pages[page]
  return (
    <>
      <section className="band">
        <div className="shell max-w-3xl py-band-lg pt-[calc(68px+clamp(4rem,9vw,7rem))]">
          <h1 className="text-d2 font-bold text-ink">{title}</h1>
          <p className="mt-6 max-w-prose text-lead text-text-mute">{sub}</p>
          <p className="receipt mt-10">{t.note}</p>
          <p className="mt-8">
            <Link href="/" className="btn btn-secondary">
              {t.back}
            </Link>
          </p>
        </div>
      </section>
      <Cta />
    </>
  )
}

export function comingSoonMetadata(page: PageKey) {
  const { title, sub } = en.comingSoon.pages[page]
  return { title: `${title} — Agora`, description: sub }
}
