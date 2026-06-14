"use client"

import { Ari } from "@/components/ari/Ari"
import { DeviceFrame } from "@/components/mocks/DeviceFrame"
import { KanbanMock } from "@/components/mocks/KanbanMock"
import { ProfileMock } from "@/components/mocks/ProfileMock"
import { QualityScore } from "@/components/mocks/QualityScore"
import { SwipeDemo } from "@/components/mocks/SwipeDemo"
import { en } from "@/content/en"
import { cn } from "@/lib/cn"
import { useEffect, useRef, useState } from "react"

/**
 * Band 4 — How It Works. Desktop ≥1024px (no reduced motion): section pins and
 * the four panels scrub horizontally; O-motif dots track progress. Mobile /
 * reduced motion: panels stack vertically (spec §10 hard requirement).
 */
export function HowItWorks() {
  const rootRef = useRef<HTMLElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [pinned, setPinned] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const wide = window.matchMedia("(min-width: 1024px)").matches
    if (reduce || !wide) {
      // Stacked layout: every mock is "active" once it scrolls into view;
      // simplest is to mark all active (mocks self-gate reduced motion anyway).
      setActiveStep(-1)
      return
    }
    // Set pinned layout NOW so React re-renders with h-svh before GSAP's
    // async import resolves — otherwise GSAP measures the stacked height and
    // creates an oversized pin spacer, leaving a blank gap after the section.
    setPinned(true)
    let ctx: { revert: () => void } | undefined
    let cancelled = false
    ;(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ])
      if (cancelled || !rootRef.current || !trackRef.current) return
      gsap.registerPlugin(ScrollTrigger)
      const root = rootRef.current
      ctx = gsap.context(() => {
        gsap.to(trackRef.current, {
          xPercent: -75, // 4 panels → move 3 panel-widths
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "+=300%",
            pin: true,
            scrub: 0.6,
            onUpdate: (self) => {
              setActiveStep(Math.min(3, Math.round(self.progress * 3)))
            },
          },
        })
      }, root)
    })()
    return () => {
      cancelled = true
      ctx?.revert()
      setPinned(false)
    }
  }, [])

  const t = en.howItWorks
  const mocks = [
    <ProfileMock key="profile" />,
    <SwipeDemo key="discover" active={activeStep === -1 || activeStep === 1} />,
    <QualityScore key="apply" active={activeStep === -1 || activeStep === 2} />,
    <KanbanMock key="track" />,
  ]

  return (
    <section id="how-it-works" ref={rootRef} className="band band-light">
      <div className={cn(pinned ? "flex h-svh flex-col justify-center overflow-hidden" : "")}>
        <div className="band-inner pt-20 lg:pt-0">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl">{t.headline}</h2>
        </div>

        <div
          ref={trackRef}
          className={cn(
            "mt-12",
            pinned
              ? "flex w-[400%]"
              : "flex flex-col gap-20 pb-24 lg:gap-24",
          )}
        >
          {t.steps.map((step, i) => (
            <div
              key={step.id}
              className={cn(
                "band-inner grid w-full items-center gap-10 lg:grid-cols-2 lg:gap-16",
                pinned && "shrink-0",
              )}
            >
              <div className={i % 2 === 1 && !pinned ? "lg:order-2" : ""}>
                <p className="font-data text-sm uppercase tracking-[0.14em] text-laurel-text">
                  {step.kicker}
                </p>
                <h3 className="mt-3 font-display text-2xl sm:text-3xl">{step.title}</h3>
                <p className="mt-4 max-w-md text-text-mute">{step.body}</p>
              </div>

              <div className="relative">
                {/* Step 3 is the document-optimization showcase — biggest frame,
                    marble-deep backdrop card for prominence */}
                <div
                  className={cn(
                    step.id === "apply" &&
                      "rounded-3xl bg-marble-deep p-6 sm:p-10",
                  )}
                >
                  <DeviceFrame
                    tone="light"
                    className={step.id === "apply" ? "w-[min(76vw,300px)]" : undefined}
                  >
                    {mocks[i]}
                  </DeviceFrame>
                </div>
                {/* Ari points at each mock */}
                <div className="absolute -bottom-6 -left-2 hidden sm:block">
                  <Ari pose="pointing" tone="light" size={72} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* O-motif progress dots — pinned layout only */}
        {pinned && (
          <div aria-hidden className="mt-10 flex justify-center gap-3 pb-8">
            {t.steps.map((step, i) => (
              <span
                key={step.id}
                className={cn(
                  "h-3 w-3 rounded-full border-2 transition-colors duration-300",
                  i === activeStep ? "border-laurel bg-laurel" : "border-text/30",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
