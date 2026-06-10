import { checkEligibility } from "@agora/legal"
import { describe, expect, it } from "vitest"
import { buildTicks, combineSignals } from "../src/server/routers/deck"

const eligibleResult = checkEligibility(
  "student_visa_16b",
  { contractType: "werkstudent", hoursPerWeek: 18, hourlyRate: 16 },
  { daysRemainingThisYear: 120 },
)

const baseProfile = {
  weeklyHoursLimit: 20,
  germanLevel: "B1" as const,
  minHourlyRate: 14,
  skills: ["Python", "SQL", "React"],
}

describe("buildTicks — ticks reflect real filter state", () => {
  it("all-green card when every dimension is verified and satisfied", () => {
    const ticks = buildTicks(
      {
        hoursPerWeek: 18,
        hourlyRate: 16,
        germanLevelRequired: "A2",
        requiredSkills: ["python", "Docker"],
      },
      baseProfile,
      eligibleResult,
    )
    expect(ticks).toEqual({ visa: true, hours: true, german: true, salary: true, skills: true })
  })

  it("unstated job fields yield null (unverified), not a fake green tick", () => {
    const ticks = buildTicks(
      { hoursPerWeek: null, hourlyRate: null, germanLevelRequired: null, requiredSkills: [] },
      baseProfile,
      eligibleResult,
    )
    expect(ticks.hours).toBeNull()
    expect(ticks.salary).toBeNull()
    expect(ticks.skills).toBeNull()
    // No stated German requirement is genuinely satisfied, not unknown
    expect(ticks.german).toBe(true)
  })

  it("salary below the user's minimum is a red tick", () => {
    const ticks = buildTicks(
      { hoursPerWeek: 10, hourlyRate: 12.5, germanLevelRequired: null, requiredSkills: [] },
      baseProfile,
      eligibleResult,
    )
    expect(ticks.salary).toBe(false)
  })

  it("salary tick is green when the user has no minimum", () => {
    const ticks = buildTicks(
      { hoursPerWeek: 10, hourlyRate: 12.5, germanLevelRequired: null, requiredSkills: [] },
      { ...baseProfile, minHourlyRate: null },
      eligibleResult,
    )
    expect(ticks.salary).toBe(true)
  })

  it("german tick is red when the requirement exceeds the user's level", () => {
    const ticks = buildTicks(
      { hoursPerWeek: 10, hourlyRate: 16, germanLevelRequired: "C1", requiredSkills: [] },
      baseProfile,
      eligibleResult,
    )
    expect(ticks.german).toBe(false)
  })

  it("skills matching is case-insensitive and requires at least one overlap", () => {
    const overlap = buildTicks(
      { hoursPerWeek: 10, hourlyRate: 16, germanLevelRequired: null, requiredSkills: ["REACT"] },
      baseProfile,
      eligibleResult,
    )
    expect(overlap.skills).toBe(true)

    const disjoint = buildTicks(
      { hoursPerWeek: 10, hourlyRate: 16, germanLevelRequired: null, requiredSkills: ["Rust"] },
      baseProfile,
      eligibleResult,
    )
    expect(disjoint.skills).toBe(false)
  })

  it("handles a profile with no skills recorded", () => {
    const ticks = buildTicks(
      { hoursPerWeek: 10, hourlyRate: 16, germanLevelRequired: null, requiredSkills: ["Python"] },
      { ...baseProfile, skills: null },
      eligibleResult,
    )
    expect(ticks.skills).toBe(false)
  })
})

describe("combineSignals — vector/keyword blend", () => {
  it("weights the semantic signal at 0.7 and lexical at 0.3", () => {
    expect(combineSignals(1, 0)).toBeCloseTo(0.7)
    expect(combineSignals(0, 1)).toBeCloseTo(0.3)
    expect(combineSignals(1, 1)).toBeCloseTo(1)
  })

  it("treats missing signals as zero (graceful degradation)", () => {
    expect(combineSignals(null, null)).toBe(0)
    expect(combineSignals(null, 0.5)).toBeCloseTo(0.15)
    expect(combineSignals(0.8, null)).toBeCloseTo(0.56)
  })

  it("preserves ordering by vector similarity when keyword scores tie", () => {
    const a = combineSignals(0.9, 0.2)
    const b = combineSignals(0.6, 0.2)
    expect(a).toBeGreaterThan(b)
  })
})
