import { Cta } from "@/components/sections/Cta"
import type { LegalSection } from "@/content/legal"

/**
 * Renders the Impressum and the privacy notice.
 *
 * Deliberately plain: no reveal animations, no motion, no decorative colour. These pages are
 * read under stress — by someone deciding whether to trust us with their CV, or by a reviewer
 * checking whether we are legitimate. Anything that delays the text is working against them.
 *
 * The prose column is capped and the type is set slightly larger than the marketing pages
 * for the same reason.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string
  updated: string
  intro: string
  sections: readonly LegalSection[]
}) {
  return (
    <>
      <section className="band">
        <div className="shell max-w-3xl py-band-lg pt-[calc(68px+clamp(3rem,7vw,5rem))]">
          <h1 className="text-d2 font-bold text-ink">{title}</h1>
          <p className="receipt mt-4">Last updated {updated}</p>
          <p className="mt-6 max-w-prose text-lead text-text-mute">{intro}</p>

          {/* Jump list — these pages are long and people arrive looking for one thing. */}
          <nav aria-label="On this page" className="mt-10 border-t border-ivory-line pt-6">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-[0.9375rem] text-clay underline-offset-4 hover:underline"
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-14 space-y-14">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="text-d3 font-bold text-ink">{s.heading}</h2>
                <div className="mt-5 space-y-5">
                  {s.blocks.map((b, i) => {
                    if (b.kind === "p") {
                      return (
                        <p
                          // biome-ignore lint/suspicious/noArrayIndexKey: static content, never reordered
                          key={i}
                          // whitespace-pre-line so the address block keeps its line breaks
                          className="max-w-prose whitespace-pre-line text-[1.0625rem] leading-[1.7] text-text-mute"
                        >
                          {b.text}
                        </p>
                      )
                    }
                    if (b.kind === "list") {
                      return (
                        // biome-ignore lint/suspicious/noArrayIndexKey: static content, never reordered
                        <ul key={i} className="max-w-prose space-y-3">
                          {b.items.map((item) => (
                            <li
                              key={item}
                              className="relative pl-6 text-[1.0625rem] leading-[1.7] text-text-mute"
                            >
                              <span
                                aria-hidden="true"
                                className="absolute left-0 top-[0.72em] h-1.5 w-1.5 rounded-full bg-clay"
                              />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )
                    }
                    return (
                      // Tables carry the processor list and the lawful-basis grid, which are the
                      // two things a reviewer looks for. They must stay readable on a phone, so
                      // the table scrolls inside its own container rather than the page.
                      // biome-ignore lint/suspicious/noArrayIndexKey: static content, never reordered
                      <div key={i} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                        <table className="w-full min-w-[34rem] border-collapse text-left">
                          <thead>
                            <tr className="border-b border-ivory-line">
                              {b.head.map((h) => (
                                <th
                                  key={h}
                                  scope="col"
                                  className="py-3 pr-6 align-bottom font-data text-[0.6875rem] uppercase tracking-[0.14em] text-text-soft"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {b.rows.map((row) => (
                              <tr key={row[0]} className="border-b border-ivory-line/70">
                                {row.map((cell, ci) => (
                                  <td
                                    key={cell}
                                    className={`py-4 pr-6 align-top text-[0.9375rem] leading-[1.6] ${
                                      ci === 0 ? "font-medium text-text" : "text-text-mute"
                                    }`}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
      <Cta />
    </>
  )
}
