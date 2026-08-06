"use client"

import { observeOnce } from "@/components/Motion"
import { cn } from "@/lib/cn"
import { useEffect, useRef, useState } from "react"

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]

/**
 * Odometer counter — each digit is a 0–9 column that rolls to its value over 1.2s when the
 * tile scrolls into view. The real value is always in the DOM as accessible text; the
 * rolling columns are decorative and hidden from assistive tech.
 *
 * `replay` re-runs the roll whenever its value changes, which is how the numbers band
 * keeps ticking over and how it responds to hover. It always lands on the same real
 * figure — the animation is a refresh, never a change. A number visibly counting *up*
 * would imply live growth we are not measuring, which is exactly the kind of invented
 * proof the rest of this site refuses.
 */
export function Odometer({
  value,
  className,
  replay = 0,
}: {
  value: string
  className?: string
  /** Change this to re-run the roll. */
  replay?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [rolled, setRolled] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return observeOnce(el, () => setRolled(true))
  }, [])

  // Re-roll: drop to zero for a frame, then climb back to the same value.
  useEffect(() => {
    if (replay === 0) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setRolled(false)
    const t = setTimeout(() => setRolled(true), 60)
    return () => clearTimeout(t)
  }, [replay])

  return (
    <span ref={ref} className={cn("inline-flex tabular-nums", className)}>
      <span className="sr-only">{value}</span>
      {value.split("").map((char, i) => {
        const digit = DIGITS.indexOf(char)
        if (digit < 0) {
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length numeric string
            <span key={`${char}-${i}`} aria-hidden="true">
              {char}
            </span>
          )
        }
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length numeric string
          <span key={`${char}-${i}`} aria-hidden="true" className="odo-digit">
            <span
              className="odo-col"
              style={{
                transform: `translateY(-${rolled ? digit : 0}em)`,
                transitionDelay: `${i * 90}ms`,
              }}
            >
              {DIGITS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
