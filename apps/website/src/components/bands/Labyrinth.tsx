"use client"

import { en } from "@/content/en"
import { useReveal } from "@/lib/useReveal"
import { useEffect, useRef } from "react"

// Maze backdrop paths — right-angled corridors, drawn with strokeDashoffset on
// enter. Coordinates are in a 1200×600 viewBox, preserveAspectRatio="none".
const MAZE_PATHS = [
  "M0 80 H280 V200 H440 V120 H640 V260 H880 V160 H1200",
  "M0 320 H160 V440 H400 V340 H560 V480 H760 V380 H1000 V300 H1200",
  "M120 0 V140 H320 V40 H520 V180 H720 V60 H920 V220 H1080 V0",
  "M0 540 H240 V460 H480 V560 H700 V440 H940 V520 H1200",
]

export function Labyrinth() {
  const rootRef = useRef<HTMLElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  useReveal(rootRef)

  // Maze strokes draw in, lightly scrubbed against scroll.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    let ctx: { revert: () => void } | undefined
    let cancelled = false
    ;(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ])
      if (cancelled || !rootRef.current || !svgRef.current) return
      gsap.registerPlugin(ScrollTrigger)
      const paths = svgRef.current.querySelectorAll("path")
      ctx = gsap.context(() => {
        paths.forEach((p) => {
          const len = p.getTotalLength()
          gsap.fromTo(
            p,
            { strokeDasharray: len, strokeDashoffset: len },
            {
              strokeDashoffset: 0,
              ease: "none",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top 85%",
                end: "center center",
                scrub: 0.5,
              },
            },
          )
        })
      }, rootRef.current)
    })()
    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [])

  const t = en.labyrinth
  return (
    <section id="labyrinth" ref={rootRef} className="band band-dark">
      {/* Maze backdrop — content sits z-10 above it; the global Thread overlay
          (z-20) visibly cuts straight through the corridors. */}
      <svg
        ref={svgRef}
        viewBox="0 0 1200 600"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full opacity-[0.22]"
      >
        {MAZE_PATHS.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="var(--laurel-bright)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="band-inner relative z-10 flex flex-col items-center py-28 text-center sm:py-40">
        <p data-reveal className="eyebrow eyebrow-on-ink">
          {t.eyebrow}
        </p>
        <h2
          data-reveal
          className="mt-4 max-w-2xl text-balance font-display text-4xl text-text-on-ink sm:text-5xl"
        >
          {t.headline}
        </h2>
        <p data-reveal className="mt-6 max-w-xl text-balance text-text-on-ink/70">
          {t.body}
        </p>
        <div data-reveal className="mt-10 flex flex-wrap justify-center gap-3">
          {t.chips.map((chip, i) => (
            <span key={chip} className={i % 2 === 1 ? "chip chip-amber-on-ink" : "chip chip-on-ink"}>
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Dark → light transition into How It Works */}
      <div aria-hidden className="relative z-10 h-28 w-full bg-gradient-to-b from-ink to-marble" />
    </section>
  )
}
