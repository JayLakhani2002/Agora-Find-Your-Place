// Agent 8 — Stripe webhook. Syncs plan_tier + the subscriptions mirror table.
//
// ⚠️ constructEvent needs the RAW request body — never req.json() before
// verification or the signature check breaks.
//
// Handled events:
//   checkout.session.completed            → plan_tier = pro
//   customer.subscription.created/updated → sync status/period; tier follows status
//   customer.subscription.deleted         → downgrade to free
//
// While BILLING_ENABLED ≠ "true" no checkout can ever start, so no legitimate
// event can arrive; we ack with 200 (so nothing retries) and change nothing.

import { billingEnabled, getStripe, getWebhookSecret } from "@agora/billing"
import { getDb } from "@agora/db"
import { subscriptions, users } from "@agora/db/schema"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"

export const runtime = "nodejs" // sync constructEvent needs Node crypto, not edge

const ACTIVE_STATUSES: ReadonlySet<string> = new Set(["active", "trialing"])

type SubscriptionStatus = (typeof subscriptions.$inferInsert)["status"]

function toLocalStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  // Our enum mirrors Stripe's statuses 1:1; fall back to canceled for anything unknown.
  const known: SubscriptionStatus[] = [
    "active",
    "trialing",
    "past_due",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "unpaid",
    "paused",
  ]
  return (known as string[]).includes(status) ? (status as SubscriptionStatus) : "canceled"
}

async function findUserByCustomerId(customerId: string) {
  const db = getDb()
  return db.query.users.findFirst({ where: eq(users.stripeCustomerId, customerId) })
}

async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id
  const user = await findUserByCustomerId(customerId)
  if (!user) return // customer not ours (e.g. test-mode noise) — ack and ignore

  const db = getDb()
  const status = toLocalStatus(sub.status)
  const item = sub.items.data[0]
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null

  await db
    .insert(subscriptions)
    .values({
      userId: user.id,
      stripeSubscriptionId: sub.id,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        updatedAt: new Date(),
      },
    })

  // Tier follows subscription health: active/trialing = pro, anything else = free.
  const tier = ACTIVE_STATUSES.has(status) ? ("pro" as const) : ("free" as const)
  if (user.planTier !== tier) {
    await db
      .update(users)
      .set({ planTier: tier, updatedAt: new Date() })
      .where(eq(users.id, user.id))
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return
  const db = getDb()
  // client_reference_id maps the session back to our user (set at checkout creation).
  const userId = session.client_reference_id
  if (!userId) return
  await db.update(users).set({ planTier: "pro", updatedAt: new Date() }).where(eq(users.id, userId))
}

export async function POST(req: Request) {
  if (!billingEnabled()) {
    // Billing is dark — no checkout exists, so any event here is noise. Ack so
    // Stripe doesn't retry; sync nothing.
    return new Response("billing disabled", { status: 200 })
  }

  const body = await req.text() // RAW text — do NOT req.json()
  const signature = req.headers.get("stripe-signature")
  if (!signature) return new Response("missing stripe-signature header", { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret())
  } catch (err) {
    return new Response(`Webhook signature failed: ${(err as Error).message}`, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object)
      break
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object)
      break
    default:
      break // unhandled event types are acked without action
  }

  return new Response("ok", { status: 200 })
}
