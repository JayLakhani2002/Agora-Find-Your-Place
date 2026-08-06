import { Cta } from "@/components/sections/Cta"
import { Accordion } from "@/components/ui/Accordion"
import { en } from "@/content/en"

export const metadata = {
  title: "FAQ — Agora",
  description:
    "What works today and what arrives at launch, how the agent handles your applications, work-permit rules, and what happens to your data.",
}

/**
 * The full FAQ as its own page. The home page carries the same questions, but this one
 * exists for three reasons the section cannot serve: it is linkable from the footer and
 * from support replies, it is indexable on its own, and it emits FAQPage structured data.
 *
 * Rendered WITHOUT the reveal animations used on the home page — someone who navigated
 * here came to read, and should not have to scroll to make text appear.
 */
export default function Page() {
  const { faq } = en

  // Structured data. Answers are shipped verbatim so the rich result cannot disagree with
  // the page — a mismatch here reads as a dark pattern to both Google and a reviewer.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.groups.flatMap((g) =>
      g.items.map((i) => ({
        "@type": "Question",
        name: i.q,
        acceptedAnswer: { "@type": "Answer", text: i.a },
      })),
    ),
  }

  return (
    <>
      <section className="band">
        <div className="shell py-band-lg pt-[calc(68px+clamp(3rem,7vw,5rem))]">
          <div className="max-w-2xl">
            <h1 className="text-d2 font-bold text-ink">{faq.headline}</h1>
            <p className="mt-5 max-w-prose text-lead text-text-mute">{faq.sub}</p>
          </div>

          <div className="mt-14 grid gap-x-16 gap-y-14 lg:grid-cols-2">
            {faq.groups.map((group, gi) => (
              <div key={group.title}>
                <h2 className="eyebrow mb-4 text-clay">{group.title}</h2>
                {/* First row of the first group stays open: it is the honesty anchor. */}
                <Accordion items={group.items} defaultOpen={gi === 0 ? 0 : null} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <Cta />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from our own copy
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </>
  )
}
