import { EngineTheater } from "@/components/frames/EngineTheater"
import { en } from "@/content/en"
import { theaterScript } from "@/content/live-data"

/**
 * The receipt band — "That was the launch film. This is what ran last night."
 *
 * This section is the third leg of the film's honesty frame, and its POSITION is the whole
 * point: the hero shows the product at launch, and the very next thing on the page is the real
 * engine printing real rows with real timestamps from `live-data.json`. Trailer, then spec
 * sheet. The other two legs are the "launch film" chip in the hero and the status rail the
 * scrub engine keeps on screen at every scroll position.
 *
 * Do not move this band below the fold, and do not move it above the film. Between them is the
 * only place it does its job, because the argument it settles — how much of that is real? — is
 * the question the film has just raised and nothing else on the page answers as directly.
 *
 * `lead` is the sentence that joins the two. Without it the page reads as a claim followed by a
 * retraction rather than one argument; it is not decorative and it is not a subtitle.
 *
 * The panel itself was previously composited inside the hero's first scene. It is real DOM
 * either way — the only change is that it is now on the page's own canvas rather than over
 * footage, so it needs no scrim and no contrast engineering: clay-soft on ink-card is 6.13:1,
 * on-dark on ink-card is 14.58:1.
 */
export function Receipt() {
  const { theater, hero } = en
  return (
    <section className="band pb-band pt-[clamp(3.5rem,6vw,5.5rem)]">
      <div className="shell">
        {/*
         * An h2, not a styled paragraph. This band used to live inside the hero and had no
         * heading of its own; as a standalone section it needs one, or the page has a landmark
         * a screen-reader user cannot find by outline and cannot name. The lead sentence is
         * genuinely this section's title — it states what the section is for — so it does the
         * job without inventing an extra line of copy nobody asked for.
         */}
        <h2 data-reveal className="max-w-prose text-lead font-normal text-text">
          {theater.lead}
        </h2>
        <p data-reveal className="eyebrow mt-8">
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
  )
}
