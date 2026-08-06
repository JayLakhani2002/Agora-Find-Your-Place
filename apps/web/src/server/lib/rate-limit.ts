import { TRPCError } from "@trpc/server"
import { getQueueRedis } from "../queue"

/**
 * Per-user request limiting, backed by the Redis connection the BullMQ producers
 * already open — no new dependency and no second connection pool.
 *
 * Why this exists: `checkApplicationQuota` short-circuits to `{ allowed: true }` while
 * `BILLING_ENABLED !== "true"` (packages/billing/src/quota.ts:39), which is the shipped
 * state. Until billing goes live there is nothing between a signed-up user and the
 * Bedrock bill — and signup is free and self-service. Cost control cannot depend on the
 * billing flag being on, so these limits are deliberately independent of it.
 *
 * Fixed-window counters. A user can burst up to 2x the limit across a window boundary;
 * that is fine for abuse control and costs one round trip instead of the sorted-set
 * bookkeeping a true sliding window needs.
 */

/**
 * INCR + set the TTL only on the first hit of a window, atomically.
 *
 * The obvious two-call version (`INCR`, then `EXPIRE` when the result is 1) can leave a
 * key with no TTL forever if the process dies between the calls — which locks that user
 * out permanently. One EVAL has no such window.
 *
 * Returns { count, ttl } so the caller can send a truthful Retry-After.
 */
const INCR_WITH_TTL = `
  local n = redis.call('INCR', KEYS[1])
  if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return { n, redis.call('TTL', KEYS[1]) }
`

export interface LimitRule {
  /** Stable name — becomes part of the Redis key, so changing it resets counters. */
  readonly name: string
  readonly limit: number
  readonly windowSeconds: number
  /**
   * What to do when Redis itself is unreachable.
   *
   * "closed" — reject the request. Correct for anything that spends money: an outage
   *            must not become an open bar on the Bedrock account.
   * "open"   — allow it. Correct for ordinary reads, where a Redis blip should not take
   *            the product down.
   */
  readonly onBackendFailure: "open" | "closed"
}

/** Every user action that reaches Bedrock or Cohere. Tight, and fails closed. */
export const AI_PER_MINUTE: LimitRule = {
  name: "ai:min",
  limit: 6,
  windowSeconds: 60,
  onBackendFailure: "closed",
}

/**
 * The actual budget backstop. `deck.getDeck` alone fires up to 30 Bedrock calls per
 * request, so a per-minute cap is not enough on its own — this bounds the daily damage
 * from one account to something survivable.
 */
export const AI_PER_DAY: LimitRule = {
  name: "ai:day",
  limit: 120,
  windowSeconds: 24 * 60 * 60,
  onBackendFailure: "closed",
}

/** Broad backstop on every authenticated call: stops enumeration and scraping. */
export const REQUESTS_PER_MINUTE: LimitRule = {
  name: "req:min",
  limit: 240,
  windowSeconds: 60,
  onBackendFailure: "open",
}

/** Uploads are 10 MB each and land in paid object storage. */
export const UPLOADS_PER_HOUR: LimitRule = {
  name: "upload:hr",
  limit: 20,
  windowSeconds: 60 * 60,
  onBackendFailure: "closed",
}

/** Rules already reported as having an unreachable backend — see `consume`'s catch. */
const warnedRules = new Set<string>()

export interface LimitVerdict {
  allowed: boolean
  /** Seconds until the window resets. Only meaningful when `allowed` is false. */
  retryAfterSeconds: number
}

/**
 * Consume one unit of `rule` for `subject` (a user id — never a raw IP, which is shared
 * behind university and mobile NAT and would punish whole campuses at once).
 */
export async function consume(rule: LimitRule, subject: string): Promise<LimitVerdict> {
  const key = `rl:${rule.name}:${subject}`
  try {
    const raw = (await getQueueRedis().eval(INCR_WITH_TTL, 1, key, String(rule.windowSeconds))) as [
      number,
      number,
    ]
    const [count, ttl] = raw
    return {
      allowed: count <= rule.limit,
      // A -1/-2 TTL means the key has no expiry or vanished between calls; fall back to
      // the full window rather than telling the client to retry immediately.
      retryAfterSeconds: ttl > 0 ? ttl : rule.windowSeconds,
    }
  } catch (err) {
    // Once per rule per process. A Redis outage means *every* request takes this branch,
    // and an unthrottled log line per request buries the errors that matter (and costs
    // real money in log ingest) exactly when the system is already degraded.
    if (!warnedRules.has(rule.name)) {
      warnedRules.add(rule.name)
      console.error(`rate-limit backend unavailable (rule=${rule.name})`, err)
    }
    return {
      allowed: rule.onBackendFailure === "open",
      retryAfterSeconds: rule.windowSeconds,
    }
  }
}

/** `consume`, but throws the tRPC error instead of returning a verdict. */
export async function enforce(rule: LimitRule, subject: string): Promise<void> {
  const verdict = await consume(rule, subject)
  if (verdict.allowed) return
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: `Rate limit reached. Try again in ${verdict.retryAfterSeconds}s.`,
  })
}
