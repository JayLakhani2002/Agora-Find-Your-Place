import { Odometer } from "@/components/ui/Odometer"
import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"

/**
 * Eligibility — was `Germany`, the headline "moat" section, until 2026-08-06.
 *
 * It still shows the real permit table the product filters on: four residence permits, the
 * hours each allows, the day limits, and which contract types are legal under each. Those
 * values come from `packages/legal/src/constraints.ts` — the table the SQL hard filter reads
 * and the 374 tests cover. No competitor can match this by rewriting copy, so it keeps its
 * space and its substance.
 *
 * What changed is its JOB on the page. Leading with it made the product look like it served
 * only foreign students in Germany. It now reads as a capability for readers whose situation
 * has rules, and a reader with unrestricted work rights should be able to scroll straight
 * past it without feeling the product isn't for them.
 */
export function Eligibility() {
  const { eligibility: copy } = en
  return (
    <section id="eligibility" className="band scroll-mt-24 py-band-lg">
      <div className="shell">
        <div className="max-w-3xl">
          <p data-reveal className="eyebrow">
            {copy.eyebrow}
          </p>
          <h2 className="mt-5 max-w-[15ch] text-d2 font-bold text-ink">
            <Split text={copy.headline} />
          </h2>
          <p data-reveal className="mt-6 max-w-prose text-lead text-text-mute">
            {copy.body}
          </p>
        </div>

        {/* The permit table. Real rules, not decorative chips. */}
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.permits.map((p) => (
            <li key={p.code} data-reveal-card className="card lift flex flex-col p-6 shadow-card">
              <p className="receipt text-clay">{p.code}</p>
              <h3 className="mt-2 text-[1.0625rem] font-semibold text-ink">{p.name}</h3>
              <p className="mt-4 font-display text-[1.375rem] font-bold tracking-[-0.02em] text-ink">
                {p.hours}
              </p>
              <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-text-mute">
                {p.detail}
              </p>
              <p className="receipt mt-5 border-t border-ivory-line pt-4">{p.contracts}</p>
            </li>
          ))}
        </ul>

        {/* The numbers that decide whether a role is worth your evening. */}
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.facts.map((f) => (
            <div key={f.label} data-reveal className="rounded-card bg-clay-wash/70 p-6">
              <dd className="font-display text-[clamp(2rem,3.4vw,2.75rem)] font-bold leading-none tracking-[-0.03em] text-clay-deep">
                <Odometer value={f.value} />
              </dd>
              <dt className="mt-3 text-[0.9375rem] font-medium text-ink">{f.label}</dt>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-text-mute">{f.note}</p>
            </div>
          ))}
        </dl>

        <p data-reveal className="receipt mt-10 max-w-prose">
          {copy.micro}
        </p>
      </div>
    </section>
  )
}
