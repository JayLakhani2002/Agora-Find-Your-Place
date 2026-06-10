import { deleteObject } from "@agora/ai"
import { applications, userDocuments, users } from "@agora/db/schema"
import { clerkClient } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
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

    // 1. Gather every Scaleway object owned by this user.
    const docs = await ctx.db
      .select({ key: userDocuments.storageKey })
      .from(userDocuments)
      .where(eq(userDocuments.userId, userId))
    const apps = await ctx.db
      .select({ cv: applications.cvStorageKey, cl: applications.coverLetterStorageKey })
      .from(applications)
      .where(eq(applications.userId, userId))

    const keys = [...docs.map((d) => d.key), ...apps.flatMap((a) => [a.cv, a.cl])].filter(
      (k): k is string => !!k,
    )

    // 2. Delete storage objects (best-effort — a missing object must not block erasure).
    await Promise.allSettled(keys.map((k) => deleteObject(k)))

    // 3. Delete the DB row — FK cascades remove all user-linked rows.
    await ctx.db.delete(users).where(eq(users.id, userId))

    // 4. Delete the Clerk user last (its webhook becomes a no-op — row already gone).
    try {
      const cc = await clerkClient()
      await cc.users.deleteUser(clerkId)
    } catch (err) {
      console.error("GDPR: Clerk user deletion failed (DB + storage already erased):", err)
    }

    console.log(
      JSON.stringify({ event: "gdpr_erasure", requestedAt, completedAt: new Date().toISOString() }),
    )
    return { ok: true }
  }),
})
