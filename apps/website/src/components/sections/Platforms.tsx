import { Icon } from "@/components/ui/Icon"
import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"
import { cn } from "@/lib/cn"

/**
 * Platforms — light section, and the one card that is dark is the one that exists today.
 *
 * That is the whole idea: the web app is real, so it gets the ink surface and the visual
 * weight; the four that arrive later are quiet white cards carrying a mono `at launch`
 * tag. The hierarchy does honesty work that copy alone would have to argue for.
 *
 * Those tags are load-bearing — they are what makes it legitimate to describe WhatsApp,
 * iMessage, Claude and the extension in the present tense at all. They are never styled
 * down, never moved below the fold of the card, and the launch check greps the rendered
 * HTML for them. There are no "open app" links, because there is nothing to open yet.
 */
export function Platforms() {
  const { platforms } = en
  return (
    <section id="platforms" className="band scroll-mt-24 bg-ivory-deep/60 py-band-lg">
      <div className="shell">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p data-reveal className="eyebrow">
              {platforms.eyebrow}
            </p>
            <h2 className="mt-5 max-w-[16ch] text-d2 font-bold text-ink">
              <Split text={platforms.headline} />
            </h2>
          </div>
          <a href={en.nav.ctaHref} data-magnetic className="btn btn-primary shrink-0 self-start">
            {platforms.cta}
          </a>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.cards.map((card, i) => {
            const live = i === 0
            return (
              <li
                key={card.id}
                data-reveal-card
                className={cn(
                  "lift flex flex-col p-6",
                  live
                    ? "card-ink on-ink border border-ink-line shadow-float sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:justify-between"
                    : "card shadow-card",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    live ? "bg-indigo-soft/15 text-indigo-soft" : "bg-indigo-wash text-indigo",
                  )}
                >
                  <Icon name={card.icon} />
                </span>
                <div className={cn(live && "lg:mt-auto lg:pt-12")}>
                  <h3
                    className={cn(
                      "mt-5 text-[1.0625rem] font-semibold",
                      live ? "text-text-on-dark" : "text-ink",
                    )}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={cn(
                      "mt-2 text-[0.9375rem] leading-relaxed",
                      live ? "text-text-on-dark-mute" : "text-text-mute",
                    )}
                  >
                    {card.body}
                  </p>
                  <p className="mt-5">
                    <span className={cn("chip", live ? "chip-on-dark" : "chip-launch")}>
                      {card.tag}
                    </span>
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
