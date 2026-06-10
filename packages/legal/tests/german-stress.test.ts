/**
 * Stress tests for germanLevelSatisfies — all CEFR transitions, boundary cases,
 * null/undefined handling, and the reflexivity / transitivity invariants.
 */

import { describe, expect, it } from "vitest"
import { type GermanLevel, germanLevelSatisfies } from "../src"

const LEVELS: GermanLevel[] = ["none", "A1", "A2", "B1", "B2", "C1", "C2", "native"]

// ── 1. Every level satisfies "no requirement" ─────────────────────────────────

describe("null requirement → always satisfied", () => {
  for (const level of LEVELS) {
    it(`${level} satisfies null requirement`, () => {
      expect(germanLevelSatisfies(level, null)).toBe(true)
    })
  }

  it("null user level satisfies null requirement", () => {
    expect(germanLevelSatisfies(null, null)).toBe(true)
  })

  it("undefined user level satisfies null requirement", () => {
    expect(germanLevelSatisfies(undefined, null)).toBe(true)
  })
})

// ── 2. Reflexivity: every level satisfies itself ──────────────────────────────

describe("reflexivity: every level satisfies itself", () => {
  for (const level of LEVELS) {
    it(`${level} satisfies ${level}`, () => {
      expect(germanLevelSatisfies(level, level)).toBe(true)
    })
  }
})

// ── 3. Transitivity: higher always satisfies lower ────────────────────────────

describe("transitivity: higher level satisfies every lower requirement", () => {
  for (let i = 0; i < LEVELS.length; i++) {
    for (let j = 0; j <= i; j++) {
      it(`${LEVELS[i]} satisfies ${LEVELS[j]}`, () => {
        expect(germanLevelSatisfies(LEVELS[i], LEVELS[j])).toBe(true)
      })
    }
  }
})

// ── 4. Strict order: lower never satisfies strictly higher requirement ─────────

describe("strict order: lower does NOT satisfy a strictly higher requirement", () => {
  for (let i = 0; i < LEVELS.length - 1; i++) {
    it(`${LEVELS[i]} does NOT satisfy ${LEVELS[i + 1]}`, () => {
      expect(germanLevelSatisfies(LEVELS[i], LEVELS[i + 1])).toBe(false)
    })
  }
})

// ── 5. null / undefined user level treated as "none" ─────────────────────────

describe("null / undefined user level treated as 'none'", () => {
  it("null user level fails A1 requirement (none < A1)", () => {
    expect(germanLevelSatisfies(null, "A1")).toBe(false)
  })

  it("undefined user level fails B2 requirement", () => {
    expect(germanLevelSatisfies(undefined, "B2")).toBe(false)
  })

  it("null user level satisfies 'none' requirement", () => {
    expect(germanLevelSatisfies(null, "none")).toBe(true)
  })
})

// ── 6. Key product scenarios (card tick reality) ──────────────────────────────

describe("product scenarios — card tick values", () => {
  it("B1 user satisfies an A2 job requirement (common Werkstudent listing)", () => {
    expect(germanLevelSatisfies("B1", "A2")).toBe(true)
  })

  it("A2 user does NOT satisfy a B2 requirement (finance, law roles)", () => {
    expect(germanLevelSatisfies("A2", "B2")).toBe(false)
  })

  it("native speaker satisfies every requirement including C2", () => {
    for (const level of LEVELS) {
      expect(germanLevelSatisfies("native", level)).toBe(true)
    }
  })

  it("'none' only satisfies 'none' requirement", () => {
    expect(germanLevelSatisfies("none", "none")).toBe(true)
    expect(germanLevelSatisfies("none", "A1")).toBe(false)
  })
})

// ── 7. Full 8×8 exhaustive matrix ────────────────────────────────────────────

describe("full 8×8 CEFR matrix", () => {
  for (let i = 0; i < LEVELS.length; i++) {
    for (let j = 0; j < LEVELS.length; j++) {
      const expected = i >= j // user >= required
      it(`${LEVELS[i]} vs required ${LEVELS[j]} → ${expected}`, () => {
        expect(germanLevelSatisfies(LEVELS[i], LEVELS[j])).toBe(expected)
      })
    }
  }
})
