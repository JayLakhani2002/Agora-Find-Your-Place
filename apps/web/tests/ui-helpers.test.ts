import { describe, expect, it } from "vitest"
import {
  SCORE_BAR_CLASS,
  STATUS_META,
  TRACKER_NEXT,
  daysSince,
  formatHours,
  formatRate,
  scoreBand,
} from "../src/lib/ui"
import { type ApplicationStatus, VALID_TRANSITIONS } from "../src/server/routers/applications"

// ── scoreBand — the color thresholds from the spec (≥8 green, ≥6 amber) ───────

describe("scoreBand", () => {
  it("maps ≥8 to green", () => {
    expect(scoreBand(8)).toBe("green")
    expect(scoreBand(10)).toBe("green")
  })

  it("maps ≥6 and <8 to amber", () => {
    expect(scoreBand(6)).toBe("amber")
    expect(scoreBand(7.9)).toBe("amber")
  })

  it("maps <6 to red", () => {
    expect(scoreBand(5.9)).toBe("red")
    expect(scoreBand(0)).toBe("red")
  })

  it("maps missing scores to none", () => {
    expect(scoreBand(null)).toBe("none")
    expect(scoreBand(undefined)).toBe("none")
  })

  it("has a bar class for every band", () => {
    for (const band of ["green", "amber", "red", "none"] as const) {
      expect(SCORE_BAR_CLASS[band]).toMatch(/^bg-/)
    }
  })
})

// ── daysSince ──────────────────────────────────────────────────────────────────

describe("daysSince", () => {
  const now = new Date("2026-06-11T12:00:00Z")

  it("returns 0 for the same day", () => {
    expect(daysSince(new Date("2026-06-11T01:00:00Z"), now)).toBe(0)
  })

  it("counts full days", () => {
    expect(daysSince(new Date("2026-06-01T12:00:00Z"), now)).toBe(10)
  })

  it("accepts ISO strings", () => {
    expect(daysSince("2026-06-04T12:00:00Z", now)).toBe(7)
  })

  it("clamps future dates to 0 instead of going negative", () => {
    expect(daysSince(new Date("2026-06-20T12:00:00Z"), now)).toBe(0)
  })

  it("returns null for missing or invalid dates", () => {
    expect(daysSince(null, now)).toBeNull()
    expect(daysSince(undefined, now)).toBeNull()
    expect(daysSince("not-a-date", now)).toBeNull()
  })
})

// ── TRACKER_NEXT must be a strict subset of the server state machine ──────────

describe("TRACKER_NEXT stays consistent with VALID_TRANSITIONS", () => {
  it("only offers transitions the server allows", () => {
    for (const [from, nexts] of Object.entries(TRACKER_NEXT)) {
      for (const to of nexts ?? []) {
        expect(
          VALID_TRANSITIONS[from as ApplicationStatus],
          `${from} → ${to} offered by UI but rejected by server`,
        ).toContain(to)
      }
    }
  })

  it("never offers the submitted status (it has its own explicit flow)", () => {
    for (const nexts of Object.values(TRACKER_NEXT)) {
      expect(nexts).not.toContain("submitted")
    }
  })

  it("never offers transitions from terminal states", () => {
    expect(TRACKER_NEXT.rejected).toBeUndefined()
    expect(TRACKER_NEXT.withdrawn).toBeUndefined()
  })

  it("offers every server-allowed post-submission transition (no dead ends)", () => {
    // From submitted/interview_invited/offer_received, everything the server
    // allows should be reachable in the UI.
    for (const from of ["submitted", "interview_invited", "offer_received"] as const) {
      expect([...(TRACKER_NEXT[from] ?? [])].sort()).toEqual([...VALID_TRANSITIONS[from]].sort())
    }
  })
})

// ── STATUS_META covers the full status union ──────────────────────────────────

describe("STATUS_META", () => {
  it("has a label and badge variant for every application status", () => {
    const allStatuses = Object.keys(VALID_TRANSITIONS) as ApplicationStatus[]
    for (const status of allStatuses) {
      expect(STATUS_META[status]?.label, `missing label for ${status}`).toBeTruthy()
      expect(STATUS_META[status]?.variant, `missing variant for ${status}`).toBeTruthy()
    }
  })
})

// ── formatting ─────────────────────────────────────────────────────────────────

describe("formatRate / formatHours", () => {
  it("formats present values", () => {
    expect(formatRate(16)).toBe("€16/h")
    expect(formatHours(20)).toBe("20 h/week")
  })

  it("is honest about missing values (never fakes a number)", () => {
    expect(formatRate(null)).toBe("Rate not stated")
    expect(formatHours(null)).toBe("Hours not stated")
  })
})
