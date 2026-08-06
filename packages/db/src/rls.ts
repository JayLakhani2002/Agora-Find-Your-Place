/**
 * Session-scoped database access — the client half of the RLS rollout.
 *
 * ## Why this file exists
 *
 * `getDb()` in client.ts uses `drizzle-orm/neon-http`, which sends every query as an
 * independent stateless HTTP POST. There is no session, so `SET app.current_user_id` and
 * the query that depends on it are two unrelated round-trips and the variable is gone
 * before the query runs. That is precisely the constraint recorded in
 * `drizzle/0002_rls_decision.md`, and it is why RLS was skipped originally.
 *
 * The fix is not to abandon RLS; it is to give the request a real session. This module
 * uses the WebSocket driver (`neon-serverless` + `Pool`) and runs each unit of work inside
 * one transaction that first sets the user id as a **transaction-local** variable.
 *
 * ## Status
 *
 * Wired but not yet load-bearing. Migration 0006 (roles + RLS with permissive policies) is
 * safe to apply today. Migration 0007 (the actual isolation predicates) must not be applied
 * until every user-scoped query in apps/web goes through `withUserContext`. See
 * `docs/Security/RLS-ROLLOUT.md` for the ordering and the rollback.
 *
 * ## The cost, stated honestly
 *
 * The WebSocket driver holds a real connection per request. That is measurably more
 * expensive than the HTTP driver on a serverless platform, and it introduces a connection
 * ceiling the HTTP driver does not have. It buys the property that a forgotten
 * `WHERE user_id` returns an empty set instead of every user's visa status and CV — which,
 * for this dataset, is worth paying for.
 */

import { Pool, neonConfig } from "@neondatabase/serverless"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-serverless"
import ws from "ws"
import * as schema from "./schema"

// The driver needs a WebSocket implementation. Browsers and modern Node have one globally;
// older Node runtimes and some serverless sandboxes do not, so supply it explicitly.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws
}

type SessionDb = Parameters<
  Parameters<ReturnType<typeof drizzle<typeof schema>>["transaction"]>[0]
>[0]

let _pool: Pool | undefined

function getPool(): Pool {
  if (_pool) return _pool
  // DATABASE_URL_UNPOOLED is the direct (non-PgBouncer) endpoint. Session-level state —
  // which is exactly what this module depends on — is not safe through a transaction-mode
  // pooler, so prefer the unpooled URL and only fall back if it is unset.
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set")
  _pool = new Pool({ connectionString: url })
  return _pool
}

/**
 * Run `fn` with the RLS user context established for the whole transaction.
 *
 * ```ts
 * const apps = await withUserContext(ctx.user.id, (tx) =>
 *   tx.select().from(applications)   // no WHERE user_id needed — RLS enforces it
 * )
 * ```
 *
 * Three properties worth being explicit about:
 *
 * 1. **`set_config(..., true)` is transaction-local.** The third argument is `is_local`.
 *    With `false` the setting would persist on the pooled connection after the transaction
 *    commits, and the next request to reuse that connection would inherit the previous
 *    user's identity. That is a cross-tenant leak *introduced by the isolation mechanism*,
 *    and it is the single most important line in this file.
 *
 * 2. **The value is passed as a bound parameter**, not interpolated. `set_config` takes it
 *    as data, so a user id can never be read as SQL.
 *
 * 3. **Callers still write their `WHERE user_id` clauses.** RLS is defence in depth, not a
 *    replacement for application-layer scoping. Two independent layers have to fail before
 *    data crosses a tenant boundary; that is the entire point.
 */
export async function withUserContext<T>(
  userId: string,
  fn: (tx: SessionDb) => Promise<T>,
): Promise<T> {
  if (!userId) throw new Error("withUserContext requires a userId")
  const db = drizzle(getPool(), { schema })
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`)
    return fn(tx)
  })
}

/** Close the pool. For tests and graceful worker shutdown; not used on the request path. */
export async function closeRlsPool(): Promise<void> {
  if (!_pool) return
  const pool = _pool
  _pool = undefined
  await pool.end()
}
