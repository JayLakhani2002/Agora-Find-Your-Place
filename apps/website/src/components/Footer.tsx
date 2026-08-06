import { Colophon } from "@/components/Colophon"
import { Wordmark } from "@/components/Wordmark"
import { en } from "@/content/en"
import Link from "next/link"

/** §4.10 — mega-footer. Anchors, sub-pages, the two legal pages, EU note, EN/DE stub. */
export function Footer() {
  const { footer } = en
  return (
    <footer className="band band-dark border-t border-ink-line">
      <div className="shell py-16 sm:py-20">
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
          <div className="max-w-sm">
            <p className="text-[1.35rem] text-text-on-dark">
              <Wordmark />
            </p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-text-on-dark-mute">
              {footer.blurb}
            </p>
          </div>

          {footer.columns.map((col) => (
            <div key={col.title}>
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[0.9375rem] text-text-on-dark-mute transition-colors duration-fast ease-out hover:text-text-on-dark"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-14 max-w-prose border-t border-ink-line pt-8 text-[0.875rem] text-text-on-dark-mute">
          {footer.gdpr}
        </p>

        {/* No EN|DE switch until German copy exists — a toggle that does nothing is worse
            than no toggle. All copy already lives in content/en.ts, so adding `de.ts` is a
            file, not a refactor. */}
        {/*
         * Was a one-line "Made in Berlin · Hosted in the EU · GDPR-first". It is now a
         * printed deploy receipt, because those three words are checkable facts and the
         * whole site's argument is that it shows its receipts. Only labels come from copy —
         * the sha, build date and scan clock are read from the environment inside the
         * component, so this file cannot hand-type a value.
         */}
        <Colophon {...footer.colophon} className="mt-12" />
      </div>
    </footer>
  )
}
