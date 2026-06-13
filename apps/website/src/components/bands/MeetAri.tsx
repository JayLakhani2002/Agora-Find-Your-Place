"use client"

import { Ari } from "@/components/ari/Ari"
import { en } from "@/content/en"
import { useReveal } from "@/lib/useReveal"
import { useRef } from "react"

export function MeetAri() {
  const rootRef = useRef<HTMLElement | null>(null)
  useReveal(rootRef)

  const t = en.meetAri
  return (
    <section id="meet-ari" ref={rootRef} className="band band-dark">
      <div className="band-inner py-24 sm:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-[auto_1fr] lg:gap-20">
          {/* Large Ari, idle float + cursor parallax (both handled inside <Ari/>) */}
          <div data-reveal className="mx-auto lg:mx-0">
            <Ari pose="sitting" lookAt="cursor" tone="dark" size={280} />
          </div>

          <div>
            <p data-reveal className="eyebrow eyebrow-on-ink">
              {t.eyebrow}
            </p>
            <h2
              data-reveal
              className="mt-4 max-w-xl text-balance font-display text-4xl text-text-on-ink sm:text-5xl"
            >
              {t.headline}
            </h2>

            <div className="mt-10 space-y-7">
              {t.values.map((v) => (
                <div data-reveal key={v.title} className="flex gap-4">
                  {/* O-motif bullet */}
                  <span
                    aria-hidden
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-laurel-bright"
                  />
                  <div>
                    <h3 className="font-display text-lg text-laurel-bright">{v.title}</h3>
                    <p className="mt-1 text-text-on-ink/70">{v.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <p data-reveal className="mt-10 max-w-xl text-sm italic text-text-on-ink/55">
              {t.memoryNote}
            </p>
          </div>
        </div>

        {/* Chat slot — Stage 2 mounts <AriChat inline /> here. Until then the starter
            chips are inert and the line below is honest about it. */}
        <div data-reveal className="mt-16 rounded-2xl border border-text-on-ink/10 bg-ink-soft p-6 sm:p-8">
          <div className="flex flex-wrap gap-3">
            {t.chat.starters.map((s) => (
              <span key={s} className="chip-on-ink chip cursor-default opacity-70">
                {s}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm text-text-on-ink/60">
            {t.chat.comingSoon}{" "}
            <a href="#waitlist" className="text-laurel-bright underline-offset-4 hover:underline">
              {en.nav.cta} →
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
