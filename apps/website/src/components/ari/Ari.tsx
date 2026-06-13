"use client"

import { cn } from "@/lib/cn"
import { type RefObject, useEffect, useRef } from "react"

// Image-based Ari — the commissioned 3D character (public/ari/*.png), background
// removed. A flat raster can't move its eyes or change expression, so "aliveness"
// comes from whole-figure motion: idle float, a subtle cursor-parallax tilt, and
// the hero pop-in. The API is kept stable so call sites don't change.

export type AriPose = "in-the-O" | "peeking" | "walking" | "pointing" | "sitting" | "waving"
export type AriExpression = "neutral" | "happy" | "thinking" | "celebrating"
export type GazeTarget = { x: number; y: number } | "cursor" | "scroll" | null

export type AriProps = {
  size?: number
  pose?: AriPose
  /** kept for API compatibility — a flat image can't change expression */
  expression?: AriExpression
  lookAt?: GazeTarget
  speech?: string | null
  /** kept for API compatibility — the cutout reads on both backgrounds */
  tone?: "light" | "dark"
  className?: string
}

const HEAD_POSES: AriPose[] = ["in-the-O", "peeking"]

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

/** Tilts/shifts the whole figure a few px toward the cursor — fakes "looking at you". */
function useAriParallax(ref: RefObject<HTMLImageElement | null>, lookAt: GazeTarget) {
  const target = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (prefersReducedMotion() || lookAt !== "cursor") return
    if (window.matchMedia("(pointer: coarse)").matches) return
    const onMove = (e: MouseEvent) => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      target.current = {
        x: Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2))),
        y: Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2))),
      }
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMove)
  }, [ref, lookAt])

  useEffect(() => {
    if (prefersReducedMotion() || lookAt !== "cursor") return
    let raf = 0
    const tick = () => {
      const c = current.current
      const t = target.current
      c.x += (t.x - c.x) * 0.08
      c.y += (t.y - c.y) * 0.08
      const el = ref.current
      if (el) {
        el.style.transform = `translate(${(c.x * 5).toFixed(2)}px, ${(c.y * 4).toFixed(2)}px) rotate(${(c.x * 2.2).toFixed(2)}deg)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref, lookAt])
}

export function Ari({
  size,
  pose = "in-the-O",
  lookAt = "cursor",
  speech = null,
  className,
}: AriProps) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  useAriParallax(imgRef, lookAt)

  const headOnly = HEAD_POSES.includes(pose)
  const src = headOnly ? "/ari/ari-head.png" : "/ari/ari-full.png"

  return (
    <div
      className={cn(
        "ari-float",
        size === undefined ? "absolute inset-0" : "relative inline-block",
        className,
      )}
      style={size === undefined ? undefined : { width: size }}
    >
      <img
        ref={imgRef}
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full select-none object-contain"
      />

      {/* Speech bubble — circle-cornered, Hanken (§6.2) */}
      {speech && (
        <div className="pointer-events-none absolute -top-2 left-1/2 w-max max-w-[14rem] -translate-x-1/2 -translate-y-full">
          <div className="rounded-[18px] rounded-bl-[4px] bg-ink px-3.5 py-2 font-body text-sm leading-snug text-text-on-ink shadow-lg">
            {speech}
          </div>
        </div>
      )}
    </div>
  )
}
