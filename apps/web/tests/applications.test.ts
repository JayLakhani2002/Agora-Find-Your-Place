import { describe, expect, it } from "vitest"
import {
  type ApplicationStatus,
  VALID_TRANSITIONS,
  appendAuditEntry,
  canTransition,
} from "../src/server/routers/applications"

const ALL_STATUSES = Object.keys(VALID_TRANSITIONS) as ApplicationStatus[]

describe("application state machine — the legal heart", () => {
  it("submitted is reachable ONLY from approved (Mode 1 hard rule)", () => {
    for (const from of ALL_STATUSES) {
      const allowed = canTransition(from, "submitted")
      if (from === "approved") {
        expect(allowed).toBe(true)
      } else {
        expect(allowed, `submitted must NOT be reachable from ${from}`).toBe(false)
      }
    }
  })

  it("approved is reachable only from generated", () => {
    for (const from of ALL_STATUSES) {
      expect(canTransition(from, "approved")).toBe(from === "generated")
    }
  })

  it("no state can transition to itself", () => {
    for (const s of ALL_STATUSES) {
      expect(canTransition(s, s), `${s} → ${s} must be invalid`).toBe(false)
    }
  })

  it("rejected and withdrawn are terminal", () => {
    for (const to of ALL_STATUSES) {
      expect(canTransition("rejected", to)).toBe(false)
      expect(canTransition("withdrawn", to)).toBe(false)
    }
  })

  it("no transition ever leads BACK to generated (no resurrection)", () => {
    for (const from of ALL_STATUSES) {
      expect(canTransition(from, "generated")).toBe(false)
    }
  })

  it("interview/rejection/offer are reachable only after submission", () => {
    for (const to of ["interview_invited", "offer_received", "rejected"] as const) {
      for (const from of ["generated", "approved"] as const) {
        expect(canTransition(from, to), `${from} → ${to} must be invalid`).toBe(false)
      }
    }
    expect(canTransition("submitted", "interview_invited")).toBe(true)
    expect(canTransition("submitted", "rejected")).toBe(true)
    expect(canTransition("submitted", "offer_received")).toBe(true)
  })

  it("withdrawn is reachable from every non-terminal state", () => {
    for (const from of [
      "generated",
      "approved",
      "submitted",
      "interview_invited",
      "offer_received",
    ] as const) {
      expect(canTransition(from, "withdrawn"), `${from} → withdrawn must be valid`).toBe(true)
    }
  })

  it("the full happy path is exactly generated → approved → submitted", () => {
    expect(canTransition("generated", "approved")).toBe(true)
    expect(canTransition("approved", "submitted")).toBe(true)
    // and never skipping a step
    expect(canTransition("generated", "submitted")).toBe(false)
  })

  it("unknown source state is rejected, not crashed", () => {
    expect(canTransition("nonsense" as ApplicationStatus, "submitted")).toBe(false)
  })
})

describe("appendAuditEntry — append-only audit log", () => {
  it("appends with an ISO timestamp", () => {
    const log = appendAuditEntry(null, { action: "created", actor: "user" })
    expect(log).toHaveLength(1)
    expect(log[0]?.action).toBe("created")
    expect(new Date(log[0]?.timestamp ?? "").getTime()).not.toBeNaN()
  })

  it("preserves existing entries in order (append-only)", () => {
    const first = appendAuditEntry(null, { action: "created", actor: "user" })
    const second = appendAuditEntry(first, { action: "approved_by_user", actor: "user" })
    const third = appendAuditEntry(second, {
      action: "marked_submitted_by_user",
      actor: "user",
      detail: "user submitted on employer page (Mode 1)",
    })
    expect(third.map((e) => e.action)).toEqual([
      "created",
      "approved_by_user",
      "marked_submitted_by_user",
    ])
  })

  it("does not mutate the input array", () => {
    const original = appendAuditEntry(null, { action: "created", actor: "user" })
    const copy = [...original]
    appendAuditEntry(original, { action: "x", actor: "system" })
    expect(original).toEqual(copy)
  })

  it("handles a null/undefined existing log", () => {
    expect(appendAuditEntry(undefined, { action: "a", actor: "system" })).toHaveLength(1)
    expect(appendAuditEntry(null, { action: "a", actor: "system" })).toHaveLength(1)
  })
})

describe("Mode 3 absence — no employer submission path exists", () => {
  it("the transition table contains no system-actor path into submitted", () => {
    // Structural proof: `submitted` has exactly one inbound edge (approved),
    // and the router guards it behind an explicit user mutation. There is no
    // other writer of status="submitted" in the codebase (verified by grep in CI
    // review); this test pins the table so a regression is loud.
    const inbound = ALL_STATUSES.filter((from) => VALID_TRANSITIONS[from].includes("submitted"))
    expect(inbound).toEqual(["approved"])
  })
})
