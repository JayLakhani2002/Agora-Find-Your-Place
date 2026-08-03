import { describe, expect, it } from "vitest"
import { withBudget } from "../src/server/routers/deck"

const FALLBACK: string[] = ["fallback"]

function slow<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

describe("withBudget", () => {
  it("returns the real value when the work finishes inside the budget", async () => {
    const result = await withBudget(slow("real", 5), 200, "fallback")
    expect(result).toEqual({ value: "real", timedOut: false })
  })

  it("falls back once the budget elapses", async () => {
    // Simulates the measured failure: Bedrock throttling pushed the rerank to
    // 19.8s (and once to 76s), which became the deck's total latency.
    const result = await withBudget(slow("real", 400), 30, "fallback")
    expect(result).toEqual({ value: "fallback", timedOut: true })
  })

  it("bounds latency to roughly the budget, not the work", async () => {
    const started = Date.now()
    await withBudget(slow("real", 2000), 40, "fallback")
    // Generous ceiling — asserting it did NOT wait the full 2s is the point.
    expect(Date.now() - started).toBeLessThan(600)
  })

  it("preserves the fallback's identity so callers can pass a prepared array", async () => {
    const result = await withBudget(slow(["real"], 300), 20, FALLBACK)
    expect(result.value).toBe(FALLBACK)
  })

  it("does not treat a falsy result as a timeout", async () => {
    // null is a legitimate score value; only the internal sentinel means timeout.
    await expect(withBudget(Promise.resolve(null), 200, "fallback")).resolves.toEqual({
      value: null,
      timedOut: false,
    })
    await expect(withBudget(Promise.resolve(0), 200, -1)).resolves.toEqual({
      value: 0,
      timedOut: false,
    })
  })
})
