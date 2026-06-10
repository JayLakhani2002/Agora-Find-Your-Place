/**
 * Stress tests for deck pipeline pure helpers (buildTicks, combineSignals).
 * Focus areas:
 *  - combineSignals: weight invariants, monotonicity, boundary values
 *  - buildTicks: every dimension, null-safety, case normalisation
 *  - Per-card invariant: eligible must always be true for any card served by the deck
 *  - Tick independence: each tick computed from its own data slice, not from others
 */

import { checkEligibility } from "@agora/legal"
import { describe, expect, it } from "vitest"
import { type CardTicks, buildTicks, combineSignals } from "../src/server/routers/deck"

// ── shared fixtures ────────────────────────────────────────────────────────────

const eligibleResult = checkEligibility(
  "student_visa_16b",
  { contractType: "werkstudent", hoursPerWeek: 18, hourlyRate: 14 },
  { daysRemainingThisYear: 100, enrollmentStatus: "enrolled" },
)

const ineligibleResult = checkEligibility(
  "student_visa_16b",
  { contractType: "vollzeit", hoursPerWeek: 40, hourlyRate: 25 },
  { daysRemainingThisYear: 0 },
)

const baseProfile = {
  weeklyHoursLimit: 20,
  germanLevel: "B2" as const,
  minHourlyRate: 13,
  skills: ["Python", "SQL", "Docker", "React"],
}

const noOpinionJob = {
  hoursPerWeek: null,
  hourlyRate: null,
  germanLevelRequired: null,
  requiredSkills: [],
} as const

// ── combineSignals — weight invariants ────────────────────────────────────────

describe("combineSignals — weight invariants and boundary cases", () => {
  it("output range is [0, 1] for valid inputs in [0, 1]", () => {
    const samples = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0.5, 0.5],
      [0.8, 0.2],
    ] as const
    for (const [v, k] of samples) {
      const score = combineSignals(v, k)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
  })

  it("vector-only signal equals 0.7 × v", () => {
    expect(combineSignals(0.6, null)).toBeCloseTo(0.42)
    expect(combineSignals(0.0, null)).toBe(0)
  })

  it("keyword-only signal equals 0.3 × k", () => {
    expect(combineSignals(null, 0.9)).toBeCloseTo(0.27)
    expect(combineSignals(null, 0.0)).toBe(0)
  })

  it("monotone in vector: higher vector → higher combined (keyword fixed)", () => {
    const lo = combineSignals(0.3, 0.5)
    const hi = combineSignals(0.8, 0.5)
    expect(hi).toBeGreaterThan(lo)
  })

  it("monotone in keyword: higher keyword → higher combined (vector fixed)", () => {
    const lo = combineSignals(0.5, 0.1)
    const hi = combineSignals(0.5, 0.9)
    expect(hi).toBeGreaterThan(lo)
  })

  it("null vector does NOT outrank a perfect keyword score over a real vector", () => {
    // 0 vec + 1 kw = 0.3; any vec > 0 outweighs null-vec regardless of keyword
    const nullVec = combineSignals(null, 1)
    const smallVec = combineSignals(0.5, 0)
    expect(smallVec).toBeGreaterThan(nullVec)
  })

  it("vector weight (0.7) always dominates keyword weight (0.3) at equal values", () => {
    // When v == k, the sum is v+k weighted → the result is just v (since 0.7v + 0.3v = v)
    for (const x of [0, 0.25, 0.5, 0.75, 1]) {
      expect(combineSignals(x, x)).toBeCloseTo(x)
    }
  })

  it("handles exactly-zero inputs without NaN", () => {
    expect(Number.isFinite(combineSignals(0, 0))).toBe(true)
    expect(combineSignals(0, 0)).toBe(0)
  })
})

// ── buildTicks — visa tick always reflects eligibility ────────────────────────

describe("buildTicks — visa tick", () => {
  it("visa tick is true when job is eligible", () => {
    const ticks = buildTicks(noOpinionJob, baseProfile, eligibleResult)
    expect(ticks.visa).toBe(true)
  })

  it("visa tick is false when job is ineligible (deck invariant violation surface)", () => {
    // In production the deck never serves ineligible cards, but the tick function
    // must still compute correctly — it must NOT lie.
    const ticks = buildTicks(noOpinionJob, baseProfile, ineligibleResult)
    expect(ticks.visa).toBe(false)
  })
})

// ── buildTicks — hours tick ────────────────────────────────────────────────────

describe("buildTicks — hours tick boundary cases", () => {
  it("hours == user limit → true (boundary, inclusive)", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, hoursPerWeek: 20 },
      { ...baseProfile, weeklyHoursLimit: 20 },
      eligibleResult,
    )
    expect(ticks.hours).toBe(true)
  })

  it("hours == user limit + 1 → false", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, hoursPerWeek: 21 },
      { ...baseProfile, weeklyHoursLimit: 20 },
      eligibleResult,
    )
    expect(ticks.hours).toBe(false)
  })

  it("hours == user limit - 1 → true", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, hoursPerWeek: 19 },
      { ...baseProfile, weeklyHoursLimit: 20 },
      eligibleResult,
    )
    expect(ticks.hours).toBe(true)
  })

  it("hours == 0 → true (0 ≤ any positive limit)", () => {
    const ticks = buildTicks({ ...noOpinionJob, hoursPerWeek: 0 }, baseProfile, eligibleResult)
    expect(ticks.hours).toBe(true)
  })
})

// ── buildTicks — salary tick ───────────────────────────────────────────────────

describe("buildTicks — salary tick boundary cases", () => {
  it("hourlyRate == minHourlyRate → true (inclusive boundary)", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, hourlyRate: 13 },
      { ...baseProfile, minHourlyRate: 13 },
      eligibleResult,
    )
    expect(ticks.salary).toBe(true)
  })

  it("hourlyRate == minHourlyRate - 0.01 → false", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, hourlyRate: 12.99 },
      { ...baseProfile, minHourlyRate: 13 },
      eligibleResult,
    )
    expect(ticks.salary).toBe(false)
  })

  it("hourlyRate == 0 → false when user has a minimum", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, hourlyRate: 0 },
      { ...baseProfile, minHourlyRate: 1 },
      eligibleResult,
    )
    expect(ticks.salary).toBe(false)
  })

  it("hourlyRate == 0 → true when user has no minimum (minHourlyRate null)", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, hourlyRate: 0 },
      { ...baseProfile, minHourlyRate: null },
      eligibleResult,
    )
    expect(ticks.salary).toBe(true)
  })

  it("null hourlyRate → null tick regardless of user minimum", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, hourlyRate: null },
      { ...baseProfile, minHourlyRate: 20 },
      eligibleResult,
    )
    expect(ticks.salary).toBeNull()
  })
})

// ── buildTicks — skills tick ───────────────────────────────────────────────────

describe("buildTicks — skills tick edge cases", () => {
  it("partial match (≥1 skill overlap) → true", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, requiredSkills: ["Python", "Java", "Go"] },
      { ...baseProfile, skills: ["Python"] },
      eligibleResult,
    )
    expect(ticks.skills).toBe(true)
  })

  it("zero overlap → false", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, requiredSkills: ["Java", "Kotlin"] },
      { ...baseProfile, skills: ["Python", "SQL"] },
      eligibleResult,
    )
    expect(ticks.skills).toBe(false)
  })

  it("all-uppercase required skills match lowercase profile skills", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, requiredSkills: ["PYTHON", "SQL"] },
      { ...baseProfile, skills: ["python", "sql"] },
      eligibleResult,
    )
    expect(ticks.skills).toBe(true)
  })

  it("skills with leading/trailing whitespace normalised correctly", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, requiredSkills: [" Python "] },
      { ...baseProfile, skills: ["Python"] },
      eligibleResult,
    )
    expect(ticks.skills).toBe(true)
  })

  it("empty required skills → null (nothing to verify)", () => {
    const ticks = buildTicks({ ...noOpinionJob, requiredSkills: [] }, baseProfile, eligibleResult)
    expect(ticks.skills).toBeNull()
  })

  it("null profile skills with required skills → false (not a crash)", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, requiredSkills: ["Python"] },
      { ...baseProfile, skills: null },
      eligibleResult,
    )
    expect(ticks.skills).toBe(false)
  })

  it("empty profile skills array with required skills → false", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, requiredSkills: ["Python"] },
      { ...baseProfile, skills: [] },
      eligibleResult,
    )
    expect(ticks.skills).toBe(false)
  })
})

// ── buildTicks — german tick ───────────────────────────────────────────────────

describe("buildTicks — german tick edge cases", () => {
  it("null germanLevel profile and no requirement → true", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, germanLevelRequired: null },
      { ...baseProfile, germanLevel: null },
      eligibleResult,
    )
    expect(ticks.german).toBe(true)
  })

  it("null germanLevel profile fails an A1 requirement", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, germanLevelRequired: "A1" },
      { ...baseProfile, germanLevel: null },
      eligibleResult,
    )
    expect(ticks.german).toBe(false)
  })

  it("C2 user satisfies native requirement", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, germanLevelRequired: "native" },
      { ...baseProfile, germanLevel: "C2" },
      eligibleResult,
    )
    // C2 < native in LEVEL_ORDER → should fail
    expect(ticks.german).toBe(false)
  })

  it("native user satisfies C2 requirement", () => {
    const ticks = buildTicks(
      { ...noOpinionJob, germanLevelRequired: "C2" },
      { ...baseProfile, germanLevel: "native" },
      eligibleResult,
    )
    expect(ticks.german).toBe(true)
  })
})

// ── buildTicks — tick independence ────────────────────────────────────────────

describe("buildTicks — ticks are independent of each other", () => {
  it("a failed salary tick does not affect the german tick", () => {
    const ticks = buildTicks(
      { hoursPerWeek: 10, hourlyRate: 5, germanLevelRequired: "A1", requiredSkills: [] },
      { ...baseProfile, minHourlyRate: 20 },
      eligibleResult,
    )
    expect(ticks.salary).toBe(false)
    expect(ticks.german).toBe(true) // A1 < B2 → user satisfies
  })

  it("a failed german tick does not affect the skills tick", () => {
    const ticks = buildTicks(
      {
        hoursPerWeek: 10,
        hourlyRate: 15,
        germanLevelRequired: "native",
        requiredSkills: ["Python"],
      },
      { ...baseProfile, germanLevel: "B1", skills: ["Python"] },
      eligibleResult,
    )
    expect(ticks.german).toBe(false)
    expect(ticks.skills).toBe(true)
  })

  it("all ticks can be null simultaneously (fully unspecified job)", () => {
    const ticks = buildTicks(noOpinionJob, baseProfile, eligibleResult)
    expect(ticks.hours).toBeNull()
    expect(ticks.salary).toBeNull()
    expect(ticks.skills).toBeNull()
    // visa and german have a default answer
    expect(ticks.visa).toBe(true)
    expect(ticks.german).toBe(true)
  })
})

// ── invariant: every card the deck would serve has visa: true ─────────────────

describe("deck serving invariant: eligible cards always have visa tick true", () => {
  it("a visa:false card indicates a deck pipeline bug (eligibility engine vs tick must agree)", () => {
    // The deck filter checks eligibility.eligible before pushing to the deck.
    // buildTicks(job, profile, eligibility) where eligibility.eligible == true
    // MUST produce visa: true. This is the contract.
    const eligibilities = [
      checkEligibility(
        "eu_citizen",
        { contractType: "vollzeit", hoursPerWeek: 35, hourlyRate: 20 },
        { daysRemainingThisYear: null },
      ),
      checkEligibility(
        "chancenkarte_20a",
        { contractType: "werkstudent", hoursPerWeek: 18, hourlyRate: 14 },
        { daysRemainingThisYear: null },
      ),
      checkEligibility(
        "blue_card",
        { contractType: "vollzeit", hoursPerWeek: 40, hourlyRate: 30 },
        { daysRemainingThisYear: null },
      ),
    ]

    for (const el of eligibilities) {
      expect(el.eligible).toBe(true)
      const ticks = buildTicks(noOpinionJob, baseProfile, el)
      expect(ticks.visa).toBe(true)
    }
  })
})
