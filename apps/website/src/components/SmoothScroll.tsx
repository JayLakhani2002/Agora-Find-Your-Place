"use client"

import { useEffect } from "react"

/**
 * Lenis smooth scroll — desktop only; native scroll on touch (§3). Bridges Lenis
 * to GSAP ScrollTrigger so the Thread scrubs against the smoothed position.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const touch = window.matchMedia("(pointer: coarse)").matches
    if (reduce || touch) return

    let raf = 0
    let destroyed = false
    let cleanup = () => {}
    ;(async () => {
      const Lenis = (await import("lenis")).default
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")
      if (destroyed) return
      const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
      lenis.on("scroll", ScrollTrigger.update)
      const loop = (time: number) => {
        lenis.raf(time)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      cleanup = () => {
        lenis.destroy()
        cancelAnimationFrame(raf)
      }
    })()
    return () => {
      destroyed = true
      cleanup()
    }
  }, [])

  return null
}
