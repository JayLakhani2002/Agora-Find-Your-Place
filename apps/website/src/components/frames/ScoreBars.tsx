"use client"

import { observeOnce } from "@/components/Motion"
import { cn } from "@/lib/cn"
import { useEffect, useRef, useState } from "react"

type Dimension = { label: string; value: number }

/**
 * Product frame: the six-dimension document quality score.
 *
 * Motion (§5): bars grow and the mono score counts up over 1.2s the first time the card
 * enters view, then stay put. `observeOnce` fires immediately under prefers-reduced-motion,
 * so the final state is what a reduced-motion visitor sees.
 */
export function ScoreBars({
  score,
  title,
  outOf,
  dimensions,
  alt,
  className,
}: {
  score: number
  title: string
  outOf: string
  dimensions: readonly Dimension[]
  alt: string
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return observeOnce(el, () => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1200)
        // ease-out so the count decelerates into its final value
        setShown(Math.round(score * (1 - (1 - t) ** 3)))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }, [score])

  const grown = shown > 0

  return (
    <figure ref={ref} className={cn("card p-5", className)} aria-label={alt} role="img">
      <figcaption className="sr-only">{alt}</figcaption>
      <div className="flex items-baseline justify-between">
        <span className="text-[0.875rem] font-medium text-text-mute">{title}</span>
        <span className="font-data text-2xl font-medium tabular-nums text-text">
          {shown}
          <span className="text-base text-text-soft">{outOf}</span>
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        {dimensions.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-[6rem] shrink-0 font-data text-[0.6875rem] uppercase tracking-[0.08em] text-text-soft">
              {d.label}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-ivory-deep">
              <span
                className="block h-full rounded-pill bg-indigo transition-[width] duration-[900ms] ease-out"
                style={{ width: grown ? `${d.value}%` : "4%" }}
              />
            </span>
          </div>
        ))}
      </div>
    </figure>
  )
}
