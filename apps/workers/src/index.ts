import "./env" // MUST be first — loads .env.local before any client reads process.env
import { Worker } from "bullmq"
import { embedPendingJobs } from "./jobs/embed-jobs"
import { type ExtractProfileJob, extractProfile } from "./jobs/extract-profile"
import { scrapeBerlinStartupJobs } from "./jobs/scrape-berlin-startup-jobs"
import { scrapeJobicco } from "./jobs/scrape-jobicco"
import { scrapeStellenticket } from "./jobs/scrape-stellenticket"
import { getConnection, getEmbeddingQueue, getScraperQueue } from "./queues"

const SCRAPERS = {
  berlin_startup_jobs: scrapeBerlinStartupJobs,
  stellenticket: scrapeStellenticket,
  jobicco: scrapeJobicco,
} as const

type SourceKey = keyof typeof SCRAPERS

const workers: Worker[] = []

async function main() {
  console.log("Agora workers starting…")
  await getConnection().ping()
  console.log("Redis connected")

  // ── Scraper worker ────────────────────────────────────────────────────────
  const scraperWorker = new Worker(
    "job-scraper",
    async (job) => {
      const sources = (job.data?.sources as SourceKey[]) ?? (Object.keys(SCRAPERS) as SourceKey[])
      let totalNew = 0
      for (const source of sources) {
        const scrape = SCRAPERS[source]
        if (!scrape) {
          console.warn(`Unknown source "${source}" — skipping`)
          continue
        }
        try {
          const records = await scrape()
          totalNew += records.length
          console.log(`[${source}] scraped ${records.length} jobs`)
        } catch (err) {
          // Skip a failing source — never abort the whole cycle (spec: capture + continue).
          console.error(`[${source}] scrape failed:`, err)
        }
      }

      if (totalNew === 0) {
        // TODO(Agent 1 observability): forward to Sentry as a warning.
        console.warn("Scrape cycle: 0 new jobs — check source availability")
      }

      // Chain embedding after the full scrape cycle (never per-job inline).
      await getEmbeddingQueue().add("embed-new-jobs", {}, { removeOnComplete: 5, removeOnFail: 10 })
      return { totalNew }
    },
    { connection: getConnection(), concurrency: 1 },
  )
  scraperWorker.on("failed", (job, err) => console.error(`scrape job ${job?.id} failed:`, err))
  workers.push(scraperWorker)

  // ── Embedding worker ──────────────────────────────────────────────────────
  const embeddingWorker = new Worker(
    "job-embedding",
    async () => {
      const count = await embedPendingJobs()
      console.log(`Embedded ${count} jobs`)
      return { embedded: count }
    },
    { connection: getConnection(), concurrency: 1 },
  )
  embeddingWorker.on("failed", (job, err) => console.error(`embed job ${job?.id} failed:`, err))
  workers.push(embeddingWorker)

  // ── Profile-extraction worker (Agent 4): CV → PII-free profile + embedding ──
  const profileWorker = new Worker(
    "profile-extract",
    async (job) => {
      await extractProfile(job.data as ExtractProfileJob)
      console.log(`Extracted profile for user ${(job.data as ExtractProfileJob).userId}`)
    },
    { connection: getConnection(), concurrency: 2 },
  )
  profileWorker.on("failed", (job, err) => console.error(`profile job ${job?.id} failed:`, err))
  workers.push(profileWorker)

  // ── Nightly repeat: 02:00 Europe/Berlin (tz CRITICAL — UTC breaks on DST) ───
  await getScraperQueue().add(
    "nightly-scrape",
    { sources: Object.keys(SCRAPERS) },
    {
      jobId: "nightly-scrape", // idempotent — one scheduled instance
      repeat: { pattern: "0 2 * * *", tz: "Europe/Berlin" },
      removeOnComplete: 5,
      removeOnFail: 10,
    },
  )

  console.log(
    "Workers ready (scraper + embedding + profile-extract). Nightly scrape scheduled 02:00 Europe/Berlin.",
  )
}

async function shutdown() {
  console.log("Shutting down workers…")
  try {
    await Promise.all(workers.map((w) => w.close()))
    await getConnection().quit()
  } catch {
    // connection may already be closed
  }
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)

main().catch((err) => {
  console.error("Worker startup failed:", err)
  process.exit(1)
})
