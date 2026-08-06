import { Odometer } from "@/components/ui/Odometer"
import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"

/**
 * Germany — the moat, and the section that has to carry real substance.
 *
 * It previously ran one paragraph and a row of chips, which read as a placeholder. It now
 * shows the actual permit table the product filters on: four residence permits, the hours
 * each allows, the day limits, and which contract types are legal under each. Those values
 * are the same ones in `packages/legal/src/constraints.ts` — the table the SQL hard filter
 * reads and the 374 tests cover.
 *
 * This is the one part of the site a competitor cannot match by rewriting copy, so it gets
 * the space.
 */
export function Germany() {
  const { germany } = en
  return (
    <section id="germany" className="band scroll-mt-24 py-band-lg">
      <div className="shell">
        <div className="max-w-3xl">
          <p data-reveal className="eyebrow">
            {germany.eyebrow}
          </p>
          <h2 className="mt-5 max-w-[15ch] text-d2 font-bold text-ink">
            <Split text={germany.headline} />
          </h2>
          <p data-reveal className="mt-6 max-w-prose text-lead text-text-mute">
            {germany.body}
          </p>
        </div>

        {/* The permit table. Real rules, not decorative chips. */}
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {germany.permits.map((p) => (
            <li key={p.code} data-reveal-card className="card lift flex flex-col p-6 shadow-card">
              <p className="receipt text-indigo">{p.code}</p>
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
          {germany.facts.map((f) => (
            <div key={f.label} data-reveal className="rounded-card bg-indigo-wash/70 p-6">
              <dd className="font-display text-[clamp(2rem,3.4vw,2.75rem)] font-bold leading-none tracking-[-0.03em] text-indigo-deep">
                <Odometer value={f.value} />
              </dd>
              <dt className="mt-3 text-[0.9375rem] font-medium text-ink">{f.label}</dt>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-text-mute">{f.note}</p>
            </div>
          ))}
        </dl>

        <p data-reveal className="receipt mt-10 max-w-prose">
          {germany.micro}
        </p>
      </div>
    </section>
  )
}
