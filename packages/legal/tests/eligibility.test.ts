import { describe, expect, it } from "vitest"
import {
  type ContractType,
  MINIJOB_MONTHLY_CEILING_EUR,
  VISA_CONSTRAINTS,
  type VisaType,
  checkEligibility,
} from "../src"

const ALL_VISAS = Object.keys(VISA_CONSTRAINTS) as VisaType[]
const ALL_CONTRACTS: ContractType[] = [
  "werkstudent",
  "minijob",
  "vollzeit",
  "teilzeit",
  "praktikum",
  "freelance",
]

/** A job that violates nothing except (possibly) its contract type. */
const neutralJob = (contractType: ContractType) => ({
  contractType,
  hoursPerWeek: 8,
  hourlyRate: 13,
})

const freshUser = { daysRemainingThisYear: 140 } as const

describe("checkEligibility — visa × contract matrix (every combination)", () => {
  for (const visa of ALL_VISAS) {
    for (const contract of ALL_CONTRACTS) {
      const allowed = VISA_CONSTRAINTS[visa].allowedContractTypes.includes(contract)
      it(`${visa} × ${contract} → ${allowed ? "eligible" : "CONTRACT_TYPE_NOT_ALLOWED"}`, () => {
        const result = checkEligibility(visa, neutralJob(contract), freshUser)
        if (allowed) {
          expect(result.eligible).toBe(true)
          expect(result.failedChecks).toHaveLength(0)
        } else {
          expect(result.eligible).toBe(false)
          expect(result.failedChecks).toContain("CONTRACT_TYPE_NOT_ALLOWED")
        }
      })
    }
  }
})

describe("weekly hours cap", () => {
  it("rejects a 25h/week job for a §16b student (20h cap)", () => {
    const result = checkEligibility(
      "student_visa_16b",
      { contractType: "werkstudent", hoursPerWeek: 25, hourlyRate: 15 },
      freshUser,
    )
    expect(result.eligible).toBe(false)
    expect(result.failedChecks).toContain("HOURS_EXCEED_LIMIT")
  })

  it("accepts exactly 20h/week for a §16b student (boundary)", () => {
    const result = checkEligibility(
      "student_visa_16b",
      { contractType: "werkstudent", hoursPerWeek: 20, hourlyRate: 15 },
      freshUser,
    )
    expect(result.eligible).toBe(true)
  })

  it("accepts 38h/week for an EU citizen (40h cap)", () => {
    const result = checkEligibility(
      "eu_citizen",
      { contractType: "vollzeit", hoursPerWeek: 38, hourlyRate: 20 },
      freshUser,
    )
    expect(result.eligible).toBe(true)
  })

  it("passes a job with unknown hours (null) — bounded by contract-type check", () => {
    const result = checkEligibility(
      "student_visa_16b",
      { contractType: "werkstudent", hoursPerWeek: null, hourlyRate: 15 },
      freshUser,
    )
    expect(result.eligible).toBe(true)
  })
})

describe("annual day limit (§16b / near_graduation)", () => {
  it("rejects when the 140-day allowance is exhausted", () => {
    const result = checkEligibility("student_visa_16b", neutralJob("werkstudent"), {
      daysRemainingThisYear: 0,
    })
    expect(result.eligible).toBe(false)
    expect(result.failedChecks).toContain("ANNUAL_DAY_LIMIT_EXHAUSTED")
  })

  it("near_graduation also carries the 140-day limit", () => {
    const result = checkEligibility("near_graduation", neutralJob("werkstudent"), {
      daysRemainingThisYear: -3,
    })
    expect(result.eligible).toBe(false)
    expect(result.failedChecks).toContain("ANNUAL_DAY_LIMIT_EXHAUSTED")
  })

  it("ignores exhausted days for visas without a day limit (chancenkarte, EU)", () => {
    for (const visa of ["chancenkarte_20a", "eu_citizen"] as const) {
      const result = checkEligibility(visa, neutralJob("werkstudent"), {
        daysRemainingThisYear: 0,
      })
      expect(result.eligible).toBe(true)
    }
  })

  it("passes when days remaining is unknown (null)", () => {
    const result = checkEligibility("student_visa_16b", neutralJob("werkstudent"), {
      daysRemainingThisYear: null,
    })
    expect(result.eligible).toBe(true)
  })
})

describe("enrollment requirement", () => {
  it("rejects a graduated user on a student visa", () => {
    const result = checkEligibility("student_visa_16b", neutralJob("werkstudent"), {
      daysRemainingThisYear: 100,
      enrollmentStatus: "graduated",
    })
    expect(result.eligible).toBe(false)
    expect(result.failedChecks).toContain("ENROLLMENT_REQUIRED")
  })

  it("rejects leave_of_absence on a student visa", () => {
    const result = checkEligibility("student_visa_16b", neutralJob("werkstudent"), {
      daysRemainingThisYear: 100,
      enrollmentStatus: "leave_of_absence",
    })
    expect(result.eligible).toBe(false)
    expect(result.failedChecks).toContain("ENROLLMENT_REQUIRED")
  })

  it("accepts enrolled and near_graduation statuses on a student visa", () => {
    for (const status of ["enrolled", "near_graduation"] as const) {
      const result = checkEligibility("student_visa_16b", neutralJob("werkstudent"), {
        daysRemainingThisYear: 100,
        enrollmentStatus: status,
      })
      expect(result.eligible).toBe(true)
    }
  })

  it("does not require enrollment for chancenkarte / EU / blue card", () => {
    for (const visa of ["chancenkarte_20a", "eu_citizen", "blue_card"] as const) {
      const result = checkEligibility(visa, neutralJob("werkstudent"), {
        daysRemainingThisYear: null,
        enrollmentStatus: "graduated",
      })
      expect(result.eligible).toBe(true)
    }
  })
})

describe("Minijob €556/month ceiling", () => {
  it("rejects a Minijob whose estimated monthly earnings exceed the ceiling", () => {
    // 15 €/h × 12 h/week × 4.3 = €774/month > €556
    const result = checkEligibility(
      "student_visa_16b",
      { contractType: "minijob", hoursPerWeek: 12, hourlyRate: 15 },
      freshUser,
    )
    expect(result.eligible).toBe(false)
    expect(result.failedChecks).toContain("MINIJOB_CEILING_EXCEEDED")
  })

  it("accepts a Minijob under the ceiling", () => {
    // 12.82 €/h × 10 h/week × 4.3 ≈ €551 ≤ €556
    const result = checkEligibility(
      "student_visa_16b",
      { contractType: "minijob", hoursPerWeek: 10, hourlyRate: 12.82 },
      freshUser,
    )
    expect(result.eligible).toBe(true)
  })

  it("uses the 10h/week default when a Minijob omits hours", () => {
    // 14 €/h × 10 (default) × 4.3 = €602 > €556 → rejected
    const result = checkEligibility(
      "student_visa_16b",
      { contractType: "minijob", hoursPerWeek: null, hourlyRate: 14 },
      freshUser,
    )
    expect(result.eligible).toBe(false)
    expect(result.failedChecks).toContain("MINIJOB_CEILING_EXCEEDED")
  })

  it("does not apply the ceiling to non-Minijob contracts", () => {
    const result = checkEligibility(
      "eu_citizen",
      { contractType: "vollzeit", hoursPerWeek: 40, hourlyRate: 30 },
      freshUser,
    )
    expect(result.eligible).toBe(true)
  })

  it("ceiling constant matches the 2025 legal figure", () => {
    expect(MINIJOB_MONTHLY_CEILING_EUR).toBe(556)
  })
})

describe("multiple simultaneous violations are all reported", () => {
  it("vollzeit 40h job for an exhausted §16b student fails three checks", () => {
    const result = checkEligibility(
      "student_visa_16b",
      { contractType: "vollzeit", hoursPerWeek: 40, hourlyRate: 25 },
      { daysRemainingThisYear: 0 },
    )
    expect(result.eligible).toBe(false)
    expect(result.failedChecks).toEqual(
      expect.arrayContaining([
        "CONTRACT_TYPE_NOT_ALLOWED",
        "HOURS_EXCEED_LIMIT",
        "ANNUAL_DAY_LIMIT_EXHAUSTED",
      ]),
    )
    expect(result.reasons).toHaveLength(result.failedChecks.length)
  })
})

describe("acceptance: §16b sees strictly fewer options than an EU citizen", () => {
  it("every contract eligible for §16b is also eligible for eu_citizen", () => {
    for (const contract of ALL_CONTRACTS) {
      const student = checkEligibility("student_visa_16b", neutralJob(contract), freshUser)
      const eu = checkEligibility("eu_citizen", neutralJob(contract), freshUser)
      if (student.eligible) expect(eu.eligible).toBe(true)
    }
  })

  it("vollzeit is invisible to §16b but visible to eu_citizen", () => {
    expect(checkEligibility("student_visa_16b", neutralJob("vollzeit"), freshUser).eligible).toBe(
      false,
    )
    expect(checkEligibility("eu_citizen", neutralJob("vollzeit"), freshUser).eligible).toBe(true)
  })
})
