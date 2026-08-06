import { checkEligibility } from "@agora/legal"
import { describe, expect, it } from "vitest"
import { buildTicks, combineSignals, visaVerified } from "../src/server/routers/deck"

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
  visaType: "student_visa_16b" as const,
}

describe("buildTicks — ticks reflect real filter state", () => {
  it("all-green card when every dimension is verified and satisfied", () => {
    const ticks = buildTicks(
      {
        hoursPerWeek: 18,
        hourlyRate: 16,
        germanLevelRequired: "A2",
        requiredSkills: ["python", "Docker"],
        allowedVisaTypes: ["student_visa_16b"],
      },
      baseProfile,
      eligibleResult,
    )
    expect(ticks).toEqual({ visa: true, hours: true, german: true, salary: true, skills: true })
  })

  it("unstated job fields yield null (unverified), not a fake green tick", () => {
    const ticks = buildTicks(
      {
        hoursPerWeek: null,
        hourlyRate: null,
        germanLevelRequired: null,
        requiredSkills: [],
        allowedVisaTypes: ["student_visa_16b"],
      },
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
      {
        hoursPerWeek: 10,
        hourlyRate: 12.5,
        germanLevelRequired: null,
        requiredSkills: [],
        allowedVisaTypes: ["student_visa_16b"],
      },
      baseProfile,
      eligibleResult,
    )
    expect(ticks.salary).toBe(false)
  })

  it("salary tick is green when the user has no minimum", () => {
    const ticks = buildTicks(
      {
        hoursPerWeek: 10,
        hourlyRate: 12.5,
        germanLevelRequired: null,
        requiredSkills: [],
        allowedVisaTypes: ["student_visa_16b"],
      },
      { ...baseProfile, minHourlyRate: null },
      eligibleResult,
    )
    expect(ticks.salary).toBe(true)
  })

  it("german tick is red when the requirement exceeds the user's level", () => {
    const ticks = buildTicks(
      {
        hoursPerWeek: 10,
        hourlyRate: 16,
        germanLevelRequired: "C1",
        requiredSkills: [],
        allowedVisaTypes: ["student_visa_16b"],
      },
      baseProfile,
      eligibleResult,
    )
    expect(ticks.german).toBe(false)
  })

  it("skills matching is case-insensitive and requires at least one overlap", () => {
    const overlap = buildTicks(
      {
        hoursPerWeek: 10,
        hourlyRate: 16,
        germanLevelRequired: null,
        requiredSkills: ["REACT"],
        allowedVisaTypes: ["student_visa_16b"],
      },
      baseProfile,
      eligibleResult,
    )
    expect(overlap.skills).toBe(true)

    const disjoint = buildTicks(
      {
        hoursPerWeek: 10,
        hourlyRate: 16,
        germanLevelRequired: null,
        requiredSkills: ["Rust"],
        allowedVisaTypes: ["student_visa_16b"],
      },
      baseProfile,
      eligibleResult,
    )
    expect(disjoint.skills).toBe(false)
  })

  it("handles a profile with no skills recorded", () => {
    const ticks = buildTicks(
      {
        hoursPerWeek: 10,
        hourlyRate: 16,
        germanLevelRequired: null,
        requiredSkills: ["Python"],
        allowedVisaTypes: ["student_visa_16b"],
      },
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

// ── Visa verification: fail closed, never a fake green tick ───────────────────
//
// The SQL filter admits jobs whose `allowed_visa_types` is NULL, reading it as "the
// posting declared no restriction". That is a fail-open: an ad that never mentioned visas
// is indistinguishable from one that welcomes every visa. Before this change the tick
// rendered green for those, telling a §16b student a job was visa-verified when nobody had
// verified anything.

describe("visaVerified — unstated visa rules are unverified, not permitted", () => {
  it("returns null when the ad declared no visa allow-list", () => {
    expect(visaVerified(null, "student_visa_16b")).toBeNull()
    expect(visaVerified([], "student_visa_16b")).toBeNull()
  })

  it("returns true only when the declared list contains the user's visa", () => {
    expect(visaVerified(["student_visa_16b", "eu_citizen"], "student_visa_16b")).toBe(true)
  })

  it("returns false when the declared list excludes the user's visa", () => {
    expect(visaVerified(["eu_citizen", "blue_card"], "student_visa_16b")).toBe(false)
  })
})

describe("buildTicks — visa tick", () => {
  const job = {
    hoursPerWeek: 18,
    hourlyRate: 16,
    germanLevelRequired: null,
    requiredSkills: [],
    allowedVisaTypes: null as string[] | null,
  }

  it("is null (grey, 'not stated') when the ad declared no visa rules", () => {
    const ticks = buildTicks(job, baseProfile, eligibleResult)
    expect(ticks.visa).toBeNull()
  })

  it("is true only when the ad explicitly allows this user's visa", () => {
    const ticks = buildTicks(
      { ...job, allowedVisaTypes: ["student_visa_16b"] },
      baseProfile,
      eligibleResult,
    )
    expect(ticks.visa).toBe(true)
  })

  it("is false when the engine says the user is ineligible, regardless of the ad", () => {
    const ineligible = checkEligibility(
      "student_visa_16b",
      { contractType: "vollzeit", hoursPerWeek: 40, hourlyRate: 16 },
      { daysRemainingThisYear: 0 },
    )
    const ticks = buildTicks(
      { ...job, allowedVisaTypes: ["student_visa_16b"] },
      baseProfile,
      ineligible,
    )
    expect(ticks.visa).toBe(false)
  })
})
