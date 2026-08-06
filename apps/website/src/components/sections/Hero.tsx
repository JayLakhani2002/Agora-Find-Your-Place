import { EngineTheater } from "@/components/frames/EngineTheater"
import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"
import { theaterScript } from "@/content/live-data"
import Image from "next/image"
import Link from "next/link"
import type { CSSProperties } from "react"

const cue = (d: string) => ({ "--d": d }) as CSSProperties

/**
 * Hero — a full-bleed cinematic open, then the proof.
 *
 * The photograph is 02:00 in a Berlin apartment: empty chair, laptop lit and working,
 * the city asleep through the window. It is the headline as an image — the desk is empty
 * because you are not at it. The footer closes on the same room at 07:00 with the laptop
 * shut, so the whole page reads as one night passing.
 *
 * The terminal sits directly underneath on the light canvas, which is deliberate: the
 * image shows a screen glowing, and the next thing you see is what that screen was
 * actually doing — real rows from the real index.
 *
 * Text legibility over photography is handled by a two-axis scrim (bottom + left) rather
 * than by darkening the whole image, so the Fernsehturm and the window light survive.
 */
export function Hero() {
  const { hero, theater } = en
  return (
    <>
      {/*
       * Height is kept close to the image's own 21:9 so `object-cover` barely crops. At
       * 88vh the container was ~1.8:1, which sliced ~200px off each side and threw away
       * both the window on the left and the desk lamp on the right — the two things that
       * make the photograph readable as a room.
       */}
      <section className="relative flex min-h-[clamp(36rem,90vh,52rem)] items-end overflow-hidden">
        <Image
          src="/img/hero-night.jpg"
          alt={hero.imageAlt}
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        {/*
         * Scrim. Two gradients, each covering only the part of the frame the copy sits on,
         * so the photograph survives everywhere else. Stacking two full-inset gradients
         * (the first attempt) compounded to near-opaque and wiped the image out entirely —
         * the window, the lamp and the Fernsehturm all disappeared.
         */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 h-[64%] bg-gradient-to-t from-ink via-ink/78 to-transparent"
        />

        <div className="shell on-ink relative pb-[clamp(3rem,6vw,4.5rem)] pt-24">
          <p style={cue("0.1s")} className="cue chip chip-launch">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-apricot" />
            {hero.badge}
          </p>

          <h1 className="mt-7 max-w-[20ch] text-balance text-d1 font-bold text-white">
            <Split text={hero.headline} accent={hero.headlineAccent} accentClass="text-apricot" />
          </h1>

          <p style={cue("0.55s")} className="cue mt-7 max-w-prose text-lead text-white/70">
            {hero.sub}
          </p>

          <div style={cue("0.7s")} className="cue mt-9 flex flex-wrap items-center gap-3">
            <a href={en.nav.ctaHref} data-magnetic className="btn btn-primary">
              {hero.ctaPrimary}
            </a>
            <Link href={hero.ctaSecondaryHref} className="btn btn-secondary">
              {hero.ctaSecondary}
              <span aria-hidden="true">↓</span>
            </Link>
          </div>
        </div>
      </section>

      {/* The proof, immediately: that glowing screen, and what was actually on it. */}
      <section className="band pb-band pt-[clamp(3rem,6vw,5rem)]">
        <div className="shell">
          <p data-reveal className="eyebrow">
            {theater.eyebrow}
          </p>
          <div data-reveal-card className="relative mt-6">
            <div
              aria-hidden="true"
              className="glow-indigo pointer-events-none absolute inset-x-10 bottom-6 top-12 -z-10 rounded-card"
            />
            <EngineTheater
              events={theaterScript()}
              title={theater.title}
              status={theater.status}
              caption={theater.caption}
              footer={theater.footer}
              alt={theater.alt}
            />
          </div>
          <p data-reveal className="receipt mt-6">
            {hero.receipt}
          </p>
        </div>
      </section>
    </>
  )
}
