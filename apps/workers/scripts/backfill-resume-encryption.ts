/**
 * One-off backfill: encrypt every legacy plaintext `resumes.content` row.
 *
 * Enabling FIELD_ENCRYPTION_ENABLED only encrypts rows written *after* the flag flips.
 * Without this, every résumé that already exists stays plaintext forever and "encrypted at
 * rest" would be a claim that is false for exactly the users who have been here longest.
 *
 * Safe to interrupt and re-run: `isEncryptedField` skips rows that are already envelopes,
 * so a second pass is a no-op over the work the first pass completed.
 *
 * Usage:
 *   FIELD_ENCRYPTION_ENABLED=true pnpm --filter @agora/workers exec tsx \
 *     scripts/backfill-resume-encryption.ts [--dry-run]
 *
 * Read docs/Security/FIELD-ENCRYPTION.md before running this against production.
 */

import { encryptField, isEncryptedField } from "@agora/ai"
import { getDb } from "@agora/db"
import { resumes } from "@agora/db/schema"
import { eq } from "drizzle-orm"

const DRY_RUN = process.argv.includes("--dry-run")

async function main() {
  if (process.env.FIELD_ENCRYPTION_ENABLED !== "true") {
    throw new Error(
      "FIELD_ENCRYPTION_ENABLED must be 'true' to run the backfill — otherwise the app " +
        "would write plaintext straight back over the rows this encrypts.",
    )
  }

  const db = getDb()
  const rows = await db.select({ id: resumes.id, content: resumes.content }).from(resumes)

  let encrypted = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    if (isEncryptedField(row.content)) {
      skipped++
      continue
    }
    try {
      const envelope = await encryptField(row.content)
      if (!DRY_RUN) {
        // Row-at-a-time on purpose. A bulk UPDATE would need every envelope held in memory
        // first, and a failure partway would leave no record of how far it got. One row per
        // statement means an interrupted run is simply a shorter run.
        await db.update(resumes).set({ content: envelope }).where(eq(resumes.id, row.id))
      }
      encrypted++
    } catch (err) {
      failed++
      // Log the id, never the content — that is the plaintext this whole script exists to
      // remove from places it should not be.
      console.error(`FAILED resume ${row.id}:`, err instanceof Error ? err.message : err)
    }
  }

  console.info(
    JSON.stringify({
      event: "resume_encryption_backfill",
      dryRun: DRY_RUN,
      total: rows.length,
      encrypted,
      alreadyEncrypted: skipped,
      failed,
    }),
  )

  if (failed > 0) {
    console.error(`${failed} row(s) failed — re-run to retry only those.`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
