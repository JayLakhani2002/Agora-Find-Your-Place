// Agent 6 — 6-dimension document quality eval. ALWAYS Haiku (high-volume, cheap);
// Sonnet is for generation only, Opus is ruled out.
// Spec: Business Planning/Prototype/05-Phase-3-AI-Generation.md §6.

import { invokeClaudeJSON } from "./bedrock/claude"

export type EvalDimension = "ats" | "keywords" | "factual" | "format" | "tone" | "language"

export type DimensionResult = { score: number; issues: string[] }
export type EvalResult = Partial<Record<EvalDimension, DimensionResult>>

export const ALL_DIMENSIONS: readonly EvalDimension[] = [
  "ats",
  "keywords",
  "factual",
  "format",
  "tone",
  "language",
]

/** Cover letters skip the CV-structural dimensions (factual overlap is covered by the CV pass). */
export const COVER_LETTER_DIMENSIONS: readonly EvalDimension[] = [
  "ats",
  "keywords",
  "tone",
  "language",
]

export const EVAL_WEIGHTS: Record<EvalDimension, number> = {
  ats: 0.25, // most important — determines if it gets read at all
  keywords: 0.2,
  factual: 0.2,
  format: 0.15,
  tone: 0.1,
  language: 0.1,
}

const EVAL_PROMPTS: Record<EvalDimension, (doc: string, jobDesc: string) => string> = {
  ats: (
    doc,
    job,
  ) => `Score 0-10: How well will this CV parse through German ATS systems (Softgarden, Personio, d.vinci)?
Check: standard section names, date format MM/YYYY, no tables/columns (ATS can't parse), no photos embedded as images, keywords present.
Document:
${doc.slice(0, 2000)}
Job:
${job.slice(0, 500)}
Return JSON: {"score": 8.5, "issues": ["date format inconsistent on line 3"]}`,

  keywords: (doc, job) => `Score 0-10: How many required job keywords appear in the document?
Required skills from job: ${job.slice(0, 500)}
Document:
${doc.slice(0, 2000)}
Return JSON: {"score": 7.0, "issues": ["missing keywords: FastAPI, Docker"]}`,

  factual: (
    doc,
    _job,
  ) => `Score 0-10: Are all claims in this document factually consistent with no contradictions?
Check: no impossible date overlaps, no implausible skill levels, no invented company names.
Document:
${doc.slice(0, 2000)}
Return JSON: {"score": 10.0, "issues": []}`,

  format: (
    doc,
    _job,
  ) => `Score 0-10: Does this document follow German Tabellarischer Lebenslauf format conventions?
Check: section order (Persönliche Daten → Ausbildung → Berufserfahrung), reverse chronological, date format MM/YYYY, max 1.5 pages length estimate, no "Lebenslauf" title at top (redundant in German CVs).
Document:
${doc.slice(0, 2000)}
Return JSON: {"score": 9.0, "issues": []}`,

  tone: (doc, job) => `Score 0-10: Is the tone appropriate for this company and role?
Job context:
${job.slice(0, 300)}
Document:
${doc.slice(0, 1000)}
Check: formal "Sie" form, no clichés like "hiermit bewerbe ich mich", professional but not stiff for startups.
Return JSON: {"score": 8.5, "issues": []}`,

  language: (
    doc,
    _job,
  ) => `Score 0-10: Quality of German writing — grammar, spelling, natural phrasing.
Note: technical English terms (Python, React) are expected and correct.
Document:
${doc.slice(0, 2000)}
Return JSON: {"score": 9.0, "issues": ["awkward phrasing in paragraph 2"]}`,
}

/** Clamp a model-returned score into the valid 0–10 band; non-finite becomes 0. */
export function clampScore(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.min(10, Math.max(0, n))
}

/**
 * Weighted overall score, renormalized over the dimensions actually present.
 *
 * Renormalization matters: a cover letter is scored on 4 of 6 dimensions
 * (weights summing to 0.65). Without renormalizing, a perfect cover letter
 * would cap at 6.5/10 and ALWAYS trigger auto-regeneration — an infinite-retry
 * bug in the original spec pseudocode. Missing dimensions are excluded from
 * the denominator instead of contributing zero.
 */
export function computeOverallScore(scores: EvalResult): number {
  let weighted = 0
  let totalWeight = 0
  for (const dim of ALL_DIMENSIONS) {
    const entry = scores[dim]
    if (!entry) continue
    weighted += clampScore(entry.score) * EVAL_WEIGHTS[dim]
    totalWeight += EVAL_WEIGHTS[dim]
  }
  if (totalWeight === 0) return 0
  return weighted / totalWeight
}

/**
 * Score a document on the given dimensions — all Haiku calls run in parallel.
 * A single failed dimension does not sink the eval: it is omitted from the
 * result (computeOverallScore renormalizes), and the caller decides whether
 * partial coverage is acceptable.
 */
export async function evaluateDocument(
  document: string,
  jobDescription: string,
  dimensions: readonly EvalDimension[] = ALL_DIMENSIONS,
): Promise<EvalResult> {
  const settled = await Promise.allSettled(
    dimensions.map(async (dim) => {
      const parsed = await invokeClaudeJSON<{ score: number; issues?: string[] }>({
        model: "haiku",
        maxTokens: 256,
        prompt: EVAL_PROMPTS[dim](document, jobDescription),
      })
      return [dim, { score: clampScore(parsed?.score), issues: parsed?.issues ?? [] }] as const
    }),
  )

  const result: EvalResult = {}
  for (const s of settled) {
    if (s.status === "fulfilled") {
      const [dim, entry] = s.value
      result[dim] = entry
    }
  }
  return result
}
