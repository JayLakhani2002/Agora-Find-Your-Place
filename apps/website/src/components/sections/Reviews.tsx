import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"

/**
 * Reviews — BUILT, AND SHIPPED DARK.
 *
 * `en.reviews.enabled` is false and stays false until real beta quotes exist with named
 * consent. While it is false this component returns null, so there is no placeholder
 * quote, no skeleton, no `{{TESTIMONIAL_1}}` and no empty section in the rendered HTML —
 * nothing for a crawler or a screenshot to mistake for social proof we do not have.
 *
 * Fabricated testimonials are actionable under UWG §5 in Germany. The layout exists so
 * that switching this on later is a content change rather than a build; do not flip the
 * flag to seed it with anything invented.
 */
export function Reviews() {
  const { reviews } = en
  if (!reviews.enabled || reviews.quotes.length === 0) return null

  return (
    <section className="band py-band-lg">
      <div className="shell">
        <p data-reveal className="eyebrow">
          {reviews.eyebrow}
        </p>
        <h2 className="mt-5 max-w-[18ch] text-d2 font-bold text-ink">
          <Split text={reviews.headline} />
        </h2>

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {reviews.quotes.map((q) => (
            <li key={q.name} data-reveal-card className="card flex flex-col p-6 shadow-card">
              <blockquote className="text-[1.0625rem] leading-relaxed text-text">
                “{q.quote}”
              </blockquote>
              <div className="mt-6 border-t border-ivory-line pt-4">
                <p className="text-[0.9375rem] font-semibold text-ink">{q.name}</p>
                <p className="text-[0.875rem] text-text-mute">{q.role}</p>
                <p className="receipt mt-2">{q.outcome}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
