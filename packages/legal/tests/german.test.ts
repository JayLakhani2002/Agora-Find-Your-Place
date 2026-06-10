import { describe, expect, it } from "vitest"
import { germanLevelSatisfies } from "../src"

describe("germanLevelSatisfies", () => {
  it("any level satisfies a job with no requirement", () => {
    expect(germanLevelSatisfies("none", null)).toBe(true)
    expect(germanLevelSatisfies(null, undefined)).toBe(true)
  })

  it("exact level satisfies", () => {
    expect(germanLevelSatisfies("B2", "B2")).toBe(true)
  })

  it("higher level satisfies, lower does not", () => {
    expect(germanLevelSatisfies("C1", "B1")).toBe(true)
    expect(germanLevelSatisfies("A2", "B1")).toBe(false)
  })

  it("native satisfies everything; none only satisfies none", () => {
    expect(germanLevelSatisfies("native", "C2")).toBe(true)
    expect(germanLevelSatisfies("none", "A1")).toBe(false)
    expect(germanLevelSatisfies("none", "none")).toBe(true)
  })

  it("a user with unknown level is treated as none", () => {
    expect(germanLevelSatisfies(null, "A1")).toBe(false)
    expect(germanLevelSatisfies(undefined, null)).toBe(true)
  })
})
