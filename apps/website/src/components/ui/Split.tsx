import { cn } from "@/lib/cn"
import { Fragment } from "react"

/**
 * Split-text headline. Words are wrapped HERE, on the server, so GSAP never has to rewrite
 * the DOM on mount — no reflow, no CLS, and the text stays plain text for screen readers
 * and crawlers. Motion.tsx animates `.split-inner` from 110% → 0.
 *
 * The inter-word space MUST sit between the `.split-word` spans, not inside them. Inside,
 * it gets eaten twice over: `.split-word` is `overflow: hidden`, and a trailing space in an
 * inline-block collapses anyway — which renders the headline as one unbroken word.
 */
export function Split({
  text,
  className,
  accent,
  accentClass = "text-clay",
}: {
  text: string
  className?: string
  /** Words from this index on are rendered in the accent colour. */
  accent?: number
  /** Override the accent colour — clay is unreadable over the dark hero photograph. */
  accentClass?: string
}) {
  const words = text.split(" ")
  return (
    <span data-split className={className}>
      {words.map((word, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static copy, order is the identity
        <Fragment key={`${word}-${i}`}>
          <span className={cn("split-word", accent !== undefined && i >= accent && accentClass)}>
            <span className="split-inner">{word}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  )
}
