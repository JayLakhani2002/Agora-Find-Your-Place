"use client"

import { SCORE_BAR_CLASS, SCORE_TEXT_CLASS, scoreBand } from "@/lib/ui"
import { Progress, cn } from "@agora/ui"

export interface EvalScores {
  ats: number | null
  keywords: number | null
  factual: number | null
  format: number | null
  tone: number | null
  language: number | null
  overall: number | null
}

const DIMENSIONS: readonly { key: keyof EvalScores; label: string }[] = [
  { key: "ats", label: "ATS readability" },
  { key: "keywords", label: "Keyword match" },
  { key: "factual", label: "Factual consistency" },
  { key: "format", label: "German CV format" },
  { key: "tone", label: "Tone" },
  { key: "language", label: "Language quality" },
]

/** 6-dimension quality bars, color-coded: ≥8 green, ≥6 amber, else red. */
export function ScoreBars({ scores }: { scores: EvalScores }) {
  const overallBand = scoreBand(scores.overall)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">Overall quality</span>
        <span className={cn("text-2xl font-bold", SCORE_TEXT_CLASS[overallBand])}>
          {scores.overall === null ? "–" : scores.overall.toFixed(1)}
          <span className="text-sm font-normal text-muted">/10</span>
        </span>
      </div>
      {DIMENSIONS.map(({ key, label }) => {
        const score = scores[key]
        const band = scoreBand(score)
        return (
          <div key={key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium">{label}</span>
              <span className={cn("font-semibold", SCORE_TEXT_CLASS[band])}>
                {score === null ? "–" : score.toFixed(1)}
              </span>
            </div>
            <Progress
              value={(score ?? 0) * 10}
              barClassName={SCORE_BAR_CLASS[band]}
              label={label}
            />
          </div>
        )
      })}
    </div>
  )
}
