import { describe, expect, it } from "vitest"
import { type TableFilter, matchesFilter, rowHref } from "../src/lib/ui"
import type { ApplicationStatus } from "../src/server/routers/applications"

const ALL_STATUSES: ApplicationStatus[] = [
  "generated",
  "approved",
  "submitted",
  "interview_invited",
  "offer_received",
  "rejected",
  "withdrawn",
]

describe("matchesFilter", () => {
  it("puts every status in at most one of the three named tabs", () => {
    const tabs: TableFilter[] = ["review", "applied", "declined"]
    for (const status of ALL_STATUSES) {
      const hits = tabs.filter((t) => matchesFilter(status, t))
      expect(hits.length, `${status} matched ${hits.join(", ")}`).toBeLessThanOrEqual(1)
    }
  })

  it("shows every status under All", () => {
    for (const status of ALL_STATUSES) {
      expect(matchesFilter(status, "all")).toBe(true)
    }
  })

  it("counts only sent applications as applied", () => {
    expect(matchesFilter("submitted", "applied")).toBe(true)
    expect(matchesFilter("interview_invited", "applied")).toBe(true)
    expect(matchesFilter("offer_received", "applied")).toBe(true)
    // Drafted but not sent — the user still has to click Apply themselves.
    expect(matchesFilter("approved", "applied")).toBe(false)
    expect(matchesFilter("generated", "applied")).toBe(false)
  })
})

describe("rowHref", () => {
  it("routes a draft to review and an approved application to submit", () => {
    expect(rowHref("a1", "generated")).toBe("/applications/a1/review")
    expect(rowHref("a1", "approved")).toBe("/applications/a1/submit")
  })

  it("never links a post-submission row back into the submit flow", () => {
    // Mode 1 guard: `submitted` is reachable only from `approved`, so no
    // already-sent row may offer the submit screen again.
    for (const status of [
      "submitted",
      "interview_invited",
      "offer_received",
      "rejected",
    ] as const) {
      expect(rowHref("a1", status)).not.toContain("/submit")
    }
  })
})
