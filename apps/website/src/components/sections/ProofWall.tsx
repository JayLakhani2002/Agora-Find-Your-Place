import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"
import {
  berlinDate,
  berlinTime,
  city,
  liveData,
  meta,
  sourceLabel,
  terms,
} from "@/content/live-data"
import { cn } from "@/lib/cn"
import Image from "next/image"
import type { CSSProperties } from "react"

/**
 * The proof wall, set as a broadsheet classifieds page.
 *
 * The classified ad is the ancestral form of the job posting, so the proof that we hold real
 * listings is set the way listings have always been set: ivory paper, hairline column rules,
 * entries at mixed sizes, small inline logos the way a print advertiser's mark sits inside its
 * own ad. The previous version was a trophy row of big logos, which is precisely the shape that
 * reads as "our partners" — the thing we must never imply.
 *
 * Every rendered string is a database value. Titles, employers, cities, contract types, German
 * requirements, hours, rates, source names, role counts and timestamps all come from
 * live-data.json, regenerated from the production `jobs` table on each build. Nothing here is
 * typed by hand, and there is no editorial pick: the feed's own order is used as printed (it is
 * already balanced across sources), the lead is simply its first row, and the boxed notices are
 * the employer list in its own descending order. A company that drops out of the index drops off
 * this page by itself.
 *
 * The terracotta overprint is the section's graphic device and its honesty device at once. It
 * stamps one verb — indexed — plus the real minute we indexed that row. It never sits over body
 * text, so no reader loses contrast to a decoration.
 *
 * The imprint at the foot is legally load-bearing (UWG §5). It is set at body size under a
 * double rule, like a newspaper's imprint: making it a formal typographic fixture makes it more
 * prominent than a grey micro-line ever was, which is the point.
 */

const { proof } = en

/** Employer → logo path. Null whenever we have no verified domain; the mark falls back to type. */
const logos = new Map(liveData.companies.map((c) => [c.name, c.logo]))

/**
 * The overprint. `order` drives two things: the alternating tilt, so a column of stamps reads
 * hand-pressed rather than tiled, and the scroll stagger in globals.css.
 */
function Stamp({ iso, order, className }: { iso: string; order: number; className: string }) {
  return (
    <span
      className={cn(
        // No nowrap: in the narrow notice boxes at 390px the stamp is wider than its column,
        // and a stamp that wraps to two lines is still a stamp — a page that scrolls
        // sideways is not a page.
        "stamp inline-block max-w-full border border-clay/45 px-2 py-1",
        "font-data uppercase leading-none tracking-[0.12em] text-clay-deep",
        // Multiply is what makes it read as ink pressed into paper rather than a UI badge.
        "mix-blend-multiply",
        className,
      )}
      style={
        {
          "--stamp-tilt": order % 2 === 0 ? "-2.1deg" : "1.7deg",
          "--i": Math.min(order, 6),
        } as CSSProperties
      }
    >
      {proof.stamp} · {berlinDate(iso)} {berlinTime(iso)}
    </span>
  )
}

/** A column rubric — the small standing head a classifieds page puts above each block. */
function Rubric({ label }: { label: string }) {
  return (
    <h3 className="mt-14 flex items-center gap-4 font-data text-[0.6875rem] uppercase tracking-[0.2em] text-text-mute">
      {label}
      <span aria-hidden="true" className="h-px flex-1 bg-ivory-line" />
    </h3>
  )
}

/**
 * The employer's mark, small and inline — a print advertiser's logo, not a trophy.
 *
 * Inline-block on purpose: in a flex row the company name becomes one unbreakable flex item
 * and drops to its own line the moment it doesn't fit, which stranded the mark on a line by
 * itself at 390px. Inline, the name simply wraps around it the way type sets around a cut.
 */
function Mark({ name, logo, size }: { name: string; logo: string | null; size: number }) {
  return logo ? (
    <Image
      src={logo}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="mr-2 inline-block shrink-0 rounded-[3px] object-contain align-[-0.15em]"
    />
  ) : (
    // Same footprint as a logo, so a text-mark entry doesn't sit shorter than its neighbours.
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="mr-2 inline-flex shrink-0 items-center justify-center rounded-[3px] bg-clay-wash align-[-0.15em] font-display text-[0.6875rem] font-bold text-clay-deep"
    >
      {name.slice(0, 1)}
    </span>
  )
}

export function ProofWall() {
  const [lead, ...rest] = liveData.feed
  // The snapshot can be empty in a fresh checkout; a classifieds page with no listings is
  // nothing, not an empty frame.
  if (!lead) return null

  const seconds = rest.slice(0, 2)
  const tail = rest.slice(2)

  return (
    // `overflow-x-clip`, not hidden: a tilted stamp at the right edge of a narrow notice box
    // hangs a few pixels past the shell, and clipping ink is what a print edge does anyway.
    // Clip creates no scroll container, so nothing here can ever scroll the page sideways.
    <section className="band overflow-x-clip border-y border-ivory-line bg-ivory-deep/55 py-band">
      <div className="shell">
        <p className="eyebrow" data-reveal>
          {proof.eyebrow}
        </p>
        <h2 className="mt-5 max-w-[22ch] text-d2 font-bold text-ink">
          <Split text={proof.headline} />
        </h2>

        {/* Dateline. A broadsheet dates its edition; this one can only date itself from the scrape. */}
        <p className="receipt mt-8 border-y-[3px] border-double border-ink/20 py-3" data-reveal>
          {proof.dateline}
        </p>

        <Rubric label={proof.columnLead} />

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* The lead. One entry gets the page's largest type, the way a front page works. */}
          <article data-reveal className="border-b border-ivory-line pb-8 lg:border-b-0 lg:pb-0">
            <h4 className="max-w-[18ch] font-display text-[clamp(1.5rem,3.1vw,2.375rem)] font-bold uppercase leading-[1.08] tracking-[0.005em] text-ink">
              {lead.title}
            </h4>
            <p className="mt-4 font-display text-lead font-semibold text-ink">
              <Mark name={lead.company} logo={logos.get(lead.company) ?? null} size={22} />
              {lead.company} — {city(lead.location)}
            </p>
            <p className="receipt mt-3">
              {[...meta(lead).slice(1), ...terms(lead), sourceLabel(lead.source)].join(" · ")}
            </p>
            <p className="mt-5">
              <Stamp iso={lead.scrapedAt} order={0} className="text-[0.8125rem]" />
            </p>
          </article>

          {/* Two more at middle weight, ruled off the lead — the second column of a front page. */}
          <ul className="lg:border-l lg:border-ivory-line lg:pl-10">
            {seconds.map((l, i) => (
              <li
                key={`${l.company}-${l.title}`}
                data-reveal
                className="border-b border-ivory-line pb-6 [&+li]:pt-6"
              >
                <h4 className="font-display text-[1.0625rem] font-semibold leading-snug text-ink">
                  {l.title}
                </h4>
                <p className="mt-2 text-[0.9375rem] text-text-mute">
                  <Mark name={l.company} logo={logos.get(l.company) ?? null} size={16} />
                  {l.company}
                </p>
                <p className="receipt mt-2">
                  {[...meta(l), ...terms(l), sourceLabel(l.source)].join(" · ")}
                </p>
                <p className="mt-3">
                  <Stamp iso={l.scrapedAt} order={i + 1} className="text-[0.6875rem]" />
                </p>
              </li>
            ))}
          </ul>
        </div>

        <Rubric label={proof.columnNotices} />

        {/*
         * Display notices — the boxed ads a multi-role advertiser buys. `gap-px` over a
         * hairline background paints continuous column and row rules for free, which is
         * exactly the grid a classifieds page is ruled on.
         */}
        <ul className="mt-6 grid grid-cols-2 gap-px border border-ivory-line bg-ivory-line lg:grid-cols-4">
          {liveData.companies.map((c, i) => (
            <li
              key={c.name}
              data-reveal-card
              className={cn(
                "flex flex-col justify-between gap-4 bg-ivory p-4 sm:p-5",
                // The largest advertiser buys the double-width box.
                i === 0 && "col-span-2",
              )}
            >
              <p>
                <Mark name={c.name} logo={c.logo} size={i === 0 ? 24 : 18} />
                <span className="font-display text-[0.9375rem] font-semibold leading-tight text-ink">
                  {c.name}
                </span>
              </p>
              <p className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-display font-bold leading-none text-clay-deep",
                    i === 0 ? "text-[2.5rem]" : "text-[1.625rem]",
                  )}
                >
                  {c.roles}
                </span>
                <span className="font-data text-[0.75rem] uppercase tracking-[0.14em] text-text-mute">
                  {proof.rolesLabel}
                </span>
              </p>
              <p>
                {/* Counts are read when the snapshot is built, so that is the minute stamped. */}
                <Stamp iso={liveData.generatedAt} order={i} className="text-[0.625rem]" />
              </p>
            </li>
          ))}
        </ul>

        <Rubric label={proof.columnTail} />

        {/* The long tail, set dense in real columns with a hairline rule between them. */}
        <ul className="mt-6 gap-10 [column-rule:1px_solid_var(--hairline)] sm:columns-2 xl:columns-3">
          {tail.map((l, i) => (
            <li
              key={`${l.company}-${l.title}`}
              data-reveal
              className="break-inside-avoid border-b border-ivory-line py-4"
            >
              <p className="font-display text-[0.9375rem] font-semibold leading-snug text-ink">
                {l.title}
              </p>
              <p className="mt-1.5 text-[0.875rem] text-text-mute">
                <Mark name={l.company} logo={logos.get(l.company) ?? null} size={14} />
                {l.company}
              </p>
              <p className="receipt mt-1.5 text-[0.75rem]">
                {[...meta(l), sourceLabel(l.source)].join(" · ")}
              </p>
              <p className="mt-2.5">
                <Stamp iso={l.scrapedAt} order={i} className="text-[0.625rem]" />
              </p>
            </li>
          ))}
        </ul>

        {/* The imprint. Body size, under a double rule — a fixture of the page, not fine print. */}
        <div className="mt-12 border-t-[3px] border-double border-ink/25 pt-6">
          {/* Deliberately NOT `data-reveal`: the one line that must never depend on a
              scroll observer to become visible. */}
          <p className="max-w-prose text-[1.0625rem] leading-relaxed text-text">{proof.imprint}</p>
          <p className="receipt mt-3 max-w-prose">{proof.imprintSource}</p>
        </div>
      </div>
    </section>
  )
}
