"use client"

import { cn } from "@agora/ui"
import { Check, Minus, X } from "lucide-react"

/** Mirrors CardTicks from the deck router (true / false / null = not stated). */
export interface Ticks {
  /**
   * `null` when the posting declared no visa restriction at all. That is NOT the same as
   * "this visa is permitted" — it means we could not verify, and it must never render as
   * a green tick to a §16b student.
   */
  visa: boolean | null
  hours: boolean | null
  german: boolean
  salary: boolean | null
  skills: boolean | null
}

const LABELS: Record<keyof Ticks, string> = {
  visa: "Visa",
  hours: "Hours",
  german: "German",
  salary: "Pay",
  skills: "Skills",
}

const ORDER: readonly (keyof Ticks)[] = ["visa", "hours", "german", "salary", "skills"]

/**
 * The legal-eligibility ticks — the core trust signal on every card.
 * Never decorative: values come straight from the server's eligibility engine.
 */
export function TickRow({ ticks, className }: { ticks: Ticks; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {ORDER.map((key) => {
        const value = ticks[key]
        return (
          <li
            key={key}
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
              value === true && "bg-green-100 text-green-800",
              value === false && "bg-red-100 text-red-800",
              value === null && "bg-slate-100 text-slate-500",
            )}
            title={
              value === null
                ? `${LABELS[key]}: not stated in the job ad`
                : `${LABELS[key]}: ${value ? "checked" : "conflict"}`
            }
          >
            {value === true && <Check size={12} aria-hidden />}
            {value === false && <X size={12} aria-hidden />}
            {value === null && <Minus size={12} aria-hidden />}
            {LABELS[key]}
            <span className="sr-only">
              {value === null ? "not stated" : value ? "verified" : "conflict"}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
