"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

/**
 * Scroll-scrubbed canvas image sequence — the "3D scroll" effect.
 *
 * The technique is not WebGL: a short cinematic clip is exported to N numbered JPGs, and the
 * frame painted to a <canvas> is picked by scroll progress through a tall sticky stage.
 * Scrolling forward and backward plays the clip. All the "3D" comes from the source footage.
 *
 * Three things here are deliberate and worth not undoing:
 *
 * 1. THE SEQUENCE IS DESKTOP-ONLY. ~180 JPGs is ~10-15MB. The performance floor for this site
 *    is LCP < 2.5s on 4G mobile (apps/website/CLAUDE.md §10), and a phone will never win that
 *    while downloading a film. Phones get the poster — which is a real frame from the clip, so
 *    they get the composition, just not the motion. This is not a degraded experience, it is
 *    the same picture holding still.
 *
 * 2. THE POSTER IS ALWAYS RENDERED AND IS ALWAYS THE LCP ELEMENT. The canvas fades in over it
 *    once enough frames exist. If the network is slow, JS fails, or a frame 404s, the visitor
 *    still sees the hero — never a blank stage. Nothing about the copy depends on the canvas.
 *
 * 3. IT RUNS ITS OWN rAF RATHER THAN JOINING THE LENIS LOOP IN Motion.tsx. Sampling
 *    getBoundingClientRect() each frame is cheap, and it keeps this component correct whether
 *    Lenis is running, absent, or replaced later. Two rAF loops reading layout beats one loop
 *    with a cross-component subscription that silently breaks when Motion.tsx changes.
 */

export interface CinematicScrubProps {
  /** Number of frames in the sequence. Set from what extract-frames.sh actually wrote. */
  frameCount: number
  /**
   * URL prefix for the sequence, e.g. "/frames/shift/frame_". The 1-based index is appended
   * zero-padded, then `frameExt`.
   *
   * Strings rather than an (i) => url function on purpose: this is a Client Component, and a
   * Server Component parent cannot hand a function across the boundary. Taking a builder
   * function compiled fine and then failed only at prerender — so the API has to make the
   * illegal thing impossible to express.
   */
  framePrefix: string
  framePad?: number
  frameExt?: string
  /** Shown immediately, under the canvas, and on every fallback path. */
  poster: string
  /** Describes the footage for anyone who cannot see it. Required, never decorative. */
  alt: string
  /** How tall the scroll stage is. More height = slower, more deliberate scrub. */
  stageVh?: number
  /** Overlay copy, rendered inside the sticky stage. */
  children?: React.ReactNode
  className?: string
}

export function CinematicScrub({
  frameCount,
  framePrefix,
  framePad = 4,
  frameExt = ".jpg",
  poster,
  alt,
  stageVh = 420,
  children,
  className = "",
}: CinematicScrubProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const framesRef = useRef<HTMLImageElement[]>([])
  const lastDrawn = useRef(-1)
  const [ready, setReady] = useState(false)
  // Deliberately NO progress state. An earlier version lifted scroll progress into React so
  // overlay copy could fade against it — which re-rendered the whole subtree ~150 times per
  // scroll pass. Anything that needs to animate on progress should do it in the rAF loop
  // against a ref, never through setState.

  useEffect(() => {
    // Bail out to the poster on any of: reduced motion, small viewport, coarse pointer, or an
    // explicit data-saver request. Each of these is someone telling us not to send a film.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const small = window.matchMedia("(max-width: 1023px)").matches
    // biome-ignore lint/suspicious/noExplicitAny: Network Information API is not in lib.dom yet
    const conn = (navigator as any).connection
    const saveData = Boolean(conn?.saveData)
    const slow = /2g/.test(String(conn?.effectiveType ?? ""))
    if (reduced || small || saveData || slow) return

    let alive = true
    let raf = 0

    // Progressive preload. Frame 0 first so something paints early; the rest fill in behind it
    // and the canvas only reveals once we have a usable head start. Decoding off the main
    // thread where supported keeps the scroll smooth while loading.
    const imgs: HTMLImageElement[] = new Array(frameCount)
    let loaded = 0
    for (let i = 0; i < frameCount; i++) {
      const img = new window.Image()
      img.decoding = "async"
      img.src = `${framePrefix}${String(i + 1).padStart(framePad, "0")}${frameExt}`
      img.onload = () => {
        loaded++
        // A quarter of the sequence is enough to start; scrubbing past unloaded frames simply
        // holds the previous one rather than flashing empty.
        if (alive && loaded > frameCount / 4) setReady(true)
      }
      imgs[i] = img
    }
    framesRef.current = imgs

    const draw = (idx: number) => {
      const canvas = canvasRef.current
      const img = imgs[idx]
      if (!canvas || !img?.complete || img.naturalWidth === 0) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Cover fit — the frame fills the stage and overflows rather than letterboxing.
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
      const dw = img.naturalWidth * scale
      const dh = img.naturalHeight * scale
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
    }

    // Anything marked [data-scrub-fade] fades out as the clip ends. This is not decoration —
    // it is what makes the overlay accessible. This footage travels from a near-black corridor
    // to a blown-out white doorway, and no fixed text colour clears 3:1 against BOTH ends;
    // measured, the accent line bottomed out at 2.0:1 over the final frames however hard the
    // scrim was pushed, and darkening the hero enough to fix it destroyed the doorway light
    // the whole clip is built around. So the copy leaves before the frame turns white, which
    // is also the choreography the hero was designed around: the copy resolves, THEN you cross
    // the threshold into the page.
    const faders = Array.from(
      stageRef.current?.querySelectorAll<HTMLElement>("[data-scrub-fade]") ?? [],
    )
    const FADE_FROM = 0.8
    const FADE_TO = 0.95
    let lastFade = -1

    const tick = () => {
      if (!alive) return
      const stage = stageRef.current
      if (stage) {
        const rect = stage.getBoundingClientRect()
        const scrollable = rect.height - window.innerHeight
        const p = scrollable > 0 ? Math.min(Math.max(-rect.top / scrollable, 0), 1) : 0
        const idx = Math.min(frameCount - 1, Math.max(0, Math.round(p * (frameCount - 1))))
        // Redraw only when the frame index actually changes — scroll fires far more often
        // than the sequence has frames, and drawImage on every rAF is wasted work.
        if (idx !== lastDrawn.current) {
          lastDrawn.current = idx
          draw(idx)
        }

        // Written straight to style, never through setState: routing this through React would
        // re-render the whole hero subtree on every scroll frame.
        const fade =
          p <= FADE_FROM ? 1 : p >= FADE_TO ? 0 : 1 - (p - FADE_FROM) / (FADE_TO - FADE_FROM)
        const rounded = Math.round(fade * 100) / 100
        if (rounded !== lastFade) {
          lastFade = rounded
          for (const el of faders) {
            el.style.opacity = String(rounded)
            // Once invisible it must also stop taking clicks and stop being reachable by
            // keyboard — an invisible but focusable CTA is a trap, not a flourish.
            el.style.pointerEvents = rounded < 0.05 ? "none" : ""
            if (rounded < 0.05) el.setAttribute("aria-hidden", "true")
            else el.removeAttribute("aria-hidden")
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onResize = () => {
      lastDrawn.current = -1 // force a redraw at the new size
    }
    window.addEventListener("resize", onResize)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      // Drop decoded bitmaps so a long session does not hold ~15MB of images forever.
      for (const img of imgs) img.src = ""
      framesRef.current = []
    }
  }, [frameCount, framePrefix, framePad, frameExt])

  return (
    <div ref={stageRef} className={`relative ${className}`} style={{ height: `${stageVh}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Poster: the LCP element, and the permanent fallback. Never removed from the DOM. */}
        <Image src={poster} alt={alt} fill priority sizes="100vw" className="object-cover" />
        {/*
         * aria-hidden + tabIndex={-1} together, and both are needed. The canvas is a purely
         * decorative duplicate of the poster above, which already carries the alt text — so it
         * must be hidden, or the hero gets announced twice. But aria-hidden on something
         * reachable by keyboard is its own bug, and <canvas> is focusable by default, so the
         * negative tabindex is what makes hiding it legitimate rather than merely quiet.
         */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          tabIndex={-1}
          className={`absolute inset-0 h-full w-full transition-opacity duration-slow ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
        {children}
      </div>
    </div>
  )
}
