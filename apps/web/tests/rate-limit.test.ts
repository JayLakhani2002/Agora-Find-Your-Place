import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The limiter is the only thing standing between a free signup and the Bedrock bill
 * while `BILLING_ENABLED` is unset, so the properties that matter are:
 *   - it actually stops the (limit + 1)th call,
 *   - a Redis outage fails *closed* for money-spending rules and *open* for cheap ones,
 *   - counters are per-subject and per-rule, so one user cannot exhaust another's budget.
 *
 * `fakeRedis.eval` reproduces the Lua script's semantics (INCR, EXPIRE only on the first
 * hit) so the test exercises the real branch logic in `consume` rather than a stub of it.
 */

const state = new Map<string, { count: number; ttl: number }>()
let evalShouldThrow = false

const fakeRedis = {
  eval: vi.fn(async (_script: string, _numKeys: number, key: string, window: string) => {
    if (evalShouldThrow) throw new Error("ECONNREFUSED")
    const entry = state.get(key) ?? { count: 0, ttl: -1 }
    entry.count += 1
    if (entry.count === 1) entry.ttl = Number(window)
    state.set(key, entry)
    return [entry.count, entry.ttl]
  }),
}

vi.mock("../src/server/queue", () => ({ getQueueRedis: () => fakeRedis }))

const { AI_PER_DAY, AI_PER_MINUTE, REQUESTS_PER_MINUTE, consume, enforce } = await import(
  "../src/server/lib/rate-limit"
)

beforeEach(() => {
  state.clear()
  evalShouldThrow = false
  fakeRedis.eval.mockClear()
})

describe("consume", () => {
  it("allows exactly `limit` calls, then rejects", async () => {
    for (let i = 0; i < AI_PER_MINUTE.limit; i++) {
      expect((await consume(AI_PER_MINUTE, "user_a")).allowed).toBe(true)
    }
    const overflow = await consume(AI_PER_MINUTE, "user_a")
    expect(overflow.allowed).toBe(false)
    // Retry-After must be the real remaining TTL, not a guess.
    expect(overflow.retryAfterSeconds).toBe(AI_PER_MINUTE.windowSeconds)
  })

  it("sets the window TTL once, on the first hit only", async () => {
    await consume(AI_PER_MINUTE, "user_a")
    await consume(AI_PER_MINUTE, "user_a")
    // A TTL refreshed on every hit would let a steady stream of requests hold the key
    // alive forever, locking the user out permanently instead of for one window.
    expect(state.get("rl:ai:min:user_a")).toEqual({ count: 2, ttl: 60 })
  })

  it("counts each subject separately", async () => {
    for (let i = 0; i < AI_PER_MINUTE.limit; i++) await consume(AI_PER_MINUTE, "user_a")
    expect((await consume(AI_PER_MINUTE, "user_a")).allowed).toBe(false)
    expect((await consume(AI_PER_MINUTE, "user_b")).allowed).toBe(true)
  })

  it("counts each rule separately", async () => {
    for (let i = 0; i < AI_PER_MINUTE.limit; i++) await consume(AI_PER_MINUTE, "user_a")
    expect((await consume(AI_PER_MINUTE, "user_a")).allowed).toBe(false)
    // The daily budget must not have been consumed by the per-minute rule.
    expect((await consume(AI_PER_DAY, "user_a")).allowed).toBe(true)
  })

  it("fails CLOSED when Redis is unreachable for a spend rule", async () => {
    evalShouldThrow = true
    expect(AI_PER_MINUTE.onBackendFailure).toBe("closed")
    expect((await consume(AI_PER_MINUTE, "user_a")).allowed).toBe(false)
    expect((await consume(AI_PER_DAY, "user_a")).allowed).toBe(false)
  })

  it("fails OPEN when Redis is unreachable for the broad request rule", async () => {
    evalShouldThrow = true
    expect(REQUESTS_PER_MINUTE.onBackendFailure).toBe("open")
    expect((await consume(REQUESTS_PER_MINUTE, "user_a")).allowed).toBe(true)
  })
})

describe("enforce", () => {
  it("throws TOO_MANY_REQUESTS past the limit and is silent under it", async () => {
    await expect(enforce(AI_PER_MINUTE, "user_a")).resolves.toBeUndefined()
    for (let i = 1; i < AI_PER_MINUTE.limit; i++) await consume(AI_PER_MINUTE, "user_a")
    await expect(enforce(AI_PER_MINUTE, "user_a")).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    })
  })
})
