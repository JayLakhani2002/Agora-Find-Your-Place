// Agent 8 — server-side entitlement checks.
//
// Entitlements are enforced HERE, on the server — never trusted from the
// client. Agent 6 calls `checkApplicationQuota` before `applications.create`;
// Agent 5 / extension features call `hasProTier`.

import { getDb } from "@agora/db"
import { applications, users } from "@agora/db/schema"
import { and, count, eq, gte, ne } from "drizzle-orm"
import { FREE_APPLICATIONS_PER_MONTH, billingEnabled } from "./stripe"

export interface QuotaResult {
  allowed: boolean
  reason?: string
  /** Applications created this calendar month (UTC). Omitted when unlimited. */
  used?: number
  limit?: number
}

function startOfCurrentMonthUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

/**
 * Free = 3 AI applications / calendar month; Pro = unlimited.
 * Pre-BSS (BILLING_ENABLED ≠ "true"): everyone is allowed, no limit enforced,
 * and no Stripe call is made anywhere in this path (it's pure DB).
 */
export async function checkApplicationQuota(
  userId: string,
  /**
   * Application row to leave out of the count. The swipe creates the row before
   * generation is requested, so by the time the gate runs the pending application is
   * already in the table — counting it would reject the Nth request at N-1.
   */
  excludeApplicationId?: string,
): Promise<QuotaResult> {
  if (!billingEnabled()) return { allowed: true }

  const db = getDb()
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) return { allowed: false, reason: "User not found" }

  if (user.planTier === "pro") return { allowed: true }

  const [row] = await db
    .select({ used: count() })
    .from(applications)
    .where(
      and(
        eq(applications.userId, userId),
        gte(applications.createdAt, startOfCurrentMonthUtc()),
        ...(excludeApplicationId ? [ne(applications.id, excludeApplicationId)] : []),
      ),
    )
  const used = row?.used ?? 0

  if (used >= FREE_APPLICATIONS_PER_MONTH) {
    return {
      allowed: false,
      reason: `Free plan includes ${FREE_APPLICATIONS_PER_MONTH} applications per month. Upgrade to Pro for unlimited applications.`,
      used,
      limit: FREE_APPLICATIONS_PER_MONTH,
    }
  }
  return { allowed: true, used, limit: FREE_APPLICATIONS_PER_MONTH }
}

/** Pro-tier gate for premium features (Mode 2 extension, follow-up automation). */
export async function hasProTier(userId: string): Promise<boolean> {
  if (!billingEnabled()) return false // pre-BSS: no one is pro, nothing is paid
  const db = getDb()
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  return user?.planTier === "pro"
}
