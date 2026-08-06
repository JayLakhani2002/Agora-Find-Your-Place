"use client"

import { Aurora } from "@/components/ui/Aurora"
import { Odometer } from "@/components/ui/Odometer"
import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"
import { useEffect, useState } from "react"

/**
 * The numbers — a dark card on the light canvas, because these are the machine's numbers
 * and the machine gets the dark surfaces.
 *
 * The counters keep ticking over: every 7 seconds they re-roll and settle on the same real
 * figure, and hovering the card re-rolls them immediately. That keeps the panel feeling
 * live without ever displaying a number that isn't true — the value never changes, only
 * the animation replays. Anything that visibly counted upward would be inventing growth.
 *
 * Every value comes from claims.ts → live-data.json → the production database, regenerated
 * on every build. No hand-typed number appears in this section, and there are no user
 * counts, hire counts or ratings, because none of those exist yet.
 */
export function Numbers() {
  const { numbers } = en
  const [replay, setReplay] = useState(0)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = setInterval(() => {
      // Pause while the tab is hidden — no point animating into a background tab.
      if (!document.hidden) setReplay((n) => n + 1)
    }, 7000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="band pb-band-lg">
      <div className="shell">
        <div
          onMouseEnter={() => setReplay((n) => n + 1)}
          className="card-ink on-ink group relative overflow-hidden p-8 shadow-float transition-all duration-slow ease-out hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(30,27,58,0.06),0_40px_80px_-32px_rgba(79,70,229,0.55)] sm:p-12 lg:p-16"
        >
          <Aurora tone="cool" dark />

          <p data-reveal className="eyebrow">
            {numbers.eyebrow}
          </p>
          <h2 className="mt-5 max-w-[16ch] text-d2 font-bold text-text-on-dark">
            <Split text={numbers.headline} />
          </h2>

          <dl className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {numbers.tiles.map((tile) => (
              <div
                key={tile.label}
                data-reveal
                className="border-t border-ink-line pt-6 transition-colors duration-base group-hover:border-clay-soft/45"
              >
                <dd className="font-display text-[clamp(2.5rem,4.6vw,3.75rem)] font-bold leading-none tracking-[-0.04em] text-clay-soft">
                  <Odometer value={tile.value} replay={replay} />
                </dd>
                <dt className="mt-4 text-[0.9375rem] text-text-on-dark-mute">{tile.label}</dt>
              </div>
            ))}
          </dl>

          <p data-reveal className="receipt mt-12 max-w-prose">
            {numbers.receipt}
          </p>
        </div>
      </div>
    </section>
  )
}
