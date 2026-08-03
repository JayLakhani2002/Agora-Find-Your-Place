"use client"

import { en } from "@/content/en"
import { testimonials } from "@/content/testimonials"
import { useReveal } from "@/lib/useReveal"
import { motion } from "framer-motion"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

export function Voices() {
  const rootRef = useRef<HTMLElement | null>(null)
  useReveal(rootRef)

  const t = en.voices
  const hasPlaceholders = testimonials.some((x) => x.placeholder)

  return (
    <section id="voices" ref={rootRef} className="band band-light">
      <div className="band-inner py-24 sm:py-32">
        <p data-reveal className="eyebrow">
          {t.eyebrow}
        </p>
        <h2 data-reveal className="mt-4 max-w-xl text-balance font-display text-4xl sm:text-5xl">
          {t.headline}
        </h2>
        {/* Visible while any placeholder entries remain — honesty rule (§2) */}
        {hasPlaceholders && (
          <p data-reveal className="mt-3 font-data text-sm text-text-mute">
            {t.disclaimer}
          </p>
        )}
      </div>
      <div data-reveal>
        <DragRow />
        <p aria-hidden className="mt-4 text-center font-data text-xs text-text-mute">
          ← drag to explore →
        </p>
      </div>
    </section>
  )
}

function DragRow() {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [dragX, setDragX] = useState(0)
  const [motionOk, setMotionOk] = useState(false)

  // Framer drag is layered on only when motion is allowed; the container stays
  // natively scrollable (overflow-x-auto + snap) for keyboard and reduced motion.
  useEffect(() => {
    setMotionOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  useLayoutEffect(() => {
    if (!motionOk) return
    const measure = () => {
      const vp = viewportRef.current
      const track = trackRef.current
      if (!vp || !track) return
      setDragX(Math.max(0, track.scrollWidth - vp.clientWidth))
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [motionOk])

  const cards = testimonials.map((item) => (
    <figure
      key={item.id}
      className="w-[min(82vw,340px)] shrink-0 snap-start rounded-2xl border border-text/10 bg-marble-deep p-7"
    >
      {/* O-motif avatar — initials only, no fake photos */}
      <div
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-laurel bg-marble font-display text-laurel-text"
      >
        {item.name.charAt(0)}
      </div>
      <blockquote className="mt-5 text-text">
        <p>“{item.quote}”</p>
      </blockquote>
      <figcaption className="mt-5 font-data text-sm text-text-mute">
        {item.name} · {item.meta}
      </figcaption>
    </figure>
  ))

  if (!motionOk) {
    return (
      <div
        ref={viewportRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-[clamp(1.25rem,5vw,4rem)] pb-24 sm:pb-32"
      >
        {cards}
      </div>
    )
  }

  return (
    <div ref={viewportRef} className="overflow-hidden pb-24 sm:pb-32">
      <motion.div
        ref={trackRef}
        drag="x"
        dragConstraints={{ left: -dragX, right: 0 }}
        dragElastic={0.08}
        className="flex cursor-grab gap-5 px-[clamp(1.25rem,5vw,4rem)] active:cursor-grabbing"
      >
        {cards}
      </motion.div>
    </div>
  )
}
