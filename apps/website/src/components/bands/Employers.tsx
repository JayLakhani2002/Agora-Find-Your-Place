"use client"

import { en } from "@/content/en"
import { cn } from "@/lib/cn"
import { useReveal } from "@/lib/useReveal"
import { useRef } from "react"

// Wordmarks are styled text, not brand SVGs — honestly placeholder until real
// employer assets/permissions exist. Each gets a distinct type voice so the
// strip reads "logo wall" without claiming partnership (note rendered below).
const WORDMARK_STYLES: Record<string, string> = {
  Zalando: "font-display tracking-[0.18em] uppercase",
  N26: "font-data font-semibold tracking-tight",
  HelloFresh: "font-body font-bold tracking-tight",
  Personio: "font-body font-medium tracking-[0.08em]",
  "Delivery Hero": "font-display italic",
  Contentful: "font-body font-semibold lowercase tracking-wide",
}

const SCATTER = [
  "rotate-[-2deg] sm:translate-y-2",
  "rotate-[1.5deg]",
  "rotate-[-1deg] sm:-translate-y-1",
  "rotate-[2deg] sm:translate-y-3",
  "rotate-[-1.5deg]",
  "rotate-[1deg] sm:-translate-y-2",
]

export function Employers() {
  const rootRef = useRef<HTMLElement | null>(null)
  useReveal(rootRef)

  const t = en.employers
  return (
    <section id="employers" ref={rootRef} className="band band-light">
      <div className="band-inner py-24 sm:py-32">
        <p data-reveal className="eyebrow">
          {t.eyebrow}
        </p>
        <h2 data-reveal className="mt-4 max-w-2xl text-balance font-display text-4xl sm:text-5xl">
          {t.headline}
        </h2>

        <div className="mt-14 grid grid-cols-2 items-center gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {t.logos.map((name, i) => (
            <span
              data-reveal
              key={name}
              className={cn(
                "select-none text-center text-xl text-text/55 grayscale transition-colors hover:text-text/80 sm:text-2xl",
                WORDMARK_STYLES[name],
                SCATTER[i % SCATTER.length],
              )}
            >
              {name}
            </span>
          ))}
        </div>

        <p data-reveal className="mt-8 max-w-xl text-sm text-text-mute">
          {t.note}
        </p>

        <div data-reveal className="mt-16 border-t border-text/10 pt-10">
          <h3 className="font-display text-xl">{t.domainsTitle}</h3>
          {/* Horizontal scroll row — tap/drag to explore all categories */}
          <div className="-mx-4 mt-6 overflow-x-auto px-4 sm:-mx-8 sm:px-8">
            <div className="flex gap-3 pb-3" style={{ width: "max-content" }}>
              {t.domains.map((d, i) => (
                <span
                  key={d.label}
                  className={cn(
                    "flex-shrink-0 cursor-default whitespace-nowrap chip",
                    i % 2 === 1 ? "chip-amber" : "",
                  )}
                >
                  {d.label}
                  <span className="ml-1.5 font-data font-semibold">
                    {d.count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
