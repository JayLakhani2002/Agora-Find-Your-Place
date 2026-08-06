import { COHERE_BATCH_LIMIT, embedJobsBatch } from "@agora/ai"
import { getDb, jobs } from "@agora/db"
import { eq, isNull, sql } from "drizzle-orm"

/**
 * Embeds every job whose embedding IS NULL, in batches of ≤96 (Cohere's cap).
 * Runs AFTER the full scrape cycle — never per-job inline. Returns count embedded.
 *
 * Embedding text = title + company + description (the same surface Agent 5 matches against).
 */
export async function embedPendingJobs(): Promise<number> {
  const db = getDb()

  const pending = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      description: jobs.description,
    })
    .from(jobs)
    .where(isNull(jobs.jobEmbedding))

  if (pending.length === 0) return 0

  let embeddedCount = 0
  let failedBatches = 0
  for (let i = 0; i < pending.length; i += COHERE_BATCH_LIMIT) {
    const batch = pending.slice(i, i + COHERE_BATCH_LIMIT)
    // Cohere on Bedrock caps each text at 2048 chars — title+company+lead of the
    // description carries the match signal; the tail rarely adds ranking value.
    const texts = batch.map((j) => `${j.title}\n${j.company}\n${j.description}`.slice(0, 2048))

    // One throttled batch used to abort the whole pass, stranding every later job with
    // a NULL embedding. Batches are independent and the query is `IS NULL`, so skipping
    // a bad one and continuing is safe — the next run retries exactly what's left.
    let vectors: number[][]
    try {
      vectors = await embedJobsBatch(texts)
    } catch (err) {
      failedBatches++
      console.error(`embedPendingJobs: batch at offset ${i} failed, continuing:`, err)
      continue
    }
    if (vectors.length !== batch.length) {
      failedBatches++
      console.error(`embedPendingJobs: got ${vectors.length} vectors for ${batch.length} jobs`)
      continue
    }

    // Update each row with its 1024-dim vector. Per-row update keyed by id.
    for (let k = 0; k < batch.length; k++) {
      const row = batch[k]
      const vector = vectors[k]
      if (!row || !vector) continue
      await db.update(jobs).set({ jobEmbedding: vector }).where(eq(jobs.id, row.id))
      embeddedCount++
    }
  }

  // Surface a partial pass so BullMQ's retry (attempts: 3) picks up the remainder
  // instead of the cycle reporting success with jobs still unembedded.
  if (failedBatches > 0 && embeddedCount === 0) {
    throw new Error(`embedPendingJobs: all ${failedBatches} batches failed`)
  }
  if (failedBatches > 0) {
    console.warn(`embedPendingJobs: embedded ${embeddedCount}, ${failedBatches} batch(es) deferred`)
  }

  return embeddedCount
}
