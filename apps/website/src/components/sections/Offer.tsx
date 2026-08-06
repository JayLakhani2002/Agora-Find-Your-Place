import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"
import { cn } from "@/lib/cn"
import Link from "next/link"

/**
 * Early access and the pricing preview, on one shell band.
 *
 * The tier cards deliberately carry no € figure. Credit price, pack sizes and the free
 * allowance are all genuinely undecided, so every price slot reads "Locks at launch" —
 * which is both true and the honest version of the urgency other sites manufacture. The
 * cards show what scales (how hard you are hunting), not invented feature gates.
 *
 * No free-quota number appears anywhere here. Jay chose that: a figure on the page is a
 * promise, and the unit economics that would set it do not exist yet.
 */
export function Offer() {
  const { offer, pricing } = en
  return (
    <section id="early-access" className="band scroll-mt-24 py-band-lg">
      <div className="shell">
        <div className="max-w-3xl">
          <p data-reveal className="eyebrow">
            {offer.eyebrow}
          </p>
          <h2 className="mt-5 text-d2 font-bold text-ink">
            <Split text={offer.headline} />
          </h2>
          <p data-reveal className="mt-6 max-w-prose text-lead text-text-mute">
            {offer.body}
          </p>
        </div>

        {/* Pricing preview — the model explained, the numbers withheld until they're real. */}
        <div className="mt-16 rounded-card border border-ivory-line bg-ivory-deep/60 p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
            <div>
              <p data-reveal className="eyebrow">
                {pricing.eyebrow}
              </p>
              <h3 data-reveal className="mt-4 max-w-[14ch] text-d3 font-semibold text-ink">
                {pricing.headline}
              </h3>
              <p
                data-reveal
                className="mt-5 max-w-prose text-[1.0625rem] leading-relaxed text-text-mute"
              >
                {pricing.sub}
              </p>
              <p data-reveal className="receipt mt-7">
                {pricing.note}
              </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-3">
              {pricing.tiers.map((tier) => (
                <li
                  key={tier.name}
                  data-reveal-card
                  className={cn(
                    "flex flex-col justify-between rounded-frame border bg-white p-5",
                    "featured" in tier && tier.featured
                      ? "border-indigo/40 shadow-lift"
                      : "border-ivory-line",
                  )}
                >
                  <div>
                    <p className="text-[1.0625rem] font-semibold text-ink">{tier.name}</p>
                    <p className="mt-1.5 text-[0.875rem] text-text-mute">{tier.for}</p>
                  </div>
                  <p className="receipt mt-8 border-t border-ivory-line pt-4">
                    {pricing.priceSlot}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
            <a href={en.nav.ctaHref} data-magnetic className="btn btn-primary">
              {offer.cta}
            </a>
            <Link
              href={pricing.link.href}
              className="text-[0.9375rem] font-medium text-indigo underline-offset-4 hover:underline"
            >
              {pricing.link.label} →
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
