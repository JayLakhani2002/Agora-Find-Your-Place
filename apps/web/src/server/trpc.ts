import { getDb } from "@agora/db"
import { users } from "@agora/db/schema"
import { auth } from "@clerk/nextjs/server"
import { TRPCError, initTRPC } from "@trpc/server"
import { eq } from "drizzle-orm"
import { AI_PER_DAY, AI_PER_MINUTE, REQUESTS_PER_MINUTE, enforce } from "./lib/rate-limit"

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { userId: clerkId } = await auth()
  return { clerkId, db: getDb(), headers: opts.headers }
}

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create()

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory
export const baseProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.clerkId) throw new TRPCError({ code: "UNAUTHORIZED" })
  const clerkId = ctx.clerkId

  let user = await ctx.db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })

  // Just-in-time provisioning: the Clerk session is already verified, but the
  // user.created webhook may not have landed yet (delivery races the first request).
  // Create the row now so onboarding works immediately; the webhook backfills email.
  if (!user) {
    await ctx.db
      .insert(users)
      .values({ clerkId, email: "" })
      .onConflictDoNothing({ target: users.clerkId })
    user = await ctx.db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
  }

  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" })

  // Broad backstop against enumeration and scripted scraping. Fails open — a Redis
  // blip must not take the whole product down for a limit this loose.
  await enforce(REQUESTS_PER_MINUTE, user.id)

  return next({ ctx: { ...ctx, user } })
})

/**
 * For every procedure that reaches Bedrock or Cohere.
 *
 * Signup is free and self-service, and `checkApplicationQuota` is a no-op while
 * `BILLING_ENABLED !== "true"` — so without this, one account can drive unbounded
 * inference spend. These limits are intentionally independent of the billing flag:
 * turning billing on must be a product decision, not the thing that first switches on
 * cost control.
 *
 * Both rules fail *closed*. If Redis is unreachable we would rather return 429 than
 * leave the AI budget unmetered.
 */
export const aiProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  await enforce(AI_PER_MINUTE, ctx.user.id)
  await enforce(AI_PER_DAY, ctx.user.id)
  return next({ ctx })
})
