import { Accordion } from "@/components/ui/Accordion"
import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"

/**
 * FAQ — the full grouped list, on the home page.
 *
 * It used to be four questions with a "read more" link. A short FAQ reads as having
 * something to hide, and every competitor in this category runs a long one; a sceptical
 * reader who came here for the awkward questions should find them, not a teaser.
 *
 * `faq.groups[0].items[0]` is the honesty anchor — first group, first row, open by
 * default. Everything present-tense elsewhere on the page is licensed by that answer
 * being here, unhedged and impossible to miss.
 */
export function FaqTeaser() {
  const { faq } = en
  return (
    <section id="faq" className="band scroll-mt-24 bg-white py-band-lg">
      <div className="shell">
        <div className="max-w-2xl">
          <p data-reveal className="eyebrow">
            {faq.eyebrow}
          </p>
          <h2 className="mt-5 max-w-[14ch] text-d2 font-bold text-ink">
            <Split text={faq.headline} />
          </h2>
          <p data-reveal className="mt-5 text-lead text-text-mute">
            {faq.sub}
          </p>
        </div>

        <div className="mt-14 grid gap-x-16 gap-y-14 lg:grid-cols-2">
          {faq.groups.map((group, gi) => (
            <div key={group.title} data-reveal>
              <h3 className="eyebrow mb-4 text-indigo">{group.title}</h3>
              {/* Only the very first row starts open — the honesty anchor. */}
              <Accordion items={group.items} defaultOpen={gi === 0 ? 0 : null} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
