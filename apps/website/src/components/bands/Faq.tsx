"use client"

import { Ari } from "@/components/ari/Ari"
import { en } from "@/content/en"
import { useReveal } from "@/lib/useReveal"
import { useRef, useState } from "react"

export function Faq() {
  const rootRef = useRef<HTMLElement | null>(null)
  const [open, setOpen] = useState<number | null>(0)
  useReveal(rootRef)

  const t = en.faq
  return (
    <section id="faq" ref={rootRef} className="band band-light">
      <div className="band-inner py-24 sm:py-32">
        <div className="mx-auto max-w-2xl">
          <div data-reveal className="flex items-center gap-4">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-laurel">
              <Ari pose="peeking" lookAt="cursor" tone="light" />
            </div>
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h2 className="mt-1 font-display text-3xl sm:text-4xl">{t.headline}</h2>
            </div>
          </div>

          <div className="mt-10">
            {t.items.map((item, i) => {
              const isOpen = open === i
              return (
                <div data-reveal key={item.q} className="border-b border-text/10">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-lg transition-colors hover:text-laurel-text"
                    >
                      {item.q}
                      {/* O-ring marker — fills laurel when open */}
                      <span
                        aria-hidden
                        className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors ${
                          isOpen ? "border-laurel bg-laurel" : "border-text/30 bg-transparent"
                        }`}
                      />
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-label={item.q}
                    data-open={isOpen}
                    className="accordion-panel"
                  >
                    <div>
                      <p className="pb-6 pr-8 text-text-mute">{item.a}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
