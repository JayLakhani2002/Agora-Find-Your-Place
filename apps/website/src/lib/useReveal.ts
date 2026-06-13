"use client"

import { type RefObject, useEffect } from "react"

/**
 * Shared scroll-reveal: elements marked `[data-reveal]` inside `ref` rise in
 * (y: 24 → 0, opacity 0 → 1, 60ms stagger) when the section enters the viewport.
 *
 * Follows the Hero pattern: content is visible by default (GSAP only animates
 * `from` states), GSAP + ScrollTrigger load lazily after hydration, and
 * prefers-reduced-motion skips the whole effect.
 */
export function useReveal(ref: RefObject<HTMLElement | null>, selector = "[data-reveal]") {
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
      if (cancelled || !ref.current) return
      gsap.registerPlugin(ScrollTrigger)
      const root = ref.current
      ctx = gsap.context(() => {
        gsap.from(root.querySelectorAll(selector), {
          y: 24,
          opacity: 0,
          stagger: 0.06,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start: "top 75%", once: true },
        })
      }, root)
    })()
    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [ref, selector])
}
