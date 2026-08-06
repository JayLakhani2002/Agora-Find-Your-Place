import { deleteObject } from "@agora/ai"
import type { DB } from "@agora/db"
import { applications, userDocuments, users } from "@agora/db/schema"
import { eq } from "drizzle-orm"

/**
 * Collect every storage key to erase for a GDPR account deletion: uploaded CVs plus
 * generated CV/cover-letter keys on applications. Filters out nulls so a missing key
 * never produces an `undefined` delete. Pure + unit-tested — the erasure path must
 * never silently skip a user's files.
 */
export function collectErasureKeys(
  docs: { key: string | null }[],
  apps: { cv: string | null; cl: string | null }[],
): string[] {
  return [...docs.map((d) => d.key), ...apps.flatMap((a) => [a.cv, a.cl])].filter(
    (k): k is string => !!k,
  )
}

/**
 * Erase a user's object-storage files, then the DB row (FK cascades take the rest).
 *
 * Storage MUST go first and MUST succeed: the `users` row is the only record of which
 * objects belong to this person, so deleting it while a `deleteObject` is failing
 * orphans their CVs in the bucket permanently, with nothing left to find them by.
 * S3 DeleteObject is idempotent — an already-missing key returns success — so a
 * rejection here is a real outage, not a benign 404, and aborting is the safe call.
 * The caller surfaces the failure and the user retries.
 *
 * Shared by gdpr.deleteAccount and the Clerk `user.deleted` webhook so that a deletion
 * started from either side erases the same things.
 */
export async function eraseUserAndStorage(db: DB, userId: string): Promise<number> {
  const docs = await db
    .select({ key: userDocuments.storageKey })
    .from(userDocuments)
    .where(eq(userDocuments.userId, userId))
  const apps = await db
    .select({ cv: applications.cvStorageKey, cl: applications.coverLetterStorageKey })
    .from(applications)
    .where(eq(applications.userId, userId))

  const keys = collectErasureKeys(docs, apps)
  const results = await Promise.allSettled(keys.map((k) => deleteObject(k)))
  const failed = results.filter((r) => r.status === "rejected").length
  if (failed > 0) {
    throw new Error(
      `Storage erasure failed for ${failed}/${keys.length} objects — aborting before the DB row is removed so the keys are not lost.`,
    )
  }

  await db.delete(users).where(eq(users.id, userId))
  return keys.length
}
