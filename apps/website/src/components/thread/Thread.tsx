"use client"

import { Ari } from "@/components/ari/Ari"
import { useEffect, useRef, useState } from "react"

const THREAD_COLOR = "#2EA06C" // laurel-bright — reads on both marble and ink

/** Build a gently weaving vertical path in document pixel space. */
function buildPath(w: number, h: number) {
  const cx = w / 2
  const amp = Math.min(w * 0.17, 200)
  const pts: [number, number][] = [
    [w * 0.5, 0],
    [cx - amp, h * 0.16],
    [cx + amp, h * 0.34],
    [cx - amp, h * 0.52],
    [cx + amp, h * 0.7],
    [cx, h * 0.86],
    [w * 0.5, h],
  ]
  let d = ""
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    if (!p) continue
    if (i === 0) {
      d = `M ${p[0]} ${p[1]}`
      continue
    }
    const prev = pts[i - 1]
    if (!prev) continue
    const my = (prev[1] + p[1]) / 2
    d += ` C ${prev[0]} ${my}, ${p[0]} ${my}, ${p[0]} ${p[1]}`
  }
  return d
}

export function Thread() {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [reduce, setReduce] = useState(false)
  const pathRef = useRef<SVGPathElement | null>(null)
  const travelerRef = useRef<HTMLDivElement | null>(null)
  const d = dims ? buildPath(dims.w, dims.h) : ""

  // Measure document + react to resize / layout shifts.
  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    const measure = () => {
      setIsMobile(window.innerWidth < 768)
      setDims({
        w: document.documentElement.clientWidth,
        h: document.documentElement.scrollHeight,
      })
    }
    measure()
    window.addEventListener("resize", measure)
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    return () => {
      window.removeEventListener("resize", measure)
      ro.disconnect()
    }
  }, [])

  // Scroll-draw via GSAP ScrollTrigger; Ari rides the tip (desktop).
  useEffect(() => {
    if (!dims || isMobile) return
    const path = pathRef.current
    if (!path) return
    const len = path.getTotalLength()
    path.style.strokeDasharray = `${len}`

    if (reduce) {
      path.style.strokeDashoffset = "0"
      if (travelerRef.current) {
        travelerRef.current.style.offsetDistance = "100%"
        travelerRef.current.style.opacity = "1"
      }
      return
    }

    path.style.strokeDashoffset = `${len}`
    let cleanup = () => {}
    ;(async () => {
      const { gsap } = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")
      gsap.registerPlugin(ScrollTrigger)
      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        scrub: true,
        onUpdate: (self) => {
          // draw thread just ahead of scroll position
          const lead = Math.min(1, self.progress + 0.06)
          path.style.strokeDashoffset = `${len * (1 - lead)}`
          if (travelerRef.current) {
            travelerRef.current.style.offsetDistance = `${self.progress * 100}%`
            // hide while parked at the very top (it would poke below the page edge)
            travelerRef.current.style.opacity = self.progress > 0.02 ? "1" : "0"
          }
        },
      })
      cleanup = () => st.kill()
    })()
    return () => cleanup()
  }, [dims, isMobile, reduce])

  // Mobile: simplified 2px left-edge line, scroll-drawn (§6.4).
  if (isMobile) {
    return (
      <div className="pointer-events-none absolute inset-y-0 left-3 z-20" aria-hidden>
        <MobileThread reduce={reduce} height={dims?.h ?? 0} />
      </div>
    )
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      style={{ height: dims?.h }}
      aria-hidden
    >
      {dims && (
        <svg
          width={dims.w}
          height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          className="absolute inset-0"
          fill="none"
          aria-hidden="true"
        >
          <path
            ref={pathRef}
            d={d}
            stroke={THREAD_COLOR}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
      )}
      {dims && !reduce && (
        <div
          ref={travelerRef}
          className="absolute left-0 top-0 h-[64px] w-[64px] -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300"
          style={{ offsetPath: `path("${d}")`, offsetRotate: "0deg", offsetDistance: "0%" }}
        >
          <Ari pose="walking" expression="happy" lookAt="scroll" size={64} tone="dark" />
        </div>
      )}
    </div>
  )
}

function MobileThread({ reduce, height }: { reduce: boolean; height: number }) {
  const ref = useRef<SVGLineElement | null>(null)
  useEffect(() => {
    const line = ref.current
    if (!line || height === 0) return
    const len = height
    line.style.strokeDasharray = `${len}`
    if (reduce) {
      line.style.strokeDashoffset = "0"
      return
    }
    line.style.strokeDashoffset = `${len}`
    let cleanup = () => {}
    ;(async () => {
      const { gsap } = await import("gsap")
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")
      gsap.registerPlugin(ScrollTrigger)
      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        scrub: true,
        onUpdate: (self) => {
          line.style.strokeDashoffset = `${len * (1 - Math.min(1, self.progress + 0.06))}`
        },
      })
      cleanup = () => st.kill()
    })()
    return () => cleanup()
  }, [reduce, height])

  return (
    <svg width="4" height={height} className="overflow-visible" fill="none" aria-hidden="true">
      <line
        ref={ref}
        x1="2"
        y1="0"
        x2="2"
        y2={height}
        stroke={THREAD_COLOR}
        strokeWidth="2"
        opacity="0.7"
      />
    </svg>
  )
}
