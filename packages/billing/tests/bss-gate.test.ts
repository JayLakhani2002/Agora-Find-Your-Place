// The BSS gate is a hard business constraint: with BILLING_ENABLED unset or
// not exactly "true", every user is free tier, quota is unenforced, and NO
// Stripe client can even be constructed (so no network call is possible).

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { checkApplicationQuota, hasProTier } from "../src/quota"
import { FREE_APPLICATIONS_PER_MONTH, PLANS, billingEnabled, getStripe } from "../src/stripe"

const ORIGINAL_ENV = process.env.BILLING_ENABLED

beforeEach(() => {
  delete process.env.BILLING_ENABLED
})

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.BILLING_ENABLED
  else process.env.BILLING_ENABLED = ORIGINAL_ENV
})

describe("BSS gate (BILLING_ENABLED off)", () => {
  it("billing is disabled by default (env unset)", () => {
    expect(billingEnabled()).toBe(false)
  })

  it('billing is disabled for any value other than exactly "true"', () => {
    for (const value of ["false", "TRUE", "1", "yes", ""]) {
      process.env.BILLING_ENABLED = value
      expect(billingEnabled()).toBe(false)
    }
  })

  it("getStripe throws while dark — no Stripe client can exist, so no network call", () => {
    expect(() => getStripe()).toThrow(/BILLING_ENABLED/)
  })

  it("quota always allows while dark, without touching the database", async () => {
    // No DATABASE_URL in the test env — if this hit the DB it would throw.
    await expect(checkApplicationQuota("any-user")).resolves.toEqual({ allowed: true })
  })

  it("no one is pro while dark", async () => {
    await expect(hasProTier("any-user")).resolves.toBe(false)
  })
})

describe("plan configuration", () => {
  it("free tier allows 3 applications per month", () => {
    const free = PLANS.find((p) => p.tier === "free")
    expect(free?.entitlements.applicationsPerMonth).toBe(FREE_APPLICATIONS_PER_MONTH)
    expect(FREE_APPLICATIONS_PER_MONTH).toBe(3)
  })

  it("pro tier is unlimited with extension + follow-up automation", () => {
    const pro = PLANS.find((p) => p.tier === "pro")
    expect(pro?.entitlements.applicationsPerMonth).toBe("unlimited")
    expect(pro?.entitlements.browserExtension).toBe(true)
    expect(pro?.entitlements.followUpAutomation).toBe(true)
  })
})
