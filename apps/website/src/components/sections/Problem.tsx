"use client"

import { observeOnce } from "@/components/Motion"
import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"
import { cn } from "@/lib/cn"
import { useEffect, useRef, useState } from "react"

/**
 * The problem — an animated section, because the point is accumulation.
 *
 * The three beats don't just appear; they stack. Each one slides in and the counter above
 * climbs — 1 site, 2 sites, 5 sites, then hours — so the reader *feels* the pile-up the
 * copy is describing rather than reading three static columns about it. The closing line
 * lands in the dark card once all three are up.
 *
 * Deliberately NOT numbered 01/02/03: these aren't steps in a process, they're things that
 * compound. Numbering would imply an order that doesn't exist.
 *
 * Reduced motion: `observeOnce` fires immediately, so every beat is visible at once with
 * no movement, and the section reads as plain stacked text.
 */
export function Problem() {
  const { problem } = en
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(problem.beats.length)
      return
    }
    return observeOnce(el, () => {
      // Stagger the beats so the stack builds instead of arriving in one lump.
      problem.beats.forEach((_, i) => {
        setTimeout(() => setShown(i + 1), i * 620)
      })
    })
  }, [problem.beats])

  return (
    <section className="band py-band-lg">
      <div ref={ref} className="shell">
        <p data-reveal className="eyebrow">
          {problem.eyebrow}
        </p>
        <h2 className="mt-5 max-w-[16ch] text-d2 font-bold text-ink">
          <Split text={problem.headline} />
        </h2>

        {/* The tally climbs as the beats land — the cost, counted. */}
        <p className="mt-10 flex items-baseline gap-3" aria-hidden="true">
          <span className="font-display text-[clamp(2.5rem,5vw,4rem)] font-bold leading-none tracking-[-0.04em] text-indigo tabular-nums transition-all duration-slow ease-out">
            {problem.tally[Math.max(0, shown - 1)]?.value ?? problem.tally[0]?.value}
          </span>
          <span className="text-[0.9375rem] text-text-mute">
            {problem.tally[Math.max(0, shown - 1)]?.label ?? problem.tally[0]?.label}
          </span>
        </p>

        <ul className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {problem.beats.map((beat, i) => (
            <li
              key={beat}
              className={cn(
                "border-t pt-7 transition-all duration-slow ease-out",
                i < shown
                  ? "translate-y-0 border-indigo/35 opacity-100"
                  : "translate-y-4 border-ivory-line opacity-25",
              )}
            >
              <p className="text-[1.0625rem] leading-relaxed text-text-mute sm:text-[1.125rem]">
                {beat}
              </p>
            </li>
          ))}
        </ul>

        <div
          className={cn(
            "card-ink mt-14 overflow-hidden p-8 shadow-float transition-all duration-slow ease-out sm:mt-16 sm:p-12",
            shown >= problem.beats.length ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
          )}
        >
          <p className="max-w-[26ch] text-quote font-semibold text-apricot-soft">{problem.close}</p>
        </div>
      </div>
    </section>
  )
}
