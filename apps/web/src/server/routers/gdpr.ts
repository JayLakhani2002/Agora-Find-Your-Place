import { clerkClient } from "@clerk/nextjs/server"
import { TRPCError } from "@trpc/server"
import { eraseUserAndStorage } from "../lib/erasure"
import { createTRPCRouter, protectedProcedure } from "../trpc"

/**
 * GDPR Article 17 erasure. MUST exist before any real user data is collected.
 * Order matters: collect + delete storage FIRST, then the DB row (FK cascade
 * removes profile/docs/actions/applications/drafts), then the Clerk user last.
 * Retains NO user identifiers — logs only timestamps.
 */
export const gdprRouter = createTRPCRouter({
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const requestedAt = new Date().toISOString()
    const userId = ctx.user.id
    const clerkId = ctx.user.clerkId

    // 1+2. Storage objects, then the DB row — FK cascades remove all user-linked rows.
    // Throws (before touching the DB) if any object failed to delete.
    await eraseUserAndStorage(ctx.db, userId)

    // 3. Delete the Clerk user last (its webhook becomes a no-op — row already gone).
    // This MUST NOT be swallowed: a surviving Clerk user still holds the person's email,
    // their session stays valid, and protectedProcedure's JIT provisioning re-creates the
    // row on their very next request — resurrecting an account we reported as erased.
    try {
      const cc = await clerkClient()
      await cc.users.deleteUser(clerkId)
    } catch (err) {
      console.error("GDPR: Clerk user deletion failed after DB + storage erasure:", err)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Your data was erased but the sign-in account could not be closed. Please retry — contact support if this repeats.",
        cause: err,
      })
    }

    console.log(
      JSON.stringify({ event: "gdpr_erasure", requestedAt, completedAt: new Date().toISOString() }),
    )
    return { ok: true }
  }),
})
