import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"
import { liveData } from "@/content/live-data"
import Image from "next/image"

/**
 * The proof wall — real employers with live roles in the index, shown with their logos.
 *
 * Every name here comes back from a query against the production database on each build,
 * so the wall can only ever contain companies that genuinely have open roles indexed right
 * now; a company that drops out of the index drops off the wall by itself. Logos are
 * downloaded at build time and served from our own origin, so a visitor's browser never
 * calls a third-party logo service.
 *
 * The micro-line underneath is not decoration and is not optional. Logos imply endorsement
 * in a way plain text does not, so the sentence that says these are companies we *index*
 * — not partners, not anyone's employer-of-record — has to stay directly under them.
 *
 * A company with no verified domain renders as a text mark in the same pill. That mixed
 * state is intended: the alternative is either dropping real companies from the wall or
 * guessing at a domain, and a wrong logo beside a real name is a misrepresentation.
 */
export function ProofWall() {
  const { proof } = en
  const companies = liveData.companies

  return (
    <section className="band border-y border-ivory-line bg-ivory-deep/50 py-band">
      <div className="shell">
        <p className="eyebrow" data-reveal>
          {proof.eyebrow}
        </p>
        <h2 className="mt-5 max-w-[20ch] text-d2 font-bold text-ink">
          <Split text={proof.headline} />
        </h2>
      </div>

      {/* Full-bleed: the marquee runs off both edges rather than sitting inside the shell. */}
      <div
        className="marquee relative mt-12 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]"
        style={{ "--marquee-duration": "72s" } as React.CSSProperties}
      >
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center gap-3 pr-3"
            >
              {companies.map((c) => (
                <li
                  key={c.name}
                  className="flex shrink-0 items-center gap-3 rounded-pill border border-ivory-line bg-white px-5 py-3 shadow-card"
                >
                  {c.logo ? (
                    <Image
                      src={c.logo}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 shrink-0 rounded-[6px] object-contain"
                    />
                  ) : (
                    // Same footprint as a logo, so a text-mark pill doesn't collapse.
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-indigo-wash font-display text-[0.8125rem] font-bold text-indigo"
                    >
                      {c.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="whitespace-nowrap text-[0.9375rem] font-medium text-ink">
                    {c.name}
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <div className="shell">
        <p className="receipt mt-10 max-w-prose" data-reveal>
          {proof.micro}
        </p>
      </div>
    </section>
  )
}
