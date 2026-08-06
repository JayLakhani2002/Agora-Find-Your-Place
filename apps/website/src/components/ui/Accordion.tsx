"use client"

import { Icon } from "@/components/ui/Icon"
import { useId, useState } from "react"

/**
 * Hand-rolled accordion — no library for one component (BUILD-GUIDE §6).
 * Height animates via grid-template-rows 0fr→1fr, so nothing has to be measured, and the
 * global reduced-motion rule collapses the transition automatically.
 */
export function Accordion({
  items,
  defaultOpen = 0,
}: {
  items: readonly { q: string; a: string }[]
  /**
   * Which row starts expanded, or `null` for all closed. The FAQ renders several
   * accordions side by side and only the honesty anchor should be open on load —
   * four simultaneously-open panels just looks like nothing collapses.
   */
  defaultOpen?: number | null
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen)
  const baseId = useId()

  return (
    <div className="divide-y divide-ivory-line border-y border-ivory-line">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${baseId}-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full cursor-pointer items-center justify-between gap-6 py-6 text-left"
              >
                <span className="text-lg font-semibold tracking-[-0.015em] text-text transition-colors duration-fast group-hover:text-clay">
                  {item.q}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ivory-line text-text-mute transition-all duration-base ease-out group-hover:border-clay/40 group-hover:text-clay ${
                    isOpen ? "rotate-90 border-clay/40 text-clay" : ""
                  }`}
                >
                  <Icon name="arrowRight" className="h-4 w-4" />
                </span>
              </button>
            </h3>
            <div id={`${baseId}-${i}`} className="acc-panel" data-open={isOpen}>
              <div>
                <p className="max-w-prose pb-7 text-[0.9375rem] leading-relaxed text-text-mute">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
