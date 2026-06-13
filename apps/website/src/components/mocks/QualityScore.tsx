"use client"

import { en } from "@/content/en"
import { useEffect, useRef } from "react"

/**
 * Step 3 — the document-optimization showcase. Mini CV sheet with highlighted
 * optimized lines beside a score card: big 9.3/10 + six dimension bars whose
 * counters tick up when `active` flips true (or on viewport enter as fallback).
 * Reduced motion: final values are in the DOM from the start — GSAP only
 * animates *from* zero states.
 */
export function QualityScore({ active = true }: { active?: boolean }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const played = useRef(false)

  useEffect(() => {
    if (!active || played.current) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      played.current = true
      return
    }
    let cancelled = false
    ;(async () => {
      const { gsap } = await import("gsap")
      if (cancelled || !rootRef.current || played.current) return
      played.current = true
      const root = rootRef.current
      // Bars grow and number counters tick to their final textContent values.
      root.querySelectorAll<HTMLElement>("[data-dim-bar]").forEach((bar, i) => {
        gsap.from(bar, { scaleX: 0, duration: 0.8, delay: i * 0.08, ease: "power3.out" })
      })
      root.querySelectorAll<HTMLElement>("[data-dim-num]").forEach((num, i) => {
        const target = Number(num.dataset.value ?? "0")
        const proxy = { v: 0 }
        gsap.to(proxy, {
          v: target,
          duration: 0.8,
          delay: i * 0.08,
          ease: "power3.out",
          onUpdate: () => {
            num.textContent = proxy.v.toFixed(1)
          },
        })
      })
      const big = root.querySelector<HTMLElement>("[data-big-score]")
      if (big) {
        const target = Number(big.dataset.value ?? "0")
        const proxy = { v: 0 }
        gsap.to(proxy, {
          v: target,
          duration: 1.1,
          ease: "power3.out",
          onUpdate: () => {
            big.textContent = proxy.v.toFixed(1)
          },
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [active])

  const q = en.howItWorks.quality
  return (
    <div ref={rootRef} className="flex h-full flex-col gap-3 px-4 py-3">
      {/* Mini document with optimized lines highlighted */}
      <div className="rounded-lg border border-text/10 bg-white/60 p-3">
        <div className="h-2 w-1/2 rounded bg-text/25" />
        <div className="mt-2 h-1.5 w-full rounded bg-text/10" />
        <div className="mt-1.5 h-1.5 w-11/12 rounded bg-laurel/30" />
        <div className="mt-1.5 h-1.5 w-full rounded bg-text/10" />
        <div className="mt-1.5 h-1.5 w-4/5 rounded bg-laurel/30" />
        <div className="mt-2 font-data text-[0.55rem] text-laurel-text">
          ✓ 2 lines optimized for ATS parsing
        </div>
      </div>

      {/* Score card */}
      <div className="flex-1 rounded-lg bg-marble-deep p-3">
        <div className="flex items-baseline justify-between">
          <span className="font-data text-[0.6rem] uppercase tracking-wider text-text-mute">
            {q.label}
          </span>
          <span className="font-data text-2xl text-laurel-text">
            <span data-big-score data-value={q.score}>
              {q.score}
            </span>
            <span className="text-sm text-text-mute">/10</span>
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          {q.dimensions.map((d) => (
            <div key={d.label} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-[0.6rem] text-text-mute">{d.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-text/10">
                <span
                  data-dim-bar
                  className="block h-full origin-left rounded-full bg-laurel"
                  style={{ width: `${d.value * 10}%` }}
                />
              </span>
              <span
                data-dim-num
                data-value={d.value}
                className="w-7 shrink-0 text-right font-data text-[0.6rem] text-laurel-text"
              >
                {d.value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
