import { Blueprint } from "@/components/film/Blueprint"
import { DiffCard } from "@/components/frames/DiffCard"
import { EngineTheater } from "@/components/frames/EngineTheater"
import { JobCard } from "@/components/frames/JobCard"
import { MatchCard } from "@/components/frames/MatchCard"
import { ScoreBars } from "@/components/frames/ScoreBars"
import { type FilmScene, FilmScrub } from "@/components/ui/FilmScrub"
import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"
import { theaterScript } from "@/content/live-data"
import Link from "next/link"
import type { CSSProperties } from "react"

const cue = (d: string) => ({ "--d": d }) as CSSProperties

/**
 * Hero — a four-scene scroll film, told without narration.
 *
 * WHY A FILM, AND WHY THESE PICTURES. The previous hero was a corridor of coat hooks hung
 * with six trades' garments. It made the all-professions argument well and it opened on the
 * wrong note: the first frame read gastronomy and manual work, and the people who arrive
 * here first are professionals and technical people who already run agents. Jay's call,
 * 2026-08-06 — open professional, and let breadth arrive once the mechanism is understood.
 * Breadth did not get deleted, it moved: see `proof.breadth`, which is a stronger place for
 * it anyway, because there it is a printout of the index rather than a promise.
 *
 * NO FACES, still. Hands and devices only. A face codes an age, a gender and an ethnicity,
 * and quietly tells most readers the product is for someone else. Hands code the work.
 *
 * EVERY SCREEN IN THE FOOTAGE WAS SHOT BLANK. The clips were prompted to hold a featureless
 * warm glow, and the real product UI is composited on top as live DOM — the same components
 * the rest of the page uses, reading the same live-data snapshot. That is not a shortcut, it
 * is the honesty mechanism: generated screen content hallucinates glyphs and invents logos,
 * and it cannot be corrected later without regenerating the film. Nothing on a screen here
 * can be false, because every screen is the shipped interface printing real rows.
 *
 * THE TWO REGISTERS. Scenes 01–03 are recordings of things that run today. Scene 04 is a
 * DRAWING, because WhatsApp, Claude/MCP and agent submission are not built — see the block
 * comment at the top of components/film/Blueprint.tsx, which explains why that scene must
 * never become footage. The film's status rail states each scene's shipped/at-launch status
 * as real text, so the marking reaches screen readers in the same breath as the picture.
 *
 * The standalone "That screen, last night" theater band that used to sit under the hero is
 * gone: scene 01 IS that panel, now on a laptop in a dark room, which is where it always
 * wanted to be. `theater.*` copy is still consumed — by the panel, inside the film.
 */

/**
 * Module-level on purpose. FilmScrub's effect depends on this array, so an inline literal
 * in the component body would hand it a new identity on every render and tear the film down
 * mid-scroll. The engine documents this on the prop; this is the other half of the contract.
 *
 * stageVh is the scrub budget per scene — more height is a slower, more deliberate camera.
 * Scene 03 gets the least because it is a locked-off shot whose only event is one click.
 */
const SCENES: FilmScene[] = [
  {
    kind: "frames",
    id: "find",
    frameCount: 60,
    framePrefix: "/frames/film/s01/f_",
    poster: "/img/film-s01-poster.jpg",
    alt: en.film.alts[0] ?? "",
    stageVh: 260,
    // The camera pushes from the whole room to the screen filling the frame, so the panel
    // rises and grows with it — it reads as the thing the camera was travelling towards
    // rather than a card parked on top of a video.
    overlayTrack: [
      { atP: 0.08, transform: "translateY(4%) scale(0.88)", opacity: 0 },
      { atP: 0.34, transform: "translateY(0%) scale(0.94)", opacity: 1 },
      { atP: 1, transform: "translateY(-2%) scale(1.04)", opacity: 1 },
    ],
    overlay: (
      // Sits in the UPPER half, clear of the copy block at the bottom, and wide enough that
      // the terminal lines are not cut mid-word: a real row like "Vivantes Netzwerk für
      // Gesundheit GmbH · Küchenhelfer/innen im Speisenverteilzentrum (m/w/d)" needs ~780px
      // at this size, and the card is overflow-hidden with no wrap, so anything narrower
      // slices the employer's name in half.
      <div className="shell flex h-full items-start justify-end pt-[9vh]">
        <div className="w-full max-w-4xl">
          <EngineTheater
            events={theaterScript()}
            title={en.theater.title}
            status={en.theater.status}
            caption={en.theater.caption}
            footer={en.theater.footer}
            alt={en.theater.alt}
          />
        </div>
      </div>
    ),
  },
  {
    kind: "frames",
    id: "match",
    frameCount: 73,
    framePrefix: "/frames/film/s02/f_",
    poster: "/img/film-s02-poster.jpg",
    alt: en.film.alts[1] ?? "",
    stageVh: 240,
    // The phone drifts through this shot, so the cards do NOT sit on the glass — matching a
    // moving, rotating device per frame is a tracking problem we have no reason to take on.
    // They float over the out-of-focus left third instead, which is stable all shot and is
    // the one region with nothing in it worth seeing.
    overlayTrack: [
      { atP: 0.1, transform: "translateY(6%)", opacity: 0 },
      { atP: 0.34, transform: "translateY(0%)", opacity: 1 },
      { atP: 1, transform: "translateY(-4%)", opacity: 1 },
    ],
    overlay: (
      <div className="shell flex h-full items-center">
        <div className="flex w-full max-w-md flex-col gap-4">
          <JobCard
            company={en.frames.jobCard.company}
            title={en.frames.jobCard.title}
            chips={en.frames.jobCard.chips}
            alt={en.frames.jobCard.alt}
          />
          <MatchCard
            title={en.frames.matchTitle}
            reasons={en.frames.matchReasons}
            alt={en.frames.matchAlt}
          />
          <p className="receipt text-white/70">{en.film.receipts[1]}</p>
        </div>
      </div>
    ),
  },
  {
    kind: "frames",
    id: "draft",
    frameCount: 48,
    framePrefix: "/frames/film/s03/f_",
    poster: "/img/film-s03-poster.jpg",
    alt: en.film.alts[2] ?? "",
    stageVh: 220,
    overlayTrack: [
      { atP: 0.08, transform: "translateY(5%)", opacity: 0 },
      { atP: 0.3, transform: "translateY(0%)", opacity: 1 },
      { atP: 1, transform: "translateY(-3%)", opacity: 1 },
    ],
    // What is shown here is the DRAFT and its grade — not the agent filling the employer's
    // form. That step carries `atLaunch: true` in `pipeline`, so it appears exactly once on
    // this page, in scene 04's drawing. The hand in this footage is the whole point of the
    // scene: today, the person clicks Submit.
    overlay: (
      <div className="shell flex h-full items-center">
        <div className="grid w-full gap-4 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <DiffCard title={en.frames.diffTitle} rows={en.frames.diffRows} alt={en.frames.diffAlt} />
          <div className="flex flex-col gap-4">
            <ScoreBars
              score={92}
              title={en.frames.scoreTitle}
              outOf={en.frames.scoreOutOf}
              dimensions={en.frames.scoreDimensions}
              alt={en.frames.scoreAlt}
            />
            <p className="receipt text-white/70">{en.film.receipts[2]}</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    kind: "drawn",
    id: "at-launch",
    stageVh: 240,
    alt: en.film.alts[3] ?? "",
    overlay: (
      // max-w-5xl, not the full shell. The three panels are aspect-ratio boxes, so panel
      // width sets panel height: across the full 1320px shell each one is 533px tall and the
      // sheet plus its title block and closing line runs past the viewport, cropping the
      // title block — which is a legal marking and the one thing that must never scroll off.
      <div className="shell flex h-full flex-col justify-center gap-10 py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Blueprint copy={en.film.blueprint} />
        </div>
        <p className="mx-auto w-full max-w-5xl text-lead text-text">{en.film.close}</p>
      </div>
    ),
  },
]

export function Hero() {
  const { hero, film } = en
  return (
    <FilmScrub scenes={SCENES} rail={film.rail}>
      {/*
       * data-scrub-fade: this block leaves before the first cut. The engine fades it over
       * scene 0's local 0.7 → 0.9 and holds it at zero for every later scene — otherwise the
       * ink wipe between scenes reads as the headline being switched off. With no scrub
       * running (mobile, reduced motion, no JS) the attribute does nothing and the copy stays
       * at full opacity above the static stack, which is the correct static hero.
       *
       * THE SCRIMS LIVE INSIDE THIS BLOCK, not beside it. They exist only to make this copy
       * legible over the footage, and `children` renders across every scene — so left outside
       * they kept darkening scene 04, which is a drawing on ivory, and smeared a black
       * gradient across the bottom two thirds of a white sheet. Fading them out with the copy
       * they serve is both correct and one fewer thing to keep in sync.
       *
       * inset-0 rather than bottom-0 because the scrims' percentage heights have to resolve
       * against the full stage; in a bottom-anchored auto-height parent they would resolve
       * against the copy block instead.
       */}
      <div
        data-scrub-fade
        className="absolute inset-0 flex flex-col justify-end transition-opacity"
      >
        {/*
         * Bottom-weighted only. Darkening the whole frame would kill the screen glow, which
         * is the one light source scene 01 is built around. Two stacked gradients rather than
         * one because the copy band needs a near-opaque floor while the rest of the image
         * only needs a tint — a single gradient shaped to do both darkens the whole shot.
         */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[82%] bg-gradient-to-t from-ink via-ink/90 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink via-ink/95 to-transparent"
        />

        <div className="shell on-ink relative pb-[clamp(4.5rem,7vw,6rem)]">
          {/*
           * The badge carries its own backdrop rather than trusting the scrim. It sits
           * highest of all the copy, where the gradient has faded to almost nothing, and it
           * has to survive both the near-black opening frames and the blown-out screen at
           * the end of the push-in. `chip-launch` is the quiet treatment for "not built yet"
           * markers on a light canvas; this is neither of those things.
           */}
          <p
            style={cue("0.1s")}
            className="cue chip border border-white/25 bg-ink/70 text-white/90 backdrop-blur-sm"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-clay-soft" />
            {hero.badge}
          </p>

          <h1 className="mt-7 max-w-[18ch] text-balance text-d1 font-bold text-white">
            {/*
             * clay-bright, not clay-soft. Measured against this footage, `soft` is a mid-tone
             * and falls under the 3:1 large-text floor wherever the screen glow rises behind
             * the copy; `bright` is the token that exists for accent text over photography.
             */}
            <Split
              text={hero.headline}
              accent={hero.headlineAccent}
              accentClass="text-clay-bright"
            />
          </h1>

          {/*
           * white/80, not the /70 this site uses for sub copy on flat ink. Measured against
           * the footage it is /70 that fails: as the camera pushes in, the laptop glow rises
           * into the copy band and the worst frame put this line at 4.35:1, under the 4.5
           * body floor. Body text over moving footage does not get the same opacity as body
           * text over a flat surface — the surface here is not flat.
           */}
          <p style={cue("0.55s")} className="cue mt-7 max-w-prose text-lead text-white/80">
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

          {/*
           * /75 rather than the /55 receipts use elsewhere, and for a harder reason than the
           * sub above: this is 13px, so it is small text and needs the full 4.5:1 with no
           * large-text concession. At /55 it measured 2.91:1 over the brightest frame — the
           * worst-failing element in the hero, and the easiest to miss because it reads as
           * decorative small print rather than as content.
           */}
          <p style={cue("0.85s")} className="cue receipt mt-7 text-white/75">
            {hero.receipt}
          </p>
        </div>
      </div>
    </FilmScrub>
  )
}
