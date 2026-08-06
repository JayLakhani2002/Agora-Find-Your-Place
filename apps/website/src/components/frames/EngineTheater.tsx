"use client"

import { observeOnce } from "@/components/Motion"
import type { TheaterEvent } from "@/content/live-data"
import { cn } from "@/lib/cn"
import gsap from "gsap"
import { useEffect, useRef } from "react"

/**
 * The engine terminal — the site's signature object, and the one place boldness is spent.
 *
 * The whole transcript is server-rendered plain text. That is the first frame, the LCP
 * candidate, what a crawler reads, and what a reduced-motion or JS-off visitor gets. The
 * typing effect is layered on top: under `.js-motion` the lines start clipped to zero
 * width and GSAP types them at ~30ms/char, then loops after a pause.
 *
 * Every company, title, city, contract and German requirement below is a real row from
 * live-data.json, read from the production database at build time. No match score is ever
 * attached to a real listing — inventing one would be a fabricated claim about a named
 * company. The header says `live` about the index, and the caption says `replayed` about
 * the animation, because both of those are true and they are different things.
 */
export function EngineTheater({
  events,
  title,
  status,
  caption,
  footer,
  alt,
  className,
}: {
  events: TheaterEvent[]
  title: string
  status: string
  caption: string
  footer: string
  alt: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"))
    if (!lines.length) return

    const canType = window.matchMedia("(min-width: 640px)").matches
    const masks = Array.from(root.querySelectorAll<HTMLElement>("[data-mask]"))
    const metas = Array.from(root.querySelectorAll<HTMLElement>("[data-meta]"))

    /**
     * Measure every mask at its natural width FIRST, while the text is still laid out.
     * Clipping them to zero before measuring makes `scrollWidth` report ~0, and each line
     * then "types" from nothing to nothing — a panel of empty ✓ markers.
     */
    if (canType) {
      for (const mask of masks) {
        mask.style.display = "inline-block"
        mask.style.overflow = "hidden"
        mask.style.whiteSpace = "nowrap"
        mask.style.verticalAlign = "bottom"
      }
    }
    const widths = new Map(masks.map((m) => [m, m.scrollWidth]))

    /**
     * Where a line can type, the panel keeps its scaffolding visible from the first frame:
     * every `[HH:MM]` stamp and `✓` marker is there, with only the text clipped to zero
     * width. Hiding whole lines instead left the panel as a large empty rectangle for the
     * first few seconds — which, as the hero's centrepiece, read as broken rather than as
     * loading. Structure first, content typed in after.
     */
    if (canType) {
      gsap.set(masks, { width: 0 })
      gsap.set(metas, { opacity: 0 })
    } else {
      // Narrow screens wrap instead of clipping, so they fade whole lines in — clipping a
      // wrapped line to a character width would hide the wrapped remainder.
      gsap.set(lines, { opacity: 0 })
    }

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 3, paused: true })

    for (const line of lines) {
      const mask = line.querySelector<HTMLElement>("[data-mask]")
      const meta = line.querySelector<HTMLElement>("[data-meta]")

      if (!canType) tl.fromTo(line, { opacity: 0 }, { opacity: 1, duration: 0.18 })
      if (mask && canType) {
        tl.fromTo(
          mask,
          { width: 0 },
          {
            width: widths.get(mask) ?? "auto",
            duration: Math.min(0.75, (mask.textContent?.length ?? 20) * 0.013),
            ease: "none",
          },
        )
      }
      if (meta) {
        tl.fromTo(meta, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.22 }, ">-0.05")
      }
      tl.to({}, { duration: 0.1 })
    }

    const stop = observeOnce(root, () => tl.play())

    // Don't burn CPU on a background tab.
    const onVisibility = () => (document.hidden ? tl.pause() : tl.play())
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
      tl.kill()
      gsap.set([...lines, ...masks, ...metas], { clearProps: "all" })
    }
  }, [])

  return (
    <figure
      ref={ref}
      role="img"
      aria-label={alt}
      className={cn(
        "relative overflow-hidden rounded-card bg-ink text-text-on-dark shadow-float",
        "ring-1 ring-ink-line",
        className,
      )}
    >
      <figcaption className="sr-only">{alt}</figcaption>

      {/* Header: the product name, and a live dot for the index it reads from. */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-clay-soft/60" />
        </span>
        <span className="ml-1.5 font-data text-[0.75rem] text-text-on-dark/80">{title}</span>
        <span className="ml-auto flex items-center gap-1.5 font-data text-[0.6875rem] uppercase tracking-[0.14em] text-clay-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-clay-soft" />
          {status}
        </span>
      </div>

      <ol className="flex flex-col gap-2.5 px-4 py-5 font-data text-[0.75rem] leading-relaxed sm:px-5 sm:text-[0.8125rem]">
        {events.map((e) =>
          e.kind === "scan" ? (
            <li key={e.t} data-line className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-white/25">[{e.t}]</span>
              <span data-mask className="text-text-on-dark-mute">
                {e.text}
              </span>
            </li>
          ) : (
            <li key={`${e.t}-${e.company}`} data-line className="pl-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span aria-hidden="true" className="text-clay-soft">
                  ✓
                </span>
                <span data-mask className="text-text-on-dark">
                  <span className="text-clay-soft">{e.company}</span>
                  <span className="text-white/30"> · </span>
                  {e.title}
                </span>
              </p>
              <p
                data-meta
                className="pl-5 text-[0.6875rem] text-text-on-dark-mute sm:text-[0.75rem]"
              >
                {e.meta?.join(" · ")}
              </p>
            </li>
          ),
        )}
        <li aria-hidden="true" className="pl-1 text-clay-soft">
          <span className="caret">▍</span>
        </li>
      </ol>

      {/* The only number in the panel, and it comes from the claims registry. */}
      <div className="border-t border-white/10 px-4 py-3 sm:px-5">
        <p className="font-data text-[0.75rem] text-text-on-dark">{footer}</p>
        <p className="mt-1 font-data text-[0.6875rem] text-text-on-dark-mute">{caption}</p>
      </div>
    </figure>
  )
}
