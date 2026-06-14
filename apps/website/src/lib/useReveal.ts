"use client"

import { type RefObject, useEffect } from "react"

/**
 * Scroll-reveal using IntersectionObserver + CSS transitions.
 * Elements marked [data-reveal] start hidden (via globals.css) and gain
 * .is-revealed when they enter the viewport, with a stagger delay.
 *
 * This approach is immune to GSAP pin-spacer coordinate drift — it observes
 * real DOM positions regardless of what ScrollTrigger does to scroll heights.
 */
export function useReveal(ref: RefObject<HTMLElement | null>, selector = "[data-reveal]") {
  useEffect(() => {
    if (!ref.current) return
    const root = ref.current
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const elements = Array.from(root.querySelectorAll<HTMLElement>(selector))
    if (!elements.length) return

    if (reduce) {
      for (const el of elements) el.classList.add("is-revealed")
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const idx = elements.indexOf(el)
            el.style.transitionDelay = `${idx * 0.07}s`
            el.classList.add("is-revealed")
            observer.unobserve(el)
          }
        }
      },
      { threshold: 0.1 },
    )

    for (const el of elements) observer.observe(el)

    return () => observer.disconnect()
  }, [ref, selector])
}
