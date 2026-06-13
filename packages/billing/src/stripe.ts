// Agent 8 — Stripe client + plan configuration.
//
// ⚠️ BSS gate: billing ships dark. Every paid path checks `billingEnabled()`
// first; while it returns false the app behaves as if every user is on the
// free tier and NO Stripe network call is ever made. Flipping BILLING_ENABLED
// to "true" (env) activates billing with zero code changes — a business
// decision (post-BSS-funding, ~Mar 2027), not a deploy.

import Stripe from "stripe"

/** Single switch for all monetization. Default (unset/anything-but-"true") = OFF. */
export function billingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "true"
}

// InstanceType<typeof Stripe> works under BOTH module resolutions this file is
// checked with: NodeNext (this package's tsconfig → stripe's cjs export= types)
// and bundler (apps/web's tsconfig → stripe's esm default-class types).
type StripeClient = InstanceType<typeof Stripe>

let stripeSingleton: StripeClient | null = null

/**
 * Lazy Stripe client — never constructed at module scope, never constructed
 * while billing is dark. Callers must check `billingEnabled()` before calling.
 */
export function getStripe(): StripeClient {
  if (!billingEnabled()) {
    throw new Error(
      "getStripe called while BILLING_ENABLED is not 'true' — paid paths must be gated",
    )
  }
  if (!stripeSingleton) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set")
    stripeSingleton = new Stripe(secretKey, { apiVersion: "2026-05-27.dahlia" })
  }
  return stripeSingleton
}

export type PlanTier = "free" | "pro"

export interface Plan {
  tier: PlanTier
  name: string
  priceMonthlyEur: number
  entitlements: {
    applicationsPerMonth: number | "unlimited"
    browserExtension: boolean
    followUpAutomation: boolean
  }
}

// Pricing is provisional (Financial Model, monetization Year 2) — confirm before launch.
export const PLANS: readonly Plan[] = [
  {
    tier: "free",
    name: "Free",
    priceMonthlyEur: 0,
    entitlements: {
      applicationsPerMonth: 3,
      browserExtension: false,
      followUpAutomation: false,
    },
  },
  {
    tier: "pro",
    name: "Pro",
    priceMonthlyEur: 9,
    entitlements: {
      applicationsPerMonth: "unlimited",
      browserExtension: true,
      followUpAutomation: true,
    },
  },
] as const

export const FREE_APPLICATIONS_PER_MONTH = 3

export function getProPriceId(): string {
  const priceId = process.env.STRIPE_PRO_PRICE_ID
  if (!priceId) throw new Error("STRIPE_PRO_PRICE_ID is not set")
  return priceId
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set")
  return secret
}
