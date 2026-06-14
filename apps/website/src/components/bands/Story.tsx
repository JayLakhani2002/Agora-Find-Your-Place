"use client"

import { DeviceFrame } from "@/components/mocks/DeviceFrame"
import { en } from "@/content/en"
import { cn } from "@/lib/cn"
import { useReveal } from "@/lib/useReveal"
import { useEffect, useRef, useState } from "react"

/**
 * Band 2 — scrollytelling. Desktop ≥1024px (no reduced motion): the inner
 * viewport pins for ~2 extra viewports while three beats crossfade beside a
 * morphing phone mock. Mobile / reduced motion: beats render stacked, unpinned.
 *
 * All beat visuals exist in the DOM at once; the scrubbed timeline only moves
 * opacity/transforms, so the unpinned fallback needs no separate markup.
 */
export function Story() {
  const rootRef = useRef<HTMLElement | null>(null)
  const pinRef = useRef<HTMLDivElement | null>(null)
  const originRef = useRef<HTMLDivElement | null>(null)
  const [pinned, setPinned] = useState(false)
  useReveal(originRef as React.RefObject<HTMLElement | null>)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const wide = window.matchMedia("(min-width: 1024px)").matches
    if (reduce || !wide) return
    let ctx: { revert: () => void } | undefined
    let cancelled = false
    ;(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ])
      if (cancelled || !rootRef.current || !pinRef.current) return
      gsap.registerPlugin(ScrollTrigger)
      setPinned(true)
      const root = rootRef.current
      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "+=200%",
            pin: pinRef.current,
            scrub: 0.6,
          },
        })
        // Beat 1 → 2: quotes crossfade; mock cards strike through
        tl.to('[data-beat="0"]', { opacity: 0, y: -20, duration: 0.18 }, 0.16)
        tl.fromTo('[data-beat="1"]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.18 }, 0.3)
        tl.to("[data-mock-q]", { opacity: 0.25, duration: 0.2 }, 0.3)
        tl.to("[data-mock-strike]", { scaleX: 1, duration: 0.2, stagger: 0.02 }, 0.34)
        // Beat 2 → 3: collapse to the one matching card
        tl.to('[data-beat="1"]', { opacity: 0, y: -20, duration: 0.18 }, 0.6)
        tl.fromTo('[data-beat="2"]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.18 }, 0.74)
        tl.to("[data-mock-card]", { opacity: 0, scale: 0.92, duration: 0.16, stagger: 0.015 }, 0.72)
        tl.fromTo(
          "[data-mock-match]",
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 0.16, ease: "back.out(1.6)" },
          0.86,
        )
        tl.fromTo(
          "[data-mock-tick]",
          { opacity: 0, scale: 0 },
          { opacity: 1, scale: 1, duration: 0.1, stagger: 0.04, ease: "back.out(2)" },
          0.92,
        )
      }, root)
    })()
    return () => {
      cancelled = true
      ctx?.revert()
      setPinned(false)
    }
  }, [])

  const t = en.story
  return (
    <section id="story" ref={rootRef} className="band band-dark">
      <div
        ref={pinRef}
        className={cn(
          "band-inner grid items-center gap-12 py-24 lg:grid-cols-2 lg:gap-20",
          pinned ? "lg:h-svh lg:py-0" : "lg:py-32",
        )}
      >
        {/* Quotes column */}
        <div className="relative">
          <p className="eyebrow eyebrow-on-ink">{t.eyebrow}</p>
          <div className={cn("relative mt-6", pinned && "lg:min-h-[16rem]")}>
            {t.beats.map((beat, i) => (
              <figure
                key={beat.id}
                data-beat={i}
                className={cn(
                  // Pinned: beats stack absolutely and crossfade. Unpinned: normal flow.
                  pinned ? "lg:absolute lg:inset-x-0 lg:top-0" : "",
                  i > 0 && !pinned ? "mt-12" : "",
                  pinned && i > 0 ? "lg:opacity-0" : "",
                )}
              >
                <blockquote className="max-w-lg text-balance font-display text-2xl leading-snug text-text-on-ink sm:text-3xl">
                  “{beat.quote}”
                </blockquote>
                <figcaption className="mt-4 text-sm text-text-on-ink/55">{beat.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>

        {/* Morphing phone mock */}
        <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-4">
          <DeviceFrame tone="dark">
            <StoryMock />
          </DeviceFrame>
          <p className="max-w-[220px] text-center font-data text-xs text-text-on-ink/45">
            Hundreds of listings → the handful you can actually take.
          </p>
        </div>
      </div>

      {/* Why “Agora”? — static origin note below the pin */}
      <div ref={originRef} className="band-inner pb-24 lg:pb-32">
        <div data-reveal className="max-w-xl border-l-2 border-laurel-bright pl-6">
          <h3 className="font-display text-xl text-laurel-bright">{t.origin.title}</h3>
          <p className="mt-3 text-text-on-ink/70">{t.origin.body}</p>
        </div>
      </div>
    </section>
  )
}

/** The mock inside the frame: 6 grey job cards (beat 1: stamped ?, beat 2:
 *  struck through) that collapse to one matching card with ✓ chips (beat 3). */
function StoryMock() {
  return (
    <div className="relative h-full px-3 py-2">
      {/* Mini screen header — audience immediately understands this is a job list */}
      <div className="mb-2.5 flex items-center justify-between border-b border-text-on-ink/10 pb-2">
        <span className="font-data text-[0.6rem] uppercase tracking-wider text-text-on-ink/50">
          Berlin · Werkstudent
        </span>
        <span data-mock-q className="font-data text-[0.6rem] text-amber">
          142 open
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }, (_, i) => `card-${i}`).map((key) => (
          <div
            key={key}
            data-mock-card
            className="relative rounded-lg border border-text-on-ink/10 bg-ink-soft p-2.5"
          >
            <div className="h-2 w-3/4 rounded bg-text-on-ink/20" />
            <div className="mt-1.5 h-2 w-1/2 rounded bg-text-on-ink/10" />
            <span
              data-mock-q
              className="absolute right-1.5 top-1.5 font-data text-xs text-amber"
            >
              ?
            </span>
            <span
              data-mock-strike
              aria-hidden
              className="absolute left-2 right-2 top-1/2 h-px origin-left scale-x-0 bg-text-on-ink/50"
            />
          </div>
        ))}
      </div>

      {/* The one card that fits — beat 3 */}
      <div
        data-mock-match
        className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-xl border border-laurel-bright/60 bg-ink-soft p-4 opacity-0 shadow-lg"
      >
        <div className="h-2.5 w-4/5 rounded bg-text-on-ink/30" />
        <div className="mt-2 h-2 w-1/2 rounded bg-text-on-ink/15" />
        <div className="mt-3 flex gap-1.5">
          {["✓ Visa", "✓ B1", "✓ 20h"].map((c) => (
            <span
              key={c}
              data-mock-tick
              className="rounded-full border border-laurel-bright/50 px-1.5 py-0.5 font-data text-[0.6rem] text-laurel-bright"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
