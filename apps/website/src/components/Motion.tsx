"use client"

import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Lenis from "lenis"
import { useEffect } from "react"

/**
 * The site's entire motion runtime, in one client island, so every section stays a
 * server component. It drives everything off data attributes:
 *
 *   [data-reveal]       fade + 28px rise + 0.985→1 scale, batched, 70ms stagger, once
 *   [data-reveal-card]  same plus a 0.4° rotation settle
 *   [data-split]        server-wrapped words rise 110% → 0, 30ms apart (headlines)
 *   [data-magnetic]     CTA attracts the cursor within 60px, ≤6px travel, springs back
 *   [data-pin="steps"]  the one pinned scene — the pipeline rail
 *
 * Reduced motion is handled by NOT running any of it: `.js-motion` (set before paint in
 * layout.tsx) is what applies the hidden start-states, and this effect exits early on the
 * same media query. Nothing can be left invisible.
 *
 * No scroll-hijacking: Lenis only smooths the native wheel delta, pins scrub with the
 * wheel, and nothing ever captures or blocks the scroll.
 */
export function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.registerPlugin(ScrollTrigger)
    const cleanups: (() => void)[] = []

    // ---- Lenis smooth scroll (desktop pointers only; native momentum on touch) ----
    const finePointer = window.matchMedia("(pointer: fine)").matches
    if (finePointer) {
      const lenis = new Lenis({ duration: 1.05, smoothWheel: true })
      const onScroll = () => ScrollTrigger.update()
      lenis.on("scroll", onScroll)
      const raf = (time: number) => lenis.raf(time * 1000)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)
      cleanups.push(() => {
        gsap.ticker.remove(raf)
        lenis.destroy()
      })
    }

    /**
     * Reveals run on IntersectionObserver, not ScrollTrigger.
     *
     * Why: the two pinned scenes insert pin-spacers and switch their contents to
     * position:fixed, which invalidates any scroll position ScrollTrigger measured
     * beforehand — headlines inside those sections would simply never un-hide. An
     * observer watches the real element wherever it ends up, so reveals cannot get
     * stranded. ScrollTrigger is kept for the one job only it can do: the pins.
     */
    const revealed = new WeakSet<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          io.unobserve(el)
          if (revealed.has(el)) continue
          revealed.add(el)

          const siblings = el.parentElement
            ? Array.from(el.parentElement.children).filter(
                (c) =>
                  c !== el && (c.hasAttribute("data-reveal") || c.hasAttribute("data-reveal-card")),
              )
            : []
          const delay = Math.min(siblings.length, 6) * 0.02

          if (el.hasAttribute("data-split")) {
            /**
             * `y: 0` on BOTH ends is load-bearing — without it the headline never appears.
             *
             * The CSS start state is `transform: translateY(110%)`. GSAP resolves that from
             * the computed style into its own `y` channel as a pixel value (110% of the
             * 81px line box ≈ 89px), and `yPercent` is a SEPARATE additive channel. So
             * animating `yPercent: 110 → 0` leaves the inherited `y: 89px` untouched and
             * the words settle exactly where they started, clipped by `.split-word`'s
             * overflow. Zeroing `y` explicitly is what actually clears it.
             */
            gsap.fromTo(
              el.querySelectorAll(".split-inner"),
              { yPercent: 110, y: 0 },
              { yPercent: 0, y: 0, duration: 0.85, ease: "power3.out", stagger: 0.03 },
            )
          } else {
            gsap.to(el, {
              opacity: 1,
              y: 0,
              scale: 1,
              rotate: 0,
              duration: el.hasAttribute("data-reveal-card") ? 0.75 : 0.7,
              ease: "power3.out",
              delay,
            })
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    )
    const REVEALABLE = "[data-split],[data-reveal],[data-reveal-card]"
    const observeIn = (root: ParentNode) => {
      if (root instanceof Element && root.matches(REVEALABLE)) io.observe(root)
      for (const el of root.querySelectorAll(REVEALABLE)) io.observe(el)
    }
    observeIn(document)

    /**
     * Elements that mount AFTER this effect have to be picked up too.
     *
     * The query above runs once. Anything React mounts later is never observed, and because
     * `.js-motion` has already applied the hidden start-states, "never observed" means
     * "permanently invisible" — not "un-animated". FilmScrub is exactly this shape: it
     * server-renders a static stack and then swaps in the sticky scrub subtree on mount, and
     * the swap silently ate the hero headline and every card reveal inside the film.
     *
     * Fixed here rather than in FilmScrub because the trap belongs to this runtime: any
     * component that mounts content late hits it, and a fix inside one component leaves the
     * next one to rediscover it the hard way.
     *
     * childList + subtree only, batched into one rAF, and each added subtree is queried once
     * — the observer never reads layout, so it cannot become a scroll cost.
     */
    let pending: Node[] = []
    let queued = 0
    const mo = new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) pending.push(n)
      if (pending.length === 0 || queued) return
      queued = requestAnimationFrame(() => {
        queued = 0
        const batch = pending
        pending = []
        for (const n of batch) if (n.isConnected) observeIn(n as Element)
      })
    })
    mo.observe(document.body, { childList: true, subtree: true })

    cleanups.push(() => {
      if (queued) cancelAnimationFrame(queued)
      mo.disconnect()
      io.disconnect()
    })

    const ctx = gsap.context(() => {
      // ---- Pinned scenes: desktop only, so small screens never fight a pin ----
      gsap.matchMedia().add("(min-width: 1024px)", () => {
        // The pipeline — the page's one pinned scene, with a brand progress line drawing
        // across the rail as the four panels cross-fade.
        const steps = document.querySelector<HTMLElement>('[data-pin="steps"]')
        if (steps) {
          const items = steps.querySelectorAll<HTMLElement>("[data-step]")
          const rails = steps.querySelectorAll<HTMLElement>("[data-rail]")
          const line = steps.querySelector<HTMLElement>("[data-progress-line]")

          /**
           * Exactly ONE panel is active at a time. The panels share a single grid cell, so
           * a cumulative rule (`i < active`) stacks all four on top of each other and the
           * text renders superimposed — the scene has to be exclusive, not additive.
           *
           * The rail is the opposite: it is a progress indicator, so a pill the reader has
           * already passed stays marked `done` while only the current one is `active`.
           */
          const setStep = (idx: number) => {
            items.forEach((s, i) => s.setAttribute("data-active", String(i === idx)))
            rails.forEach((r, i) => {
              r.setAttribute("data-active", String(i === idx))
              r.setAttribute("data-done", String(i < idx))
            })
          }
          setStep(0)

          ScrollTrigger.create({
            trigger: steps,
            start: "top top",
            end: `+=${items.length * 45}%`,
            pin: steps.querySelector("[data-pin-inner]"),
            pinSpacing: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              if (line) line.style.transform = `scaleX(${self.progress})`
              // clamp: progress hits exactly 1 at the end, which would index past the last.
              setStep(Math.min(items.length - 1, Math.floor(self.progress * items.length)))
            },
          })
          // Leaving the scene in either direction must not strand a half-lit section.
          return () => {
            for (const s of items) s.removeAttribute("data-active")
            for (const r of rails) {
              r.removeAttribute("data-active")
              r.removeAttribute("data-done")
            }
          }
        }
      })
    })
    cleanups.push(() => ctx.revert())

    /**
     * Re-measure the pins when the document's height changes after load.
     *
     * ScrollTrigger records absolute scroll positions for each pin at creation time. Anything
     * that changes the page height afterwards leaves those numbers pointing at the wrong
     * place — and the film does exactly that: FilmScrub server-renders a short static stack
     * and then swaps in a ~9,000px sticky stage on mount. The pipeline's pin kept its
     * pre-swap coordinates and fired thousands of pixels early, so the pinned section drew
     * itself on top of the still-running film.
     *
     * ScrollTrigger refreshes itself on viewport resize, but not on a content-driven height
     * change, so it has to be told. Guarded three ways because `refresh()` itself resizes pin
     * spacers and would otherwise re-trigger this observer forever: compare against the last
     * height we acted on, ignore changes under 4px, and coalesce into one rAF.
     */
    let lastH = document.documentElement.scrollHeight
    let refreshQueued = 0
    const ro = new ResizeObserver(() => {
      const h = document.documentElement.scrollHeight
      if (Math.abs(h - lastH) < 4 || refreshQueued) return
      refreshQueued = requestAnimationFrame(() => {
        refreshQueued = 0
        lastH = document.documentElement.scrollHeight
        ScrollTrigger.refresh()
      })
    })
    ro.observe(document.body)
    cleanups.push(() => {
      if (refreshQueued) cancelAnimationFrame(refreshQueued)
      ro.disconnect()
    })

    // Pins insert spacers, which moves every trigger measured before them. Refresh once
    // the layout has settled (and again after webfonts land, which changes text heights).
    const refresh = () => ScrollTrigger.refresh()
    requestAnimationFrame(refresh)
    document.fonts?.ready.then(refresh)

    // ---- Magnetic CTAs (fine pointers only) ----
    if (finePointer) {
      const RADIUS = 60
      const magnets = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"))
      const onMove = (e: PointerEvent) => {
        for (const el of magnets) {
          const r = el.getBoundingClientRect()
          const dx = e.clientX - (r.left + r.width / 2)
          const dy = e.clientY - (r.top + r.height / 2)
          const near = Math.abs(dx) < r.width / 2 + RADIUS && Math.abs(dy) < r.height / 2 + RADIUS
          gsap.to(el, {
            x: near ? gsap.utils.clamp(-6, 6, dx * 0.25) : 0,
            y: near ? gsap.utils.clamp(-6, 6, dy * 0.25) : 0,
            duration: near ? 0.35 : 0.6,
            ease: near ? "power2.out" : "elastic.out(1, 0.4)",
          })
        }
      }
      window.addEventListener("pointermove", onMove, { passive: true })
      cleanups.push(() => window.removeEventListener("pointermove", onMove))
    }

    return () => {
      for (const fn of cleanups) fn()
    }
  }, [])

  return null
}

/**
 * Fires once when `el` scrolls into view. Used by the frames that animate their own
 * contents (score bars, chat bubbles, odometers, the theater). Under reduced motion it
 * fires immediately, so the final state is what those visitors see.
 */
export function observeOnce(el: Element, onEnter: () => void) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    onEnter()
    return () => {}
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        onEnter()
        observer.disconnect()
      }
    },
    { rootMargin: "0px 0px -15% 0px", threshold: 0 },
  )
  observer.observe(el)
  return () => observer.disconnect()
}
