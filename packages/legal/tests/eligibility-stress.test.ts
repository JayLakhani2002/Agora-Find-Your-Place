/**
 * Stress tests for checkEligibility — adversarial edge cases not covered by the
 * baseline suite. Focus areas:
 *  - Exact boundary values (at, above, below the ceiling / cap / day limit)
 *  - Fractional / floating-point arithmetic near the €556 ceiling
 *  - Null / undefined / zero inputs across every field
 *  - Visa-specific invariants (near_graduation mirrors §16b; chancenkarte has no day limit)
 *  - Reason string content (human-readable, non-empty, parallel to failedChecks)
 *  - Result immutability — a second call must not mutate a prior result
 *  - The "always pass on missing state" principle for every check that has it
 */

import { describe, expect, it } from "vitest"
import {
  type ContractType,
  DEFAULT_MINIJOB_HOURS_PER_WEEK,
  MINIJOB_MONTHLY_CEILING_EUR,
  VISA_CONSTRAINTS,
  type VisaType,
  WEEKS_PER_MONTH,
} from "../src/constraints"
import { type EligibilityUserState, checkEligibility } from "../src/eligibility"

// ── helpers ──────────────────────────────────────────────────────────────────

const mkJob = (
  contractType: ContractType,
  hoursPerWeek: number | null,
  hourlyRate: number | null,
) => ({ contractType, hoursPerWeek, hourlyRate })

const fresh: EligibilityUserState = { daysRemainingThisYear: 140, enrollmentStatus: "enrolled" }
const exhausted: EligibilityUserState = { daysRemainingThisYear: 0, enrollmentStatus: "enrolled" }

// ── 1. Exact boundary: weekly hours cap ──────────────────────────────────────

describe("weekly hours — exact boundary values", () => {
  const visasWithCap: [VisaType, number][] = [
    ["student_visa_16b", 20],
    ["chancenkarte_20a", 20],
    ["near_graduation", 20],
    ["eu_citizen", 40],
    ["blue_card", 40],
  ]

  for (const [visa, cap] of visasWithCap) {
    const contract: ContractType = visa === "blue_card" ? "vollzeit" : "werkstudent"

    it(`${visa}: hours == cap (${cap}) → eligible`, () => {
      const r = checkEligibility(visa, mkJob(contract, cap, 15), fresh)
      expect(r.failedChecks).not.toContain("HOURS_EXCEED_LIMIT")
    })

    it(`${visa}: hours == cap + 1 (${cap + 1}) → HOURS_EXCEED_LIMIT`, () => {
      const r = checkEligibility(visa, mkJob(contract, cap + 1, 15), fresh)
      expect(r.failedChecks).toContain("HOURS_EXCEED_LIMIT")
    })

    it(`${visa}: hours == cap - 1 (${cap - 1}) → eligible`, () => {
      const r = checkEligibility(visa, mkJob(contract, cap - 1, 15), fresh)
      expect(r.failedChecks).not.toContain("HOURS_EXCEED_LIMIT")
    })
  }

  it("hours of 0 never triggers the cap (a 0-hour job is odd but not illegal)", () => {
    const r = checkEligibility("student_visa_16b", mkJob("werkstudent", 0, 15), fresh)
    expect(r.failedChecks).not.toContain("HOURS_EXCEED_LIMIT")
  })
})

// ── 2. Exact boundary: Minijob €556 ceiling ──────────────────────────────────

describe("Minijob ceiling — exact boundary arithmetic", () => {
  /** Hourly rate at which (rate × hours × WEEKS_PER_MONTH) == ceiling exactly. */
  const exactRate = MINIJOB_MONTHLY_CEILING_EUR / (10 * WEEKS_PER_MONTH)

  it("estimated monthly == ceiling exactly → eligible (not strictly greater)", () => {
    const r = checkEligibility("student_visa_16b", mkJob("minijob", 10, exactRate), fresh)
    expect(r.failedChecks).not.toContain("MINIJOB_CEILING_EXCEEDED")
  })

  it("estimated monthly == ceiling + 0.01 → MINIJOB_CEILING_EXCEEDED", () => {
    const epsilon = 0.01 / (10 * WEEKS_PER_MONTH)
    const r = checkEligibility("student_visa_16b", mkJob("minijob", 10, exactRate + epsilon), fresh)
    expect(r.failedChecks).toContain("MINIJOB_CEILING_EXCEEDED")
  })

  it("hourlyRate of 0 → €0/month → eligible (free volunteering edge case)", () => {
    const r = checkEligibility("student_visa_16b", mkJob("minijob", 10, 0), fresh)
    expect(r.failedChecks).not.toContain("MINIJOB_CEILING_EXCEEDED")
  })

  it("null hourlyRate → ceiling check skipped entirely", () => {
    // The spec only runs the ceiling check when hourlyRate is known.
    const r = checkEligibility("student_visa_16b", mkJob("minijob", 10, null), fresh)
    expect(r.failedChecks).not.toContain("MINIJOB_CEILING_EXCEEDED")
  })

  it("default 10h/week assumption used correctly when hoursPerWeek is null", () => {
    // ceiling / (DEFAULT_MINIJOB_HOURS_PER_WEEK * WEEKS_PER_MONTH) = exact-rate
    // Adding a small delta should push over.
    const overRate =
      MINIJOB_MONTHLY_CEILING_EUR / (DEFAULT_MINIJOB_HOURS_PER_WEEK * WEEKS_PER_MONTH) + 0.1
    const r = checkEligibility("student_visa_16b", mkJob("minijob", null, overRate), fresh)
    expect(r.failedChecks).toContain("MINIJOB_CEILING_EXCEEDED")
  })

  it("ceiling applies equally to chancenkarte_20a (also minijobAllowed)", () => {
    const overRate = (MINIJOB_MONTHLY_CEILING_EUR + 50) / (10 * WEEKS_PER_MONTH)
    const r = checkEligibility("chancenkarte_20a", mkJob("minijob", 10, overRate), {
      daysRemainingThisYear: null,
    })
    expect(r.failedChecks).toContain("MINIJOB_CEILING_EXCEEDED")
  })

  it("ceiling does NOT apply when contractType is werkstudent at same pay", () => {
    const highRate = 25 // far above minijob ceiling but fine for werkstudent
    const r = checkEligibility("student_visa_16b", mkJob("werkstudent", 18, highRate), fresh)
    expect(r.failedChecks).not.toContain("MINIJOB_CEILING_EXCEEDED")
  })

  it("ceiling does NOT apply for eu_citizen doing a non-minijob vollzeit role", () => {
    const r = checkEligibility("eu_citizen", mkJob("vollzeit", 40, 50), fresh)
    expect(r.failedChecks).not.toContain("MINIJOB_CEILING_EXCEEDED")
  })
})

// ── 3. Annual day limit — boundary ───────────────────────────────────────────

describe("annual day limit — boundary values and null passthrough", () => {
  const limited: VisaType[] = ["student_visa_16b", "near_graduation"]

  for (const visa of limited) {
    it(`${visa}: daysRemaining == 1 → eligible`, () => {
      const r = checkEligibility(visa, mkJob("werkstudent", 10, 15), {
        daysRemainingThisYear: 1,
        enrollmentStatus: "enrolled",
      })
      expect(r.failedChecks).not.toContain("ANNUAL_DAY_LIMIT_EXHAUSTED")
    })

    it(`${visa}: daysRemaining == 0 → ANNUAL_DAY_LIMIT_EXHAUSTED`, () => {
      const r = checkEligibility(visa, mkJob("werkstudent", 10, 15), exhausted)
      expect(r.failedChecks).toContain("ANNUAL_DAY_LIMIT_EXHAUSTED")
    })

    it(`${visa}: daysRemaining == -1 (over-run) → ANNUAL_DAY_LIMIT_EXHAUSTED`, () => {
      const r = checkEligibility(visa, mkJob("werkstudent", 10, 15), {
        daysRemainingThisYear: -1,
        enrollmentStatus: "enrolled",
      })
      expect(r.failedChecks).toContain("ANNUAL_DAY_LIMIT_EXHAUSTED")
    })

    it(`${visa}: daysRemaining == null → passes (not yet tracked)`, () => {
      const r = checkEligibility(visa, mkJob("werkstudent", 10, 15), {
        daysRemainingThisYear: null,
        enrollmentStatus: "enrolled",
      })
      expect(r.failedChecks).not.toContain("ANNUAL_DAY_LIMIT_EXHAUSTED")
    })
  }

  it("daysRemaining == 0 for eu_citizen → not blocked (no day limit)", () => {
    const r = checkEligibility("eu_citizen", mkJob("vollzeit", 35, 20), {
      daysRemainingThisYear: 0,
    })
    expect(r.eligible).toBe(true)
  })
})

// ── 4. Enrollment status — all valid statuses for every visa ─────────────────

describe("enrollment requirement — all statuses, all visas", () => {
  const requiresEnrollment: VisaType[] = ["student_visa_16b", "near_graduation"]
  const noEnrollment: VisaType[] = ["chancenkarte_20a", "eu_citizen", "blue_card"]

  for (const visa of requiresEnrollment) {
    it(`${visa}: missing enrollmentStatus (undefined) → treated as enrolled`, () => {
      const r = checkEligibility(visa, mkJob("werkstudent", 10, 15), {
        daysRemainingThisYear: 100,
        // enrollmentStatus intentionally omitted
      })
      expect(r.failedChecks).not.toContain("ENROLLMENT_REQUIRED")
    })

    it(`${visa}: enrollmentStatus == null → treated as enrolled`, () => {
      const r = checkEligibility(visa, mkJob("werkstudent", 10, 15), {
        daysRemainingThisYear: 100,
        enrollmentStatus: null,
      })
      expect(r.failedChecks).not.toContain("ENROLLMENT_REQUIRED")
    })
  }

  for (const visa of noEnrollment) {
    const contract: ContractType = visa === "blue_card" ? "vollzeit" : "werkstudent"
    for (const status of [
      "graduated",
      "leave_of_absence",
      "enrolled",
      "near_graduation",
    ] as const) {
      it(`${visa} with ${status} → never ENROLLMENT_REQUIRED`, () => {
        const r = checkEligibility(visa, mkJob(contract, 10, 15), {
          daysRemainingThisYear: null,
          enrollmentStatus: status,
        })
        expect(r.failedChecks).not.toContain("ENROLLMENT_REQUIRED")
      })
    }
  }
})

// ── 5. near_graduation mirrors student_visa_16b ───────────────────────────────

describe("near_graduation mirrors student_visa_16b constraints", () => {
  it("near_graduation has the same maxWeeklyHours as §16b", () => {
    expect(VISA_CONSTRAINTS.near_graduation.maxWeeklyHours).toBe(
      VISA_CONSTRAINTS.student_visa_16b.maxWeeklyHours,
    )
  })

  it("near_graduation has the same annualDayLimit as §16b", () => {
    expect(VISA_CONSTRAINTS.near_graduation.annualDayLimit).toBe(
      VISA_CONSTRAINTS.student_visa_16b.annualDayLimit,
    )
  })

  it("near_graduation allows the same contract types as §16b", () => {
    const a = [...VISA_CONSTRAINTS.near_graduation.allowedContractTypes].sort()
    const b = [...VISA_CONSTRAINTS.student_visa_16b.allowedContractTypes].sort()
    expect(a).toEqual(b)
  })

  it("a job ineligible for §16b is also ineligible for near_graduation", () => {
    const ineligibleJob = mkJob("vollzeit", 40, 25)
    const r16b = checkEligibility("student_visa_16b", ineligibleJob, exhausted)
    const rNear = checkEligibility("near_graduation", ineligibleJob, exhausted)
    expect(r16b.eligible).toBe(false)
    expect(rNear.eligible).toBe(false)
    expect(rNear.failedChecks.sort()).toEqual(r16b.failedChecks.sort())
  })
})

// ── 6. Reason string invariants ───────────────────────────────────────────────

describe("reason strings — parallel to failedChecks, human-readable", () => {
  it("reasons array length always equals failedChecks length", () => {
    const cases = [
      checkEligibility("student_visa_16b", mkJob("vollzeit", 40, 25), exhausted),
      checkEligibility("blue_card", mkJob("minijob", 5, 15), fresh),
      checkEligibility("eu_citizen", mkJob("vollzeit", 38, 20), fresh),
    ]
    for (const r of cases) {
      expect(r.reasons).toHaveLength(r.failedChecks.length)
    }
  })

  it("every reason is a non-empty string", () => {
    const r = checkEligibility("student_visa_16b", mkJob("vollzeit", 40, 25), exhausted)
    for (const reason of r.reasons) {
      expect(typeof reason).toBe("string")
      expect(reason.length).toBeGreaterThan(0)
    }
  })

  it("HOURS_EXCEED_LIMIT reason mentions both the job hours and the cap", () => {
    const r = checkEligibility("student_visa_16b", mkJob("werkstudent", 25, 15), fresh)
    const reason = r.reasons[r.failedChecks.indexOf("HOURS_EXCEED_LIMIT")]
    expect(reason).toContain("25")
    expect(reason).toContain("20")
  })

  it("MINIJOB_CEILING_EXCEEDED reason mentions €556", () => {
    const r = checkEligibility("student_visa_16b", mkJob("minijob", 15, 15), fresh)
    const reason = r.reasons[r.failedChecks.indexOf("MINIJOB_CEILING_EXCEEDED")]
    expect(reason).toContain("556")
  })

  it("eligible result has empty reasons and failedChecks", () => {
    const r = checkEligibility("eu_citizen", mkJob("vollzeit", 38, 20), fresh)
    expect(r.eligible).toBe(true)
    expect(r.reasons).toHaveLength(0)
    expect(r.failedChecks).toHaveLength(0)
  })
})

// ── 7. Result immutability — sequential calls don't share state ───────────────

describe("result immutability — no shared mutable state between calls", () => {
  it("mutating the returned failedChecks array does not affect a second call", () => {
    const job = mkJob("werkstudent", 10, 15)
    const r1 = checkEligibility("student_visa_16b", job, fresh)
    r1.failedChecks.push("CONTRACT_TYPE_NOT_ALLOWED" as never)
    const r2 = checkEligibility("student_visa_16b", job, fresh)
    expect(r2.failedChecks).toHaveLength(0)
  })

  it("mutating reasons array does not affect a second call", () => {
    const job = mkJob("werkstudent", 10, 15)
    const r1 = checkEligibility("student_visa_16b", job, fresh)
    r1.reasons.push("injected reason")
    const r2 = checkEligibility("student_visa_16b", job, fresh)
    expect(r2.reasons).toHaveLength(0)
  })
})

// ── 8. Blue Card specific: Minijob is explicitly disallowed ───────────────────

describe("blue_card — Minijob disallowed, not just ceiling-blocked", () => {
  it("Minijob under the ceiling is still rejected for blue_card (contract type check)", () => {
    // Hourly rate that stays under €556/month — but Minijob is not in allowedContractTypes
    const r = checkEligibility("blue_card", mkJob("minijob", 5, 10), {
      daysRemainingThisYear: null,
    })
    expect(r.eligible).toBe(false)
    expect(r.failedChecks).toContain("CONTRACT_TYPE_NOT_ALLOWED")
    // Ceiling should still be applied if contractType passes — but here it doesn't
    // (we're testing that CONTRACT_TYPE_NOT_ALLOWED fires regardless of ceiling)
  })

  it("blue_card: freelance is not permitted", () => {
    const r = checkEligibility("blue_card", mkJob("freelance", 20, 50), {
      daysRemainingThisYear: null,
    })
    expect(r.failedChecks).toContain("CONTRACT_TYPE_NOT_ALLOWED")
  })

  it("blue_card: Werkstudent at 40h is fine (skilled worker, full access)", () => {
    const r = checkEligibility("blue_card", mkJob("werkstudent", 40, 20), {
      daysRemainingThisYear: null,
    })
    expect(r.eligible).toBe(true)
  })
})

// ── 9. EU citizen: freelance is the widest entitlement ───────────────────────

describe("eu_citizen — widest entitlement", () => {
  it("freelance at 40h/week and high rate → eligible", () => {
    const r = checkEligibility("eu_citizen", mkJob("freelance", 40, 100), fresh)
    expect(r.eligible).toBe(true)
  })

  it("every contract type is eligible for eu_citizen (the widest set)", () => {
    const allContracts: ContractType[] = [
      "werkstudent",
      "minijob",
      "vollzeit",
      "teilzeit",
      "praktikum",
      "freelance",
    ]
    for (const ct of allContracts) {
      const r = checkEligibility("eu_citizen", mkJob(ct, 10, 12), fresh)
      // Should be eligible unless Minijob ceiling applies
      if (ct === "minijob") {
        // 12 €/h × 10h × 4.3 = 516 < 556 → eligible
        expect(r.eligible).toBe(true)
      } else {
        expect(r.eligible).toBe(true)
      }
    }
  })
})

// ── 10. chancenkarte_20a — independent of enrollment and day limit ────────────

describe("chancenkarte_20a — no enrollment, no day limit", () => {
  it("graduated job-seeker on chancenkarte can still work (no enrollment needed)", () => {
    const r = checkEligibility("chancenkarte_20a", mkJob("werkstudent", 20, 15), {
      daysRemainingThisYear: 0,
      enrollmentStatus: "graduated",
    })
    expect(r.eligible).toBe(true)
  })

  it("chancenkarte allows teilzeit but NOT vollzeit or freelance", () => {
    expect(
      checkEligibility("chancenkarte_20a", mkJob("teilzeit", 20, 15), {
        daysRemainingThisYear: null,
      }).eligible,
    ).toBe(true)

    expect(
      checkEligibility("chancenkarte_20a", mkJob("vollzeit", 20, 15), {
        daysRemainingThisYear: null,
      }).failedChecks,
    ).toContain("CONTRACT_TYPE_NOT_ALLOWED")

    expect(
      checkEligibility("chancenkarte_20a", mkJob("freelance", 20, 15), {
        daysRemainingThisYear: null,
      }).failedChecks,
    ).toContain("CONTRACT_TYPE_NOT_ALLOWED")
  })
})

// ── 11. Invariant: eligible === (failedChecks.length === 0) ───────────────────

describe("global invariant: eligible ↔ no failedChecks", () => {
  const allVisas = Object.keys(VISA_CONSTRAINTS) as VisaType[]
  const allContracts: ContractType[] = [
    "werkstudent",
    "minijob",
    "vollzeit",
    "teilzeit",
    "praktikum",
    "freelance",
  ]

  const states: EligibilityUserState[] = [
    fresh,
    exhausted,
    { daysRemainingThisYear: null },
    { daysRemainingThisYear: 50, enrollmentStatus: "graduated" },
  ]

  for (const visa of allVisas) {
    for (const contract of allContracts) {
      for (const state of states) {
        it(`${visa}×${contract}: eligible ↔ failedChecks.length === 0`, () => {
          const r = checkEligibility(visa, mkJob(contract, 15, 14), state)
          expect(r.eligible).toBe(r.failedChecks.length === 0)
        })
      }
    }
  }
})
