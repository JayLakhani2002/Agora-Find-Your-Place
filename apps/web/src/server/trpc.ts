import { getDb } from "@agora/db"
import { users } from "@agora/db/schema"
import { auth } from "@clerk/nextjs/server"
import { TRPCError, initTRPC } from "@trpc/server"
import { eq } from "drizzle-orm"

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
  return next({ ctx: { ...ctx, user } })
})
