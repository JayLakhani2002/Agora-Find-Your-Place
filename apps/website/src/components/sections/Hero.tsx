import { EngineTheater } from "@/components/frames/EngineTheater"
import { CinematicScrub } from "@/components/ui/CinematicScrub"
import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"
import { theaterScript } from "@/content/live-data"
import Link from "next/link"
import type { CSSProperties } from "react"

const cue = (d: string) => ({ "--d": d }) as CSSProperties

/**
 * Hero — "Schichtwechsel", a scroll-scrubbed cinematic open, then the proof.
 *
 * WHY THIS IMAGE. The previous hero was a Berlin flat at 02:00 with a glowing laptop. It was
 * a good photograph and it was the wrong one: a lone laptop above the Berlin skyline reads
 * office-worker and reads Berlin, and this page promises neither. It sells to the audience
 * every competitor already fights over, and quietly excludes the one nobody is serving.
 *
 * What replaced it is a wall of coat hooks in a back-of-house corridor before dawn: chef's
 * whites, hi-vis, a care tunic with a lanyard, a courier jacket, a shop apron, a blazer. The
 * camera tracks past them, then pushes through the open door into dawn light that blows out
 * to warm white — and that white resolves into the ivory page canvas, so the section below
 * IS the room you just walked into.
 *
 * NO FACES, deliberately. Any face codes an age, a gender, an ethnicity, and quietly tells
 * most readers the product is for someone else. Empty garments code the WORK instead, and
 * the reader fills them in themselves. It also sidesteps the stock-photo-of-smiling-workers
 * cliché that every rival in this category leans on.
 *
 * The terminal sits directly underneath on the light canvas: the film ends by walking into
 * the light, and the first thing in that light is what the engine actually did last night.
 *
 * Text legibility over the footage is a bottom scrim only, not a full darkening, so the
 * garments and the doorway survive behind the copy.
 */
export function Hero() {
  const { hero, theater } = en
  return (
    <>
      <CinematicScrub
        frameCount={150}
        framePrefix="/frames/shift/frame_"
        poster="/img/hero-shift-poster.jpg"
        alt={hero.imageAlt}
        stageVh={420}
      >
        <>
          {/*
           * Scrim over the bottom only. Darkening the whole frame killed the doorway light,
           * which is the one thing the last third of the clip is about.
           *
           * A scrubbing hero raises a problem a still one doesn't: the copy has to stay legible
           * against ALL 150 frames. This clip runs from a near-black corridor to a blown-out
           * white doorway, so there is no single overlay that is safe by luck. The gradient is
           * therefore opaque at the very bottom — where the headline, sub and buttons sit —
           * rather than merely tinted.
           */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[82%] bg-gradient-to-t from-ink via-ink/90 to-transparent"
          />
          {/*
           * Second, tighter scrim under the copy block itself. The gradient above is shaped for
           * the DARK frames; on the blown-out doorway frames at the end of the clip the accent
           * line ("Not just desk jobs.") measured barely above its background, because clay-soft
           * over near-white is a weak pair. Rather than darken the whole hero — which would
           * throw away the doorway light the last third of the clip is built around — the copy
           * band gets its own floor.
           */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-ink via-ink/92 to-transparent"
          />

          {/*
           * data-scrub-fade: this block leaves before the frame blows out to white. See the
           * fade logic in CinematicScrub — it exists for contrast, not for flourish. With no
           * scrub running (mobile, reduced motion, no JS) the attribute does nothing and the
           * copy simply stays at full opacity, which is the correct static hero.
           */}
          <div data-scrub-fade className="absolute inset-x-0 bottom-0 transition-opacity">
            <div className="shell on-ink relative pb-[clamp(3rem,6vw,4.5rem)]">
              {/*
               * The badge carries its own backdrop rather than relying on the scrim. It sits
               * highest of all the copy, where the gradient has already faded to near-nothing,
               * and testing showed it unreadable against the mid-clip frames — the wall behind
               * it is a light plaster tan. `chip-launch` is a deliberately quiet treatment for
               * "not built yet" markers on a light canvas; this is neither of those things.
               */}
              <p
                style={cue("0.1s")}
                className="cue chip border border-white/25 bg-ink/70 text-white/90 backdrop-blur-sm"
              >
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-clay-soft" />
                {hero.badge}
              </p>

              <h1 className="mt-7 max-w-[20ch] text-balance text-d1 font-bold text-white">
                <Split
                  text={hero.headline}
                  accent={hero.headlineAccent}
                  accentClass="text-clay-bright"
                />
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
          </div>
        </>
      </CinematicScrub>

      {/* The proof, immediately: that glowing screen, and what was actually on it. */}
      <section className="band pb-band pt-[clamp(3rem,6vw,5rem)]">
        <div className="shell">
          <p data-reveal className="eyebrow">
            {theater.eyebrow}
          </p>
          <div data-reveal-card className="relative mt-6">
            <div
              aria-hidden="true"
              className="glow-clay pointer-events-none absolute inset-x-10 bottom-6 top-12 -z-10 rounded-card"
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
