"use client"

import { en } from "@/content/en"
import { useReveal } from "@/lib/useReveal"
import { useRef } from "react"

export function WhyItWins({ showStats = false }: { showStats?: boolean }) {
  const rootRef = useRef<HTMLElement | null>(null)
  useReveal(rootRef)

  const t = en.why
  return (
    <section id="why" ref={rootRef} className="band band-dark">
      <div className="band-inner py-24 sm:py-32">
        <p data-reveal className="eyebrow eyebrow-on-ink">
          {t.eyebrow}
        </p>
        <h2
          data-reveal
          className="mt-4 max-w-2xl text-balance font-display text-4xl text-text-on-ink sm:text-5xl"
        >
          {t.headline}
        </h2>

        <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {t.columns.map((col, i) => (
            <div data-reveal key={col.title}>
              <span
                aria-hidden
                className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border-2 border-laurel-bright/50 font-data text-sm font-semibold text-laurel-bright"
              >
                {i + 1}
              </span>
              <h3 className="font-display text-xl text-laurel-bright">{col.title}</h3>
              <p className="mt-3 text-text-on-ink/70">{col.body}</p>
            </div>
          ))}
        </div>

        {/* Stats row — only rendered when SHOW_STATS=true; values stay {{N}} placeholders
            until real numbers exist (honesty rule, spec §2). */}
        {showStats && (
          <div
            data-reveal
            className="mt-16 flex flex-wrap gap-x-12 gap-y-6 border-t border-text-on-ink/10 pt-10"
          >
            {t.stats.map((s) => (
              <div key={s.label}>
                <p className="font-data text-3xl text-laurel-bright">{s.value}</p>
                <p className="mt-1 text-sm text-text-on-ink/60">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
