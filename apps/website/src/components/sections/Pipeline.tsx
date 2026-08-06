import { ApplyCard } from "@/components/frames/ApplyCard"
import { DiffCard } from "@/components/frames/DiffCard"
import { JobCard } from "@/components/frames/JobCard"
import { MatchCard } from "@/components/frames/MatchCard"
import { ScoreBars } from "@/components/frames/ScoreBars"
import { TrackerRows } from "@/components/frames/TrackerRows"
import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"
import { cn } from "@/lib/cn"
import type { ReactNode } from "react"

/**
 * The pipeline — four steps, and the page's one pinned scene.
 *
 * This is the only section where 01/02/03/04 earns its place: find → prep → apply → track
 * is a genuine order, and a reader who takes step three before step two has misunderstood
 * the product. Everywhere else on the page numbered markers would be decoration.
 *
 * Desktop (≥1024px): the inner block pins and the four panels cross-fade as the rail
 * scrubs, driven by Motion.tsx via the `data-pin="steps"` contract. Below that width it
 * degrades to a horizontal snap carousel, which is the better interaction on a phone
 * anyway — and reduced-motion visitors never meet the pin at all, so they simply read
 * four stacked panels with nothing hidden.
 *
 * Every step ends in a mono receipt. That repetition is the texture that ties this section
 * to the terminal in the hero: the machine reports what it did, in the same voice.
 */

/** Each step's product frame. Real component mockups, not screenshots — they retheme. */
const FRAMES: Record<string, ReactNode> = {
  "01": (
    <div className="grid gap-4 sm:grid-cols-2">
      <JobCard {...en.frames.jobCard} className="shadow-card" />
      <MatchCard
        title={en.frames.matchTitle}
        reasons={en.frames.matchReasons}
        alt={en.frames.matchAlt}
        className="shadow-card"
      />
    </div>
  ),
  "02": (
    <div className="grid gap-4 sm:grid-cols-2">
      <DiffCard
        title={en.frames.diffTitle}
        rows={en.frames.diffRows}
        alt={en.frames.diffAlt}
        className="shadow-card"
      />
      <ScoreBars
        score={92}
        title={en.frames.scoreTitle}
        outOf={en.frames.scoreOutOf}
        dimensions={en.frames.scoreDimensions}
        alt={en.frames.scoreAlt}
        className="shadow-card"
      />
    </div>
  ),
  "03": (
    <div className="mx-auto max-w-md">
      <ApplyCard
        title={en.frames.applyTitle}
        role={en.frames.applyRole}
        fields={en.frames.applyFields}
        cta={en.frames.applyCta}
        note={en.frames.applyNote}
        alt={en.frames.applyAlt}
        className="shadow-card"
      />
    </div>
  ),
  "04": (
    <div className="mx-auto max-w-lg">
      <TrackerRows
        rows={en.frames.trackerRows}
        alt={en.frames.trackerAlt}
        className="shadow-card"
      />
    </div>
  ),
}

export function Pipeline() {
  const { pipeline } = en
  return (
    <section id="how-it-works" data-pin="steps" className="band scroll-mt-24">
      <div data-pin-inner className="shell py-band-lg">
        <p data-reveal className="eyebrow">
          {pipeline.eyebrow}
        </p>
        <h2 className="mt-5 max-w-[18ch] text-d2 font-bold text-ink">
          <Split text={pipeline.headline} />
        </h2>

        {/* The rail. Doubles as the scene's progress indicator on desktop. */}
        <div className="mt-12">
          <ul className="flex flex-wrap gap-2 sm:gap-3">
            {pipeline.steps.map((step) => (
              <li key={step.n}>
                <span data-rail className="chip border border-ivory-line bg-white text-text-mute">
                  <span className="opacity-55">{step.n}</span>
                  {step.key}
                </span>
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className="mt-5 h-px w-full bg-ivory-line">
            <div data-progress-line className="h-px w-full bg-indigo" />
          </div>
        </div>

        {/* Stage: cross-fading panels when pinned, snap carousel otherwise. */}
        <div
          data-steps-stage
          className={cn(
            "mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4",
            "lg:block lg:overflow-visible lg:pb-0",
          )}
        >
          {pipeline.steps.map((step) => (
            <article
              key={step.n}
              data-step
              className="w-[85vw] max-w-[38rem] shrink-0 snap-center sm:w-[70vw] lg:w-full lg:max-w-none"
            >
              <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
                <div>
                  <p className="receipt text-indigo">
                    {step.n} · {step.key}
                  </p>
                  <h3 className="mt-4 max-w-[16ch] text-d3 font-semibold text-ink">{step.title}</h3>
                  {"atLaunch" in step && step.atLaunch ? (
                    <p className="mt-4">
                      <span className="chip chip-launch">{pipeline.launchTag}</span>
                    </p>
                  ) : null}
                  <p className="mt-5 max-w-prose text-[1.0625rem] leading-relaxed text-text-mute">
                    {step.body}
                  </p>

                  {/* The detail that turns a claim into something checkable. */}
                  <ul className="mt-6 flex flex-col gap-3">
                    {step.detail.map((d) => (
                      <li key={d} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-indigo"
                        />
                        <span className="text-[0.9375rem] leading-relaxed text-text-mute">{d}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="receipt mt-7 border-t border-ivory-line pt-4">{step.receipt}</p>
                </div>

                <div className="tilt-stage">{FRAMES[step.n]}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
