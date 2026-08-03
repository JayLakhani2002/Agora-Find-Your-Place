"use client"

import { formatHours, formatMatchScore, formatRate } from "@/lib/ui"
import { Badge } from "@agora/ui"
import { Banknote, Clock, MapPin } from "lucide-react"
import { TickRow, type Ticks } from "./TickRow"

export interface DeckCard {
  jobId: string
  title: string
  company: string
  location: string | null
  contractType: string | null
  hourlyRate: number | null
  hoursPerWeek: number | null
  sourceUrl: string
  matchScore: number
  ticks: Ticks
  eligibilityReasons: string[]
}

/** Card face for the swipe deck — all six fields + the eligibility ticks. */
export function JobCard({ card }: { card: DeckCard }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-white/50 bg-white/90 p-5 shadow-glass backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold leading-tight">{card.title}</h2>
          <p className="text-sm text-muted">{card.company}</p>
        </div>
        {formatMatchScore(card.matchScore) && (
          <Badge variant="info" className="shrink-0 text-sm" title="Match score out of 10">
            {formatMatchScore(card.matchScore)}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-1">
          <Banknote size={16} aria-hidden /> {formatRate(card.hourlyRate)}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={16} aria-hidden /> {formatHours(card.hoursPerWeek)}
        </span>
        {card.location && (
          <span className="flex items-center gap-1">
            <MapPin size={16} aria-hidden /> {card.location}
          </span>
        )}
      </div>

      {card.contractType && (
        <Badge variant="neutral" className="w-fit">
          {card.contractType.replaceAll("_", " ")}
        </Badge>
      )}

      {/* Fills the card body on sparse listings, which would otherwise leave a
          dead gap above the ticks. Full list stays behind tap-for-detail. */}
      {card.eligibilityReasons.length > 0 && (
        <ul className="space-y-1 text-sm text-muted">
          {card.eligibilityReasons.slice(0, 3).map((reason) => (
            <li key={reason} className="flex gap-1.5">
              <span aria-hidden className="text-cta">
                ✓
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto">
        <p className="mb-1 text-xs font-medium text-muted">Legal eligibility — verified for you</p>
        <TickRow ticks={card.ticks} />
      </div>
    </div>
  )
}
