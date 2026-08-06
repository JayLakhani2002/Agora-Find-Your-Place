import { beforeEach, describe, expect, it, vi } from "vitest"
// vi.mock calls below are hoisted above this import by vitest, so the mocked
// @neondatabase/serverless and drizzle-orm/neon-serverless are already in place.
import { withUserContext } from "../src/rls"

/**
 * `withUserContext` has one property that, if it regresses, converts the isolation
 * mechanism into a cross-tenant leak: the session variable must be **transaction-local**.
 *
 * `set_config(name, value, is_local)` with `is_local = false` persists the setting on the
 * pooled connection after COMMIT. The next request to be handed that connection then
 * inherits the previous user's identity, and RLS cheerfully serves them the wrong rows —
 * a leak introduced by the very thing meant to prevent leaks, and one that only manifests
 * under connection reuse, i.e. in production and never in a local test click-through.
 *
 * These tests inspect the generated SQL rather than talking to a database, so they run in
 * CI with no Postgres and still fail loudly if that third argument ever flips.
 */

const executed: { sql: string; params: unknown[] }[] = []

const fakeTx = {
  execute: vi.fn(async (query: { queryChunks?: unknown[] }) => {
    // Drizzle's sql`` template exposes its pieces; reconstruct enough to assert on.
    const chunks = (query.queryChunks ?? []) as { value?: string[] }[]
    const text = chunks.map((c) => (Array.isArray(c.value) ? c.value.join("") : "")).join("?")
    executed.push({ sql: text, params: chunks.filter((c) => !Array.isArray(c.value)) })
    return { rows: [] }
  }),
}

vi.mock("@neondatabase/serverless", () => ({
  Pool: class {
    end = vi.fn(async () => {})
  },
  neonConfig: {},
}))

vi.mock("drizzle-orm/neon-serverless", () => ({
  drizzle: () => ({
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx),
  }),
}))

beforeEach(() => {
  executed.length = 0
  fakeTx.execute.mockClear()
  process.env.DATABASE_URL_UNPOOLED = "postgresql://user:pw@example.neon.tech/db"
})

describe("withUserContext", () => {
  it("sets app.current_user_id before running the callback", async () => {
    const order: string[] = []
    fakeTx.execute.mockImplementationOnce(async () => {
      order.push("set_config")
      return { rows: [] }
    })
    await withUserContext("user_abc", async () => {
      order.push("callback")
      return null
    })
    // If the callback ran first, its queries would evaluate against no user context and
    // (post-0007) return nothing.
    expect(order).toEqual(["set_config", "callback"])
  })

  it("uses set_config with is_local = true", async () => {
    await withUserContext("user_abc", async () => null)
    const stmt = executed[0]?.sql ?? ""
    expect(stmt).toContain("set_config")
    expect(stmt).toContain("app.current_user_id")
    // The load-bearing assertion. `false` here leaks the identity onto the pooled
    // connection and hands it to whoever gets that connection next.
    expect(stmt).toMatch(/,\s*true\s*\)/)
    expect(stmt).not.toMatch(/,\s*false\s*\)/)
  })

  it("passes the user id as a bound parameter, never interpolated", async () => {
    await withUserContext("user'; drop table users; --", async () => null)
    const stmt = executed[0]?.sql ?? ""
    expect(stmt).not.toContain("drop table")
    expect(executed[0]?.params.length).toBeGreaterThan(0)
  })

  it("returns the callback's value", async () => {
    await expect(withUserContext("user_abc", async () => ({ ok: 1 }))).resolves.toEqual({ ok: 1 })
  })

  it("refuses an empty user id rather than running with no context", async () => {
    // Silently proceeding would, post-0007, produce a confusing empty result instead of a
    // clear programming error.
    await expect(withUserContext("", async () => null)).rejects.toThrow(/requires a userId/)
  })
})
