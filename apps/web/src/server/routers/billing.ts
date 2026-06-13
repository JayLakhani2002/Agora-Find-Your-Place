// Agent 8 — billing router: plan info, subscription checkout, customer portal.
//
// ⚠️ BSS gate: while BILLING_ENABLED ≠ "true" every procedure here is a safe
// no-op — read procedures report the free tier, write procedures throw
// PRECONDITION_FAILED, and no Stripe network call is ever made. The pricing
// page (Agent 7) reads `billingEnabled` from getPlans to render "coming soon".

import {
  PLANS,
  billingEnabled,
  checkApplicationQuota,
  getProPriceId,
  getStripe,
} from "@agora/billing"
import type { DB } from "@agora/db"
import { subscriptions, users } from "@agora/db/schema"
import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"
import { createTRPCRouter, protectedProcedure } from "../trpc"

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "NEXT_PUBLIC_APP_URL is not set",
    })
  return url
}

/** Reuse the user's Stripe customer; create one on first checkout. */
async function ensureStripeCustomer(
  db: DB,
  user: { id: string; email: string; stripeCustomerId: string | null },
): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId
  const customer = await getStripe().customers.create({
    // email can be "" pre-webhook (JIT-provisioned user) — omit it entirely then
    ...(user.email ? { email: user.email } : {}),
    metadata: { userId: user.id },
  })
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, user.id))
  return customer.id
}

export const billingRouter = createTRPCRouter({
  // Plan catalogue + the gate flag — Agent 7's pricing page renders from this.
  getPlans: protectedProcedure.query(() => ({
    billingEnabled: billingEnabled(),
    plans: PLANS,
  })),

  getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    if (!billingEnabled()) {
      // Pre-BSS: everyone reports free tier; quota unenforced.
      return {
        billingEnabled: false,
        planTier: "free" as const,
        subscription: null,
        quota: { allowed: true },
      }
    }
    const subscription = await ctx.db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ctx.user.id),
      orderBy: desc(subscriptions.updatedAt),
    })
    const quota = await checkApplicationQuota(ctx.user.id)
    return {
      billingEnabled: true,
      planTier: ctx.user.planTier,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
      quota,
    }
  }),

  createCheckoutSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (!billingEnabled()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Billing is not yet available.",
      })
    }
    if (ctx.user.planTier === "pro") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You are already on the Pro plan." })
    }
    const appUrl = getAppUrl()
    const customerId = await ensureStripeCustomer(ctx.db, ctx.user)
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getProPriceId(), quantity: 1 }],
      success_url: `${appUrl}/settings?upgraded=1`,
      cancel_url: `${appUrl}/pricing`,
      customer: customerId,
      client_reference_id: ctx.user.id, // maps the webhook back to our user
    })
    if (!session.url)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Stripe returned no checkout URL",
      })
    return { url: session.url }
  }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (!billingEnabled()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Billing is not yet available.",
      })
    }
    if (!ctx.user.stripeCustomerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No billing account yet — upgrade first.",
      })
    }
    const session = await getStripe().billingPortal.sessions.create({
      customer: ctx.user.stripeCustomerId,
      return_url: `${getAppUrl()}/settings`,
    })
    return { url: session.url }
  }),
})
