"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"

/**
 * Multi-scene sibling of CinematicScrub — a scroll-scrubbed FILM rather than a single clip.
 *
 * Same technique (numbered JPGs painted to a <canvas>, frame picked by scroll progress), but
 * several sequences play in order down one tall stage, cut together with dips to ink. Read
 * CinematicScrub.tsx first: every constraint it documents applies here too, and the ones that
 * bit us there are re-stated below only where the multi-scene version changes the shape of them.
 *
 * What is genuinely new here, and why:
 *
 * 1. MEMORY IS THE WHOLE PROBLEM. One sequence is ~10-15MB of decoded bitmaps. Five would be
 *    ~75MB held forever, which is a tab crash on a 4GB laptop, not a slow scroll. So decoded
 *    frames live in a sliding window of three scenes (current ± 1) and everything outside it is
 *    evicted — `img.src = ""` plus dropping the array, which is what actually releases the
 *    bitmap. Scrubbing back refetches from the HTTP cache, which is a network no-op.
 *
 * 2. CUTS ARE DIPS TO INK, NOT CROSSFADES. A crossfade needs both sequences decoded at once,
 *    at exactly the moment the window is already widest. A dip needs one opacity write.
 *
 * 3. THE STATIC STACK IS THE REAL DELIVERABLE. The server renders the complete story as a
 *    stack of <figure>s. That is what a phone, a screen reader, a crawler and a JS-off visitor
 *    get, and it has to be correct on its own — including which scenes describe shipped
 *    behaviour and which are `at launch`. The scrub replaces it only when the client qualifies.
 *    Enhancement, never requirement (apps/website/CLAUDE.md §10).
 */

type FramesScene = {
  kind: "frames"
  id: string
  frameCount: number
  /**
   * URL prefix, e.g. "/frames/intake/f_". The 1-based index is appended zero-padded, then
   * `frameExt`. A STRING, never an (i) => url builder: a Server Component parent cannot hand a
   * function across the client boundary, and that failure shows up only at prerender — it type
   * checks perfectly. The API has to make the illegal thing impossible to express.
   */
  framePrefix: string
  framePad?: number
  frameExt?: string
  /** Rendered as an <Image> underlay and shown whenever this scene's frames are not ready. */
  poster: string
  /** Describes the footage for anyone who cannot see it. Required, never decorative. */
  alt: string
  /** Share of the outer stage this scene occupies. More = slower, more deliberate scrub. */
  stageVh: number
  overlay?: React.ReactNode
  /**
   * Optional keyframes for moving the overlay as the camera moves. `atP` is this scene's local
   * progress (0-1). Interpolated by the browser, not by us — see the WAAPI note in the engine.
   */
  overlayTrack?: { atP: number; transform: string; opacity: number }[]
}

type DrawnScene = {
  kind: "drawn"
  id: string
  stageVh: number
  alt: string
  overlay?: React.ReactNode
  /**
   * What the stage sits on. Defaults to ivory for a drawn scene, because the first thing that
   * ever used one was an architectural drawing on paper — but that was a property of THAT
   * scene, not of drawn scenes in general. A drawn scene continuing a dark film needs `ink`, or
   * the film flashes white every time the footage ends.
   */
  backdrop?: "ink" | "ivory"
}

export type FilmScene = FramesScene | DrawnScene

export interface FilmScrubProps {
  /**
   * Keep this array referentially stable in the parent (a module-level const, not an inline
   * literal in a component that re-renders). The engine effect depends on it, and a new array
   * identity mid-scroll tears the film down and rebuilds it from scene 0.
   */
  scenes: FilmScene[]
  /** Per-scene status strip, matched to scenes by index. `shipped: false` renders `at launch`. */
  // readonly because this comes straight from `content/en.ts`, which is `as const` — copy is
  // frozen by design and the engine has no business mutating it.
  rail: readonly { readonly label: string; readonly status: string; readonly shipped: boolean }[]
  /** Rendered inside the sticky stage above everything; the headline block. Carries [data-scrub-fade]. */
  children?: React.ReactNode
  className?: string
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)
const r2 = (n: number) => Math.round(n * 100) / 100

const frameUrl = (s: FramesScene, i: number) =>
  `${s.framePrefix}${String(i + 1).padStart(s.framePad ?? 4, "0")}${s.frameExt ?? ".jpg"}`

/** Fraction of a scene's local progress spent under the cut, at each end. */
const DIP = 0.04

export function FilmScrub({ scenes, rail, children, className = "" }: FilmScrubProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dipRef = useRef<HTMLDivElement>(null)
  const railLabelRef = useRef<HTMLSpanElement>(null)
  const railStatusRef = useRef<HTMLSpanElement>(null)
  const railFlagRef = useRef<HTMLSpanElement>(null)

  // Two-phase mount on purpose. The first effect only decides whether this client gets the
  // film; the second builds the engine and therefore runs after the scrub DOM is committed and
  // the refs above actually point at something.
  const [scrub, setScrub] = useState(false)

  // Cumulative-vh table: maps global progress to (scene, local progress). Derived, never state.
  const spans = useMemo(() => {
    const totalVh = scenes.reduce((sum, s) => sum + s.stageVh, 0)
    let acc = 0
    return {
      totalVh,
      list: scenes.map((s) => {
        const start = acc / totalVh
        acc += s.stageVh
        return { start, end: acc / totalVh }
      }),
    }
  }, [scenes])

  useEffect(() => {
    // Same bail conditions, same order, as CinematicScrub. Each one is someone telling us not
    // to send a film: reduced motion, a small viewport, a coarse pointer, or a data-saver hint.
    // A multi-scene film is several times heavier, so if anything these matter more here.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const small = window.matchMedia("(max-width: 1023px)").matches
    // Deliberate divergence, not drift: CinematicScrub does not test the pointer. A trackpad
    // laptop and a 1024px-wide tablet both pass the width check, and only one of them should
    // be handed a multi-sequence film to scrub.
    const coarse = window.matchMedia("(pointer: coarse)").matches
    // biome-ignore lint/suspicious/noExplicitAny: Network Information API is not in lib.dom yet
    const conn = (navigator as any).connection
    const saveData = Boolean(conn?.saveData)
    const slow = /2g/.test(String(conn?.effectiveType ?? ""))
    if (reduced || small || coarse || saveData || slow) return
    setScrub(true)
  }, [])

  useEffect(() => {
    if (!scrub || spans.list.length === 0) return

    let alive = true
    let raf = 0

    /** Decoded frames for one scene. Only ever three of these exist at a time. */
    type Loaded = { imgs: HTMLImageElement[]; ready: boolean }
    const cache = new Map<number, Loaded>()

    const preload = (i: number) => {
      if (!alive) return
      const sc = scenes[i]
      if (!sc || sc.kind !== "frames" || cache.has(i)) return
      const entry: Loaded = { imgs: new Array(sc.frameCount), ready: false }
      cache.set(i, entry)
      let loaded = 0
      for (let f = 0; f < sc.frameCount; f++) {
        const img = new window.Image()
        img.decoding = "async"
        img.src = frameUrl(sc, f)
        img.onload = () => {
          loaded++
          // Same quarter-loaded rule as CinematicScrub: enough to start, and scrubbing past a
          // gap holds the previous frame rather than flashing empty.
          if (loaded > sc.frameCount / 4) entry.ready = true
        }
        entry.imgs[f] = img
      }
    }

    /** Release everything outside [lo, hi]. Blanking src is what frees the decoded bitmap. */
    const evict = (lo: number, hi: number) => {
      for (const [i, entry] of cache) {
        if (i >= lo && i <= hi) continue
        for (const img of entry.imgs) {
          img.onload = null
          img.src = ""
        }
        entry.imgs = []
        cache.delete(i)
      }
    }

    const root = viewportRef.current
    const posters = new Map<number, HTMLElement>()
    const overlays = new Map<number, HTMLElement>()
    for (const el of Array.from(root?.querySelectorAll<HTMLElement>("[data-film-poster]") ?? [])) {
      posters.set(Number(el.dataset.filmPoster), el)
    }
    for (const el of Array.from(root?.querySelectorAll<HTMLElement>("[data-film-overlay]") ?? [])) {
      overlays.set(Number(el.dataset.filmOverlay), el)
    }

    /**
     * Overlay keyframes run on the Web Animations API, paused, scrubbed by setting currentTime.
     * Transform is a STRING — "translate3d(-4%,0,0) scale(1.06)" cannot be lerped by hand
     * without writing a transform parser, and a hand-rolled one gets rotation and 3D wrong.
     * WAAPI already interpolates transforms correctly, off the main thread, so the rAF loop's
     * whole job is one currentTime assignment. Offsets are sorted because WAAPI throws on a
     * non-ascending keyframe list, and an author listing beats out of order is a plausible typo.
     */
    const anims = new Map<number, Animation>()
    scenes.forEach((sc, i) => {
      const el = overlays.get(i)
      if (!el || sc.kind !== "frames" || !sc.overlayTrack || sc.overlayTrack.length === 0) return
      const keys = [...sc.overlayTrack]
        .sort((a, b) => a.atP - b.atP)
        .map((k) => ({ offset: clamp01(k.atP), transform: k.transform, opacity: k.opacity }))
      const anim = el.animate(keys, { duration: 1000, fill: "both" })
      anim.pause()
      anims.set(i, anim)
    })

    // Scene 0 loads on idle, after mount, so the film never competes with the LCP poster.
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback
    if (typeof ric === "function") ric(() => preload(0))
    else window.setTimeout(() => preload(0), 1)

    const canvas = canvasRef.current

    const drawCover = (img: HTMLImageElement | undefined) => {
      if (!canvas || !img?.complete || img.naturalWidth === 0) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      // Resizing the backing store clears it, so only touch it when the size really changed.
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
      const dw = img.naturalWidth * scale
      const dh = img.naturalHeight * scale
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
    }

    const clearCanvas = () => {
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }

    // Headline copy resolves before the FIRST cut and never comes back. Same reasoning as
    // CinematicScrub's fade: no fixed text colour clears 3:1 against every frame of moving
    // footage, so the copy leaves rather than fighting the luminance. Here it also has to be
    // gone before the dip, or the ink wipe reads as the headline being switched off.
    const faders = Array.from(root?.querySelectorAll<HTMLElement>("[data-scrub-fade]") ?? [])
    const FADE_FROM = 0.7
    const FADE_TO = 0.9

    let sceneNow = -1
    let drawnFrame = -3
    let needsRedraw = true
    let lastDip = -1
    let lastFade = -1
    let lastScrubP = -1

    const tick = () => {
      if (!alive) return
      const stage = stageRef.current
      if (stage) {
        const rect = stage.getBoundingClientRect()
        const scrollable = rect.height - window.innerHeight
        const p = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0

        let idx = spans.list.length - 1
        for (let i = 0; i < spans.list.length; i++) {
          const s = spans.list[i]
          if (s && p < s.end) {
            idx = i
            break
          }
        }
        const span = spans.list[idx]
        const width = span ? span.end - span.start : 0
        const localP = span && width > 0 ? clamp01((p - span.start) / width) : 0
        const sc = scenes[idx]

        // Preload the next scene on whichever trigger fires first: halfway through this scene,
        // or the next scene's start coming within 1.5 viewports of the current scroll position.
        // A fast flick past a short scene never reaches localP 0.5 in time; a slow reader on a
        // very tall scene never gets within 1.5 viewports until it is nearly over. One rule
        // covers neither case, so both run. `preload` is a no-op once cached, so this is cheap.
        const nextSpan = spans.list[idx + 1]
        if (
          nextSpan &&
          (localP >= 0.5 || (nextSpan.start - p) * scrollable <= window.innerHeight * 1.5)
        ) {
          preload(idx + 1)
        }

        if (idx !== sceneNow) {
          sceneNow = idx
          needsRedraw = true
          // The window is current ± 1: one behind so scrubbing back up is instant, one ahead
          // because it is already being fetched by the rule above.
          evict(idx - 1, idx + 1)
          for (const [i, el] of posters) el.style.display = i === idx ? "block" : "none"
          for (const [i, el] of overlays) {
            el.style.display = i === idx ? "block" : "none"
            // Scenes behind the visitor are finished, scenes ahead have not started. Without
            // this, a scene that was current once keeps whatever --scrub-p it was left on, and
            // scrolling back up reveals a half-drawn sheet.
            if (i !== idx) el.style.setProperty("--scrub-p", i < idx ? "1" : "0")
          }
          lastScrubP = -1
          // A drawn scene has no footage behind it, so the stage itself supplies the colour.
          // The swap happens while the ink dip is fully opaque, so the change is never seen —
          // that is the mechanism a register change rides on. Scenes may name their own
          // backdrop; a drawn scene defaults to ivory only for backwards compatibility with the
          // blueprint sheet, and a dark film must ask for `ink` or it strobes at every cut.
          if (root) {
            const backdrop = sc?.kind === "drawn" ? (sc.backdrop ?? "ivory") : "ink"
            root.style.backgroundColor = backdrop === "ivory" ? "var(--ivory)" : "var(--ink)"
          }
          const line = rail[idx]
          if (railLabelRef.current) railLabelRef.current.textContent = line?.label ?? ""
          if (railStatusRef.current) railStatusRef.current.textContent = line?.status ?? ""
          // The rail's DOM text is swapped by ref, never by re-render — React re-rendering this
          // subtree per scroll frame is the bug CinematicScrub's missing progress state exists
          // to avoid. Its container is aria-live="polite", so the swap is still announced, and
          // because we write the real current values the DOM is never lying about what shipped.
          // `hidden` alone does NOT hide this. Preflight's `[hidden] { display: none }` is a
          // base-layer rule, and `.chip` sets `display: inline-flex` from the components
          // layer, which wins — so the tag stayed on screen for every scene and marked
          // shipped work as at-launch. Set both: `hidden` for the accessibility tree, and an
          // inline `display` to actually beat the class.
          if (railFlagRef.current) {
            const shipped = line ? line.shipped : true
            railFlagRef.current.hidden = shipped
            railFlagRef.current.style.display = shipped ? "none" : ""
          }
        }

        // -2 = nothing to paint (drawn scene), -1 = frames not ready, hold the poster.
        const want =
          sc?.kind !== "frames"
            ? -2
            : cache.get(idx)?.ready
              ? Math.min(sc.frameCount - 1, Math.max(0, Math.round(localP * (sc.frameCount - 1))))
              : -1
        if (needsRedraw || want !== drawnFrame) {
          drawnFrame = want
          needsRedraw = false
          // Not ready, or nothing to paint: clear and let the scene's <Image> poster underlay
          // show through. We deliberately do NOT redraw the poster onto the canvas — next/image
          // serves it from a rewritten /_next/image URL, so `new Image().src = poster` is a
          // second fetch and a cache MISS, not the free redraw it looks like.
          if (want >= 0) drawCover(cache.get(idx)?.imgs[want])
          else clearCanvas()
        }

        // Dip to ink across each boundary: out over the last DIP of a scene, back over the
        // first DIP of the next. Written straight to style — the whole point of doing cuts this
        // way is that a cut costs one opacity write instead of a second decoded sequence.
        let dip = 0
        if (idx > 0 && localP < DIP) dip = 1 - localP / DIP
        else if (idx < spans.list.length - 1 && localP > 1 - DIP) dip = 1 - (1 - localP) / DIP
        const dipR = r2(dip)
        if (dipR !== lastDip) {
          lastDip = dipR
          if (dipRef.current) dipRef.current.style.opacity = String(dipR)
        }

        const anim = anims.get(idx)
        if (anim) anim.currentTime = localP * 1000

        // Publish this scene's local progress as a CSS custom property on its overlay container,
        // for overlays that draw themselves from it (Blueprint.tsx reads var(--scrub-p)). A
        // function prop cannot cross the RSC boundary and setState-per-frame is the exact bug
        // this engine is built to avoid; a custom property is neither, and CSS can consume it
        // directly. Written for every scene kind — it costs one setProperty on change.
        const scrubP = r2(localP)
        if (scrubP !== lastScrubP) {
          lastScrubP = scrubP
          overlays.get(idx)?.style.setProperty("--scrub-p", String(scrubP))
        }

        const fade =
          idx > 0
            ? 0
            : localP <= FADE_FROM
              ? 1
              : localP >= FADE_TO
                ? 0
                : 1 - (localP - FADE_FROM) / (FADE_TO - FADE_FROM)
        const fadeR = r2(fade)
        if (fadeR !== lastFade) {
          lastFade = fadeR
          for (const el of faders) {
            el.style.opacity = String(fadeR)
            // An invisible but focusable CTA is a trap, not a flourish.
            el.style.pointerEvents = fadeR < 0.05 ? "none" : ""
            if (fadeR < 0.05) el.setAttribute("aria-hidden", "true")
            else el.removeAttribute("aria-hidden")
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onResize = () => {
      needsRedraw = true
    }
    window.addEventListener("resize", onResize)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      for (const anim of anims.values()) anim.cancel()
      evict(1, 0) // empty window — drops every retained bitmap
    }
  }, [scrub, scenes, rail, spans])

  const railLine = (i: number) => {
    const line = rail[i]
    return {
      label: line?.label ?? "",
      status: line?.status ?? "",
      shipped: line ? line.shipped : true,
    }
  }

  if (!scrub) {
    /*
     * The static story. This is the mobile, no-JS, reduced-motion and screen-reader experience,
     * and it is the only version a crawler ever sees — so it has to carry the whole narrative on
     * its own, `at launch` markings included. It is not a placeholder for the film; the film is
     * an enhancement of it.
     */
    return (
      <div className={className}>
        {children}
        {scenes.map((scene, i) => {
          const line = railLine(i)
          return (
            <figure key={scene.id} className="mt-band first:mt-0">
              {scene.kind === "frames" ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-frame">
                  {/* Scene 0's poster is the LCP element. `sizes` must match the scrub's, or
                      next/image picks a different srcset candidate and the swap refetches. */}
                  <Image
                    src={scene.poster}
                    alt={scene.alt}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
              {scene.kind === "drawn" ? <span className="sr-only">{scene.alt}</span> : null}
              {/* --scrub-p: 1 so an overlay that draws itself from the scrub comes out FULLY
                  drawn here. This path must never depend on the rAF loop having run — it is
                  the no-JS, reduced-motion and mobile rendering. */}
              {scene.overlay ? (
                <div className="relative mt-8" style={{ "--scrub-p": "1" } as React.CSSProperties}>
                  {scene.overlay}
                </div>
              ) : null}
              <figcaption className="receipt mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ivory-line pt-3">
                <span>{line.label}</span>
                <span className="ml-auto">{line.status}</span>
                {line.shipped ? null : <span className="chip chip-launch">at launch</span>}
              </figcaption>
            </figure>
          )
        })}
      </div>
    )
  }

  const first = railLine(0)

  return (
    <div
      ref={stageRef}
      className={`relative ${className}`}
      style={{ height: `${spans.totalVh}vh` }}
    >
      <div
        ref={viewportRef}
        className="sticky top-0 h-screen w-full overflow-hidden bg-ink"
        style={{ backgroundColor: "var(--ink)" }}
      >
        {scenes.map((scene, i) =>
          scene.kind === "frames" ? (
            <div
              key={scene.id}
              data-film-poster={i}
              className="absolute inset-0"
              style={{ display: i === 0 ? "block" : "none" }}
            >
              <Image
                src={scene.poster}
                alt={scene.alt}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            </div>
          ) : null,
        )}

        {/*
         * aria-hidden + tabIndex={-1} together, and both are needed. The canvas is a decorative
         * duplicate of the poster underneath, which already carries the alt text — hide it or
         * the scene gets announced twice. But aria-hidden on something reachable by keyboard is
         * its own bug, and <canvas> is focusable by default, so the negative tabindex is what
         * makes hiding it legitimate rather than merely quiet.
         */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 h-full w-full"
        />

        {scenes.map((scene, i) => (
          <div
            key={scene.id}
            data-film-overlay={i}
            className="absolute inset-0"
            style={{ display: i === 0 ? "block" : "none" }}
          >
            {/* A drawn scene has no poster to carry alt text, so its description lives here. */}
            {scene.kind === "drawn" ? <span className="sr-only">{scene.alt}</span> : null}
            {scene.overlay}
          </div>
        ))}

        {children}

        {/* The cut. Above the footage and the overlays, below the rail — the rail is the one
            thing that is never covered. */}
        <div
          ref={dipRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 bg-ink"
          style={{ opacity: 0 }}
        />

        {/*
         * The status rail never fades and is never dipped over. It is the element that tells a
         * screen-reader user, and a regulator reading the page, which scenes describe shipped
         * behaviour and which are roadmap (UWG §5). aria-live because its text is swapped by
         * ref rather than by a React render.
         */}
        <div
          aria-live="polite"
          className="on-ink absolute inset-x-0 bottom-0 z-30 bg-ink/80 backdrop-blur"
        >
          <div className="receipt flex items-center gap-4 px-6 py-3">
            <span ref={railLabelRef}>{first.label}</span>
            <span
              ref={railFlagRef}
              hidden={first.shipped}
              // See the tick loop: `.chip`'s display beats `[hidden]`, so the initial state
              // has to carry the same inline override the loop writes.
              style={first.shipped ? { display: "none" } : undefined}
              className="chip chip-launch"
            >
              at launch
            </span>
            <span ref={railStatusRef} className="ml-auto">
              {first.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
