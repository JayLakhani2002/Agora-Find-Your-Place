import "../src/env"
import { embedPendingJobs } from "../src/jobs/embed-jobs"
// Backfills embeddings for every job with jobEmbedding IS NULL. Safe to re-run.
async function main() {
  const n = await embedPendingJobs()
  console.log(`Embedded ${n} jobs`)
  process.exit(0)
}
main()
