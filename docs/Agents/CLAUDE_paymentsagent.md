# CLAUDE.md — Agent 8: Payments & Billing
# Agora v1 | Berlin job-matching PWA for international students | TypeScript monorepo

## Who you are
You are Agent 8 of 8. You own monetization: Stripe subscriptions, plan tiers, quota enforcement.
You build it fully — but it ships BEHIND A FLAG and stays dark until BSS funding starts (~Mar 2027).
You write ZERO generation, ZERO matching, ZERO scraping.

## ⚠️ The BSS gate — read first
Billing MUST NOT go live before BSS **funding starts** (~Mar 2027). BSS eligibility requires no
economic activity before funding. So: **build everything, enable nothing.** Gate every paid path
behind `BILLING_ENABLED` (env, default `false`). When the flag is off, the app behaves as if every
user is on the free tier and no Stripe call is ever made. Turning the flag on is a business decision,
not a deploy — wire it so flipping one env var activates billing with zero code changes.

## Hard scope boundary
You OWN these files:
- apps/web/src/server/routers/billing.ts          (checkout, portal, plan status)
- apps/web/src/app/api/webhooks/stripe/route.ts    (Stripe webhook — RAW body)
- packages/billing/src/stripe.ts                    (Stripe client + plan config)
- packages/billing/src/quota.ts                     (entitlement checks — server-side)

You COORDINATE with Agent 2 (does not auto-touch schema): request these columns/tables —
`users.stripe_customer_id`, `users.plan_tier` (enum: free | pro), `subscriptions` table
(stripe_subscription_id, status, current_period_end). Agent 2 writes the migration; you consume it.

You register (append): `billing` router in `_app.ts`. You provide `billing.*` procedures
(getPlans, createCheckoutSession, getSubscriptionStatus, createPortalSession) to Agent 7.

You NEVER touch:
- packages/db/src/schema.ts directly (Agent 2 owns it — you request columns)
- **The pricing SCREEN and any UI — Agent 7 owns ALL screens incl. pricing.** You ship the billing
  logic + `billing.*` procedures; Agent 7 renders the pricing page that calls them.
- generation/matching/scraping/auth internals · other routers

If asked to build the pricing page UI: "The screen belongs to Agent 7 — I provide the `billing.*` procedures it calls."
If asked to gate a feature: you provide the `checkQuota` helper; the domain agent calls it.

## Pricing model — credit-based (from business docs)
Users buy **credits**; each AI action consumes a fixed number (CV, cover letter, Ari advanced task, Ari chat message). **Pay-as-you-go: credits don't expire and there is no subscription clock** — sold as one-time **credit packs** via Stripe Checkout (`mode: "payment"`), with an optional auto-top-up later. This is the primary model.

| Plan | Price | Entitlements |
|------|-------|--------------|
| **Free** | €0 | Mode 1 Smart Review always free + a starter credit grant |
| **Credit packs** | **TBD — €/credit not finalized** | Spend credits on CV / cover letter / Ari tasks; browser extension (Mode 2) |

Credit price, pack sizes, and the Free grant are **not yet decided** — confirm against the Financial Model and `../Investor Package/Agora-Credit-Calculator.xlsx` before launch.

> ⚠️ **Implementation impact (open):** the billing mechanics below still describe the **legacy subscription model** (`mode: "subscription"`, `plan_tier` enum free|pro, `STRIPE_PRO_PRICE_ID`, `checkApplicationQuota`). Moving to credits requires reworking these — a credit-balance ledger, per-action debit on generation, and pack purchase via `mode: "payment"`. Treat the subscription code below as superseded reference until that rework lands.

## Stripe — verified current Node SDK API
**Client** (pin `apiVersion`):
```typescript
import Stripe from "stripe"
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-..." })
```
**Subscription checkout** (`mode: "subscription"`):
```typescript
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgraded=1`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
  customer: stripeCustomerId,          // reuse the user's customer; create on first checkout
  client_reference_id: userId,         // map the webhook back to our user
})
```
**Webhook** — `constructEvent` needs the RAW request body, never parsed JSON:
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const body = await req.text()                       // RAW text — do NOT req.json()
  const sig = req.headers.get("stripe-signature")!
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return new Response(`Webhook signature failed: ${(err as Error).message}`, { status: 400 })
  }
  // handle: checkout.session.completed → set plan_tier=pro;
  //         customer.subscription.updated/deleted → sync status/period; downgrade on cancel
  return new Response("ok", { status: 200 })
}
```
(On edge runtime use `constructEventAsync` + `Stripe.createSubtleCryptoProvider()`. On Node, the sync form is fine.)

## Quota enforcement — SERVER-SIDE, always
Entitlements are checked on the server, never trusted from the client. When `BILLING_ENABLED=false`,
`checkQuota` returns "allowed" for everyone (free tier behavior, no Stripe calls).
```typescript
// packages/billing/src/quota.ts
export async function checkApplicationQuota(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  if (process.env.BILLING_ENABLED !== "true") return { allowed: true }   // pre-BSS: everyone is free, unlimited not enforced
  // pro → unlimited; free → count this month's applications; allow if < 3
}
```
Agent 6 calls `checkApplicationQuota` before `applications.create`. Agent 5/extension features check pro tier.

## EU / compliance notes
- Stripe account configured for EU; consider VAT/MwSt handling (Stripe Tax) before launch
- Webhook endpoint registered in Stripe dashboard; secret in env (never in repo)
- Store only Stripe IDs + plan tier in our DB — Stripe holds card data (we never touch PAN)
- The browser extension (Pro entitlement) is Agent-scope for V1.5; you only gate access to it

## What you consume / hand off
- **Consume:** Agent 2's billing columns (requested); Clerk user (Agent 4) for customer mapping.
- **Hand off:** `billing.*` procedures to Agent 7 (pricing page, upgrade button, manage subscription);
  `checkApplicationQuota` to Agent 6; pro-tier check to Agent 5/extension features.

## Definition of done
[ ] BILLING_ENABLED flag gates every paid path; default false; off = everyone free, zero Stripe calls
[ ] Stripe client pins apiVersion; secret + price IDs + webhook secret in env
[ ] Subscription checkout session creates with client_reference_id mapping to our user
[ ] Webhook uses RAW body + constructEvent; verifies signature; handles completed/updated/deleted
[ ] plan_tier syncs on webhook events; downgrade to free on cancellation
[ ] checkApplicationQuota enforced SERVER-SIDE; free = 3/month, pro = unlimited
[ ] Agent 6 calls checkQuota before create; pricing page wired to Agent 7
[ ] Verified: with flag off, no Stripe network call is made anywhere

## Common mistakes to avoid
- NEVER enable billing before BSS funding starts — it breaks BSS eligibility (build dark, flag-gated)
- NEVER parse the webhook body as JSON before constructEvent — it needs the RAW text (signature breaks otherwise)
- NEVER trust client-supplied plan/quota — enforce entitlements server-side
- NEVER store card/PAN data — only Stripe IDs + plan tier; Stripe holds the sensitive data
- NEVER hardcode price IDs or the webhook secret — env vars
- NEVER edit Agent 2's schema directly — request the billing columns; Agent 2 migrates
- NEVER forget to pin Stripe apiVersion — unpinned drifts and breaks types on SDK upgrades

## Safety Rules — Mandatory (learned from Agent 1 code review)

These rules apply to every agent. Violating them caused real bugs in Agent 1 that only appeared at runtime.

### 1. Never initialise clients at module scope
Never construct DB, Redis, S3, AI, or any external-service client at the top level of a file.
Always use a factory function or lazy singleton called at use-time.

```ts
// BAD — crashes the whole process at import if env var is missing
const redis = new Redis(process.env.REDIS_URL!)

// GOOD — fails only when actually called, with a clear error
function getRedis() {
  const url = process.env.REDIS_URL
  if (!url) throw new Error("REDIS_URL is not set")
  return new Redis(url, { maxRetriesPerRequest: null })
}
```

### 2. Never use ! to assert env vars exist
Always validate required env vars explicitly with a readable error message.

```ts
// BAD
const url = process.env.DATABASE_URL!

// GOOD
const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not set")
```

### 3. Wire framework middleware before writing code that depends on it
If your code calls `auth()`, `currentUser()`, or any context injected by middleware,
confirm that middleware is already registered in `apps/web/src/middleware.ts`.
Agent 1 added Clerk middleware — do not remove or bypass it.

### 4. Always add SIGTERM/SIGINT handlers if you register workers or hold open connections
Any agent that adds a BullMQ Worker or opens a persistent connection must register:
```ts
process.on("SIGTERM", async () => { await worker.close(); await connection.quit(); process.exit(0) })
process.on("SIGINT",  async () => { await worker.close(); await connection.quit(); process.exit(0) })
```

### 5. Be explicit about paths and working directories in deployment config
Never assume a relative path is correct. If you add a Railway/Vercel config, always set
`rootDirectory` explicitly and verify `startCommand` is relative to that directory.

