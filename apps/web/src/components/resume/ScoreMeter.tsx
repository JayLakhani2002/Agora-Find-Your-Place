"use client"

import { scoreResume } from "@/lib/resume"
import { SCORE_BAR_CLASS, SCORE_TEXT_CLASS, scoreBand } from "@/lib/ui"
import type { ResumeContent } from "@agora/db/schema"
import { Progress, cn } from "@agora/ui"

interface ScoreMeterProps {
  content: ResumeContent
  className?: string | undefined
}

/**
 * Completeness score + the checks that are still failing. `scoreBand` works on
 * the 0–10 eval scale used elsewhere, so the 0–100 rubric score is divided by
 * ten rather than given its own colour table.
 */
export function ScoreMeter({ content, className }: ScoreMeterProps) {
  const { score, missing } = scoreResume(content)
  const band = scoreBand(score / 10)

  return (
    <section
      aria-labelledby="resume-score-heading"
      className={cn(
        "rounded-2xl border border-white/50 bg-white/80 p-4 shadow-glass backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="resume-score-heading" className="text-sm font-bold text-ink">
          Resume score
        </h2>
        <span className={cn("text-2xl font-bold tabular-nums", SCORE_TEXT_CLASS[band])}>
          {score}%
        </span>
      </div>

      <Progress
        value={score}
        barClassName={SCORE_BAR_CLASS[band]}
        className="mt-2"
        label="Resume score"
      />

      {missing.length === 0 ? (
        <p className="mt-3 text-xs font-semibold text-green-700">
          Every check passed — this one is ready to send.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs font-semibold text-muted">
            {missing.length} thing{missing.length === 1 ? "" : "s"} left:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted">
            {missing.map((m) => (
              <li key={m.id}>{m.label}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
