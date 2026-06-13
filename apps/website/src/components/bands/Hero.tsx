"use client"

import { en } from "@/content/en"
import { cn } from "@/lib/cn"
import { useEffect, useRef } from "react"

const LETTERS_LEFT = [
  { c: "A", k: "a1" },
  { c: "G", k: "g1" },
]
const LETTERS_RIGHT = [
  { c: "R", k: "r1" },
  { c: "A", k: "a2" },
]

export function Hero() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<SVGCircleElement | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    // Enhance after hydrate — hero never blocks LCP (§10). Everything is visible by
    // default; GSAP only animates `from` hidden states. Loaded lazily.
    let ctx: { revert: () => void } | undefined
    let cancelled = false
    ;(async () => {
      const { gsap } = await import("gsap")
      if (cancelled || !rootRef.current) return
      const root = rootRef.current
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
        tl.from("[data-letter]", { y: 60, opacity: 0, stagger: 0.04, duration: 0.5 })
        if (ringRef.current) {
          const len = ringRef.current.getTotalLength()
          tl.fromTo(
            ringRef.current,
            { strokeDasharray: len, strokeDashoffset: len },
            { strokeDashoffset: 0, duration: 0.7 },
            "-=0.2",
          )
        }
        tl.from(
          "[data-ari-pop]",
          { scale: 0, opacity: 0, duration: 0.5, ease: "back.out(1.7)" },
          "-=0.25",
        )
        tl.from("[data-hero-fade]", { y: 16, opacity: 0, stagger: 0.08, duration: 0.5 }, "-=0.2")
        tl.from(
          "[data-hero-chip]",
          { opacity: 0, scale: 0.9, stagger: 0.1, duration: 0.5 },
          "-=0.3",
        )
      }, root)
    })()
    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [])

  return (
    <section
      id="main"
      ref={rootRef}
      className="band band-light relative flex min-h-[100svh] flex-col items-center justify-center px-5 pb-24 pt-28 text-center"
    >
      {/* Floating eligibility chips — max 3, subtle parallax drift (§8.1) */}
      <FloatingChips />

      {/* Wordmark with Ari in the O */}
      <h1
        className={cn(
          "relative z-10 flex select-none items-center font-display leading-none tracking-[0.04em]",
          "text-[clamp(4rem,15vw,11rem)]",
        )}
        aria-label="Agora"
      >
        {LETTERS_LEFT.map((l) => (
          <span data-letter key={l.k}>
            {l.c}
          </span>
        ))}

        {/* The O — a drawn ring with Ari peeking through like a porthole */}
        <span
          className="relative mx-[0.04em] inline-block align-middle"
          style={{ width: "0.86em", height: "0.86em" }}
        >
          <svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            <circle
              ref={ringRef}
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <span data-ari-pop className="absolute inset-[14%] overflow-hidden rounded-full">
            <img
              src="/ari/ari-head.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-full w-full select-none object-cover"
              style={{ objectPosition: "50% 28%" }}
            />
          </span>
        </span>

        {LETTERS_RIGHT.map((l) => (
          <span data-letter key={l.k}>
            {l.c}
          </span>
        ))}
      </h1>

      <p
        data-hero-fade
        className="relative z-10 mt-8 font-display text-2xl uppercase tracking-[0.22em] text-laurel-text sm:text-3xl"
      >
        {en.brand.tagline}
      </p>
      <p data-hero-fade className="relative z-10 mt-5 max-w-xl text-balance text-lg text-text-mute">
        {en.brand.subline}
      </p>

      <div
        data-hero-fade
        className="relative z-10 mt-9 flex flex-wrap items-center justify-center gap-3"
      >
        <a
          href="#waitlist"
          className="btn-primary"
          data-ari-hint="This is how you get early access"
        >
          {en.hero.primaryCta}
        </a>
        <a href="#meet-ari" className="btn-ghost" data-ari-hint="Say hi to me down below">
          {en.hero.secondaryCta} <span aria-hidden>↓</span>
        </a>
      </div>
    </section>
  )
}

function FloatingChips() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const touch = window.matchMedia("(pointer: coarse)").matches
    if (reduce || touch) return
    const factors = [0.9, 1.0, 1.1]
    const onScroll = () => {
      const y = window.scrollY
      const chips = ref.current?.querySelectorAll<HTMLElement>("[data-hero-chip]")
      chips?.forEach((chip, i) => {
        chip.style.transform = `translateY(${y * (factors[i] ?? 1) * -0.06}px)`
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Mobile: cluster in the open space above the wordmark. Desktop: drift around it.
  const positions = [
    "left-[6%] top-[15%] sm:left-[16%] sm:top-[26%]",
    "right-[6%] top-[15%] sm:right-[18%] sm:top-[36%]",
    "left-1/2 top-[24%] -translate-x-1/2 sm:left-[24%] sm:top-auto sm:bottom-[24%] sm:translate-x-0",
  ]

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0">
      {en.hero.chips.map((chip, i) => (
        <span
          key={chip}
          data-hero-chip
          className={cn("chip absolute opacity-70 shadow-sm backdrop-blur-sm", positions[i])}
        >
          {chip}
        </span>
      ))}
    </div>
  )
}
