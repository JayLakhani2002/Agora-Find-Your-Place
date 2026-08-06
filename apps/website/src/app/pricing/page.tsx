import { Cta } from "@/components/sections/Cta"
import { en } from "@/content/en"
import Link from "next/link"

export const metadata = {
  title: "Pricing — Agora",
  description:
    "Free through the beta. Credits when we launch — you pay for what you use, credits do not expire, and there is no subscription.",
}

export default function Page() {
  const t = en.pricingPage

  return (
    <>
      <section className="band">
        <div className="shell max-w-4xl py-band-lg pt-[calc(68px+clamp(3rem,7vw,5rem))]">
          <h1 className="text-d2 font-bold text-ink">{t.title}</h1>
          <p className="mt-6 max-w-prose text-lead text-text-mute">{t.intro}</p>
          <p className="receipt mt-6">{t.updated}</p>

          <h2 className="mt-16 text-d3 font-bold text-ink">{t.model.heading}</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {t.model.points.map((p) => (
              <div key={p.title} className="rounded-card border border-ivory-line bg-white p-7">
                <h3 className="text-lg font-semibold text-ink">{p.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-[1.65] text-text-mute">{p.body}</p>
              </div>
            ))}
          </div>

          {/* The unset-price block is given real weight rather than tucked into a footnote.
              Saying so plainly is the trustworthy move in a category where every rival hides
              pricing behind another click. */}
          <div className="mt-12 rounded-card border border-dashed border-ivory-line bg-clay-wash/60 p-8">
            <h2 className="text-d3 font-bold text-clay-deep">{t.tbd.heading}</h2>
            <p className="mt-4 max-w-prose text-[1.0625rem] leading-[1.7] text-text-mute">
              {t.tbd.body}
            </p>
          </div>

          <h2 className="mt-16 text-d3 font-bold text-ink">{t.beta.heading}</h2>
          <p className="mt-4 max-w-prose text-[1.0625rem] leading-[1.7] text-text-mute">
            {t.beta.body}
          </p>

          <p className="mt-12">
            <Link href="/#early-access" className="btn btn-primary">
              {t.cta}
            </Link>
          </p>
        </div>
      </section>
      <Cta />
    </>
  )
}
