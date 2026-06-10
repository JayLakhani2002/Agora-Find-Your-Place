import { describe, expect, it } from "vitest"
import {
  ALL_DIMENSIONS,
  COVER_LETTER_DIMENSIONS,
  EVAL_WEIGHTS,
  type EvalResult,
  clampScore,
  computeOverallScore,
} from "../src/eval"

const full = (score: number): EvalResult =>
  Object.fromEntries(ALL_DIMENSIONS.map((d) => [d, { score, issues: [] }])) as EvalResult

describe("EVAL_WEIGHTS — spec invariants", () => {
  it("weights sum to exactly 1.0 over all six dimensions", () => {
    const sum = Object.values(EVAL_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1.0, 10)
  })

  it("ats carries the highest weight (0.25 — determines if the CV gets read)", () => {
    expect(EVAL_WEIGHTS.ats).toBe(0.25)
    for (const [dim, w] of Object.entries(EVAL_WEIGHTS)) {
      if (dim !== "ats") expect(w).toBeLessThan(EVAL_WEIGHTS.ats)
    }
  })
})

describe("computeOverallScore — weighted sum over full dimension set", () => {
  it("uniform 10s → exactly 10", () => {
    expect(computeOverallScore(full(10))).toBeCloseTo(10)
  })

  it("uniform 0s → exactly 0", () => {
    expect(computeOverallScore(full(0))).toBe(0)
  })

  it("uniform score x → exactly x (weights sum to 1)", () => {
    for (const x of [2.5, 5, 7.3, 8.0]) {
      expect(computeOverallScore(full(x))).toBeCloseTo(x)
    }
  })

  it("applies the documented weights (hand-computed case)", () => {
    const scores: EvalResult = {
      ats: { score: 10, issues: [] },
      keywords: { score: 8, issues: [] },
      factual: { score: 6, issues: [] },
      format: { score: 4, issues: [] },
      tone: { score: 2, issues: [] },
      language: { score: 0, issues: [] },
    }
    // 10*.25 + 8*.20 + 6*.20 + 4*.15 + 2*.10 + 0*.10 = 2.5+1.6+1.2+0.6+0.2 = 6.1
    expect(computeOverallScore(scores)).toBeCloseTo(6.1)
  })
})

describe("computeOverallScore — renormalization over partial dimension sets", () => {
  it("a PERFECT cover letter (4 dims) scores 10, not 6.5 — the infinite-regen bug", () => {
    const scores = Object.fromEntries(
      COVER_LETTER_DIMENSIONS.map((d) => [d, { score: 10, issues: [] }]),
    ) as EvalResult
    expect(computeOverallScore(scores)).toBeCloseTo(10)
  })

  it("cover-letter subset with uniform score x → exactly x", () => {
    const scores = Object.fromEntries(
      COVER_LETTER_DIMENSIONS.map((d) => [d, { score: 8.2, issues: [] }]),
    ) as EvalResult
    expect(computeOverallScore(scores)).toBeCloseTo(8.2)
  })

  it("relative weights preserved within the subset (ats counts more than tone)", () => {
    const high_ats: EvalResult = {
      ats: { score: 10, issues: [] },
      keywords: { score: 5, issues: [] },
      tone: { score: 5, issues: [] },
      language: { score: 5, issues: [] },
    }
    const high_tone: EvalResult = {
      ats: { score: 5, issues: [] },
      keywords: { score: 5, issues: [] },
      tone: { score: 10, issues: [] },
      language: { score: 5, issues: [] },
    }
    expect(computeOverallScore(high_ats)).toBeGreaterThan(computeOverallScore(high_tone))
  })

  it("single-dimension result equals that dimension's score", () => {
    expect(computeOverallScore({ ats: { score: 7.5, issues: [] } })).toBeCloseTo(7.5)
  })

  it("empty result → 0 (no division by zero)", () => {
    expect(computeOverallScore({})).toBe(0)
  })
})

describe("clampScore — model output sanitation", () => {
  it("passes through valid scores", () => {
    expect(clampScore(8.5)).toBe(8.5)
    expect(clampScore(0)).toBe(0)
    expect(clampScore(10)).toBe(10)
  })

  it("clamps out-of-band scores into 0–10", () => {
    expect(clampScore(11)).toBe(10)
    expect(clampScore(-3)).toBe(0)
    expect(clampScore(100)).toBe(10)
  })

  it("non-numeric garbage becomes 0, never NaN", () => {
    expect(clampScore("high")).toBe(0)
    expect(clampScore(undefined)).toBe(0)
    expect(clampScore(null)).toBe(0)
    expect(clampScore(Number.NaN)).toBe(0)
  })

  it("numeric strings are accepted (models sometimes quote numbers)", () => {
    expect(clampScore("8.5")).toBe(8.5)
  })

  it("computeOverallScore never returns NaN even with garbage scores", () => {
    const scores = {
      ats: { score: Number.NaN, issues: [] },
      tone: { score: 5, issues: [] },
    } as EvalResult
    const result = computeOverallScore(scores)
    expect(Number.isFinite(result)).toBe(true)
  })
})
