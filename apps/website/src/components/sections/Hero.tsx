import { ApplyCard } from "@/components/frames/ApplyCard"
import { Browser } from "@/components/frames/Browser"
import { ChatThread } from "@/components/frames/ChatThread"
import { DiffCard } from "@/components/frames/DiffCard"
import { DraftCard } from "@/components/frames/DraftCard"
import { JobCard } from "@/components/frames/JobCard"
import { MatchCard } from "@/components/frames/MatchCard"
import { ScoreBars } from "@/components/frames/ScoreBars"
import { TerminalRun } from "@/components/frames/TerminalRun"
import { type FilmScene, FilmScrub } from "@/components/ui/FilmScrub"
import { FilmSteps } from "@/components/ui/FilmSteps"
import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"
import Link from "next/link"

/**
 * Hero — "the launch film". A MacBook Pro opens in a black room and its screen becomes the page.
 *
 * THE SHAPE. Jay, 2026-08-07: close on a MacBook Pro, one hand lifting the lid, a dark black
 * environment, "all text should be inside the laptop screen and the screen content should be the
 * whole page hero section". So scene 01 is footage of the lift, and from scene 02 on the screen
 * IS the viewport — every word of the hero lives on it.
 *
 * THAT INSTRUCTION FIXED A MEASURED BUG, not just a look. When the copy was overlaid on the
 * footage it crossed the laptop's black front edge and the hands: the sub measured 1.26:1 and
 * the secondary button 1.00:1 against the darkest pixels behind them — invisible, not merely
 * weak. Moving the copy inside the screen puts it on a surface we control, so contrast stops
 * depending on which frame happens to be behind which word.
 *
 * NOTHING IS COMPOSITED ONTO THE LID WHILE IT MOVES. Through the lift the screen stays a blank
 * glow, exactly as a waking screen does, because a rotating lid under a moving camera is not an
 * axis-aligned rectangle and anything placed on it would swim. Scene 02 then opens at the size
 * the screen reached in the final frame (measured: 63.5% of frame width) and grows to fill. Both
 * sides of that cut are a bright rectangle on black, so it reads as entering the screen.
 *
 * WHY IT MAY SHOW UNBUILT FEATURES. Root CLAUDE.md permits auto-apply "only as clearly-labeled
 * roadmap, never as an existing feature", and this is the page AWS reads for the Bedrock
 * use-case. Three markings carry it, none optional: `film.frameChip` names the film; the status
 * rail holds a per-scene chyron at EVERY scroll position (a scrubbed film has no guaranteed cold
 * open, so anything shown once can be missed); and the `Receipt` band directly below prints what
 * actually ran last night, from live data.
 */

/** How wide the lit screen is in the last frame of the lift. Scene 02 starts here so the cut
 *  reads as continuous. Re-measure if the lift is ever re-shot. */
const SCREEN_AT_HANDOFF = 0.635

/** Module-level: FilmScrub's effect depends on this array, and a new identity mid-scroll tears
 *  the film down and rebuilds it from scene 0. */
const SCENES: FilmScene[] = [
  {
    kind: "frames",
    id: "open-it",
    frameCount: 73,
    framePrefix: "/frames/film/lid/f_",
    poster: "/img/lid-poster.jpg",
    alt: en.film.alts[0] ?? "",
    // Deliberately the shortest scene. Every word of the hero lives inside the screen, so until
    // the lid is open the page has no headline — this has to be over quickly.
    stageVh: 150,
  },
  {
    kind: "drawn",
    id: "workspace",
    stageVh: 400,
    alt: en.film.alts[1] ?? "",
    backdrop: "ink",
    overlay: (
      <div className="flex h-full items-center justify-center px-[3vw] py-[7vh]">
        <div
          className="h-full w-full"
          style={{
            transform: `scale(calc(${SCREEN_AT_HANDOFF} + ${1 - SCREEN_AT_HANDOFF} * var(--scrub-p, 1)))`,
            transformOrigin: "center",
          }}
        >
          <Browser url={en.film.act1.url} className="h-full">
            <div className="flex h-full items-center justify-center p-[4vh]">
              <FilmSteps mode="handoff" className="w-full max-w-3xl">
                {/*
                 * Step one is the hero copy itself. This is the "all text inside the screen"
                 * instruction taken literally: the headline, the sub and both calls to action
                 * are page content that happens to be rendered on a laptop screen, not a
                 * caption over a photograph.
                 */}
                <div className="text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <p className="chip chip-brand">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-clay" />
                      {en.hero.badge}
                    </p>
                    {/*
                     * Names the film. One third of the honesty frame — the rail is the second
                     * and the receipt band below is the third. Removing this is not a copy edit.
                     */}
                    <p className="chip border border-dashed border-ink/25 bg-transparent text-text-mute">
                      {en.film.frameChip}
                    </p>
                  </div>
                  <h1 className="mx-auto mt-6 max-w-[16ch] text-balance text-d2 font-bold text-ink">
                    <Split
                      text={en.hero.headline}
                      accent={en.hero.headlineAccent}
                      accentClass="text-clay"
                    />
                  </h1>
                  <p className="mx-auto mt-5 max-w-prose text-lead text-text-mute">{en.hero.sub}</p>
                  <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <a href={en.nav.ctaHref} data-magnetic className="btn btn-primary">
                      {en.hero.ctaPrimary}
                    </a>
                    <Link href={en.hero.ctaSecondaryHref} className="btn btn-secondary">
                      {en.hero.ctaSecondary}
                      <span aria-hidden="true">↓</span>
                    </Link>
                  </div>
                </div>

                <DraftCard
                  title={en.film.act1.dropFilename}
                  body={en.film.act1.dropLabel}
                  alt={en.film.act1.dropAlt}
                />
                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  <DiffCard
                    title={en.frames.diffTitle}
                    rows={en.frames.diffRows}
                    alt={en.frames.diffAlt}
                  />
                  <ScoreBars
                    score={92}
                    title={en.frames.scoreTitle}
                    outOf={en.frames.scoreOutOf}
                    dimensions={en.frames.scoreDimensions}
                    alt={en.frames.scoreAlt}
                  />
                </div>
                <ApplyCard
                  title={en.frames.applyTitle}
                  role={en.frames.applyRole}
                  fields={en.frames.applyFields}
                  cta={en.frames.applyCta}
                  note={en.frames.applyNote}
                  alt={en.frames.applyAlt}
                />
                <DraftCard
                  title={en.film.act1.sentTitle}
                  body={en.film.act1.sentBody}
                  alt={en.film.act1.sentAlt}
                />
              </FilmSteps>
            </div>
          </Browser>
        </div>
      </div>
    ),
  },
  {
    kind: "drawn",
    id: "terminal",
    stageVh: 210,
    alt: en.film.alts[2] ?? "",
    backdrop: "ink",
    overlay: (
      <div className="flex h-full items-center justify-center px-[3vw] py-[9vh]">
        <div className="w-full max-w-4xl">
          <TerminalRun
            title={en.film.act2.title}
            lines={en.film.act2.lines}
            alt={en.film.act2.alt}
          />
          <p className="receipt mt-5 text-text-on-dark-mute">{en.film.act2.receipt}</p>
        </div>
      </div>
    ),
  },
  {
    kind: "drawn",
    id: "chat",
    stageVh: 210,
    alt: en.film.alts[3] ?? "",
    backdrop: "ink",
    overlay: (
      <div className="flex h-full items-center justify-center px-[3vw] py-[9vh]">
        <div className="w-full max-w-md">
          <ChatThread messages={en.film.act3.messages} alt={en.film.act3.alt} />
          <p className="receipt mt-5 text-text-on-dark-mute">{en.film.act3.receipt}</p>
        </div>
      </div>
    ),
  },
  {
    kind: "drawn",
    id: "reveal",
    stageVh: 190,
    alt: en.film.alts[4] ?? "",
    backdrop: "ink",
    overlay: (
      <div className="shell flex h-full flex-col items-center justify-center gap-8 text-center">
        {/*
         * The kicker and the tagline are ONE block and must never be separated — not here, not
         * in the static stack, not in a crop, not in a deck. "Every job. Every device. One
         * click." is the boldest claim on the page: under "At launch" it is a labelled promise,
         * and alone it is a statement about today that is not true.
         */}
        <div>
          <p className="receipt text-clay-soft">{en.film.close.kicker}</p>
          <p className="mt-4 text-balance text-d2 font-bold text-text-on-dark">
            <Split
              text={en.film.close.tagline}
              accent={en.film.close.taglineAccent}
              accentClass="text-clay-soft"
            />
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href={en.nav.ctaHref} data-magnetic className="btn btn-primary">
            {en.hero.ctaPrimary}
          </a>
          <Link href={en.hero.ctaSecondaryHref} className="btn btn-secondary">
            {en.hero.ctaSecondary}
            <span aria-hidden="true">↓</span>
          </Link>
        </div>
      </div>
    ),
  },
]

export function Hero() {
  const { film } = en
  // No `children`. Everything the visitor reads is inside a scene now — that is the instruction,
  // and it is also what stopped the copy from ever landing on unpredictable footage again.
  return <FilmScrub scenes={SCENES} rail={film.rail} />
}
