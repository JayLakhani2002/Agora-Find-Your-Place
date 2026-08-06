import "./env" // MUST be first — loads .env.local before any client reads process.env
import { Worker } from "bullmq"
import { embedPendingJobs } from "./jobs/embed-jobs"
import { type ExtractProfileJob, extractProfile } from "./jobs/extract-profile"
import { type GenerateDocumentsJob, generateDocuments } from "./jobs/generate-documents"
import { type GenerateFollowUpJob, generateFollowUpDraft } from "./jobs/generate-followup"
import { type GenerateQuestionsJob, generateQuestions } from "./jobs/generate-questions"
import { scrapeArbeitnow } from "./jobs/scrape-arbeitnow"
import { scrapeArbeitsagentur } from "./jobs/scrape-arbeitsagentur"
import { scrapeAts } from "./jobs/scrape-ats"
import { scrapeBerlinStartupJobs } from "./jobs/scrape-berlin-startup-jobs"
import { scrapeJobicco } from "./jobs/scrape-jobicco"
import { scrapeTuBerlin } from "./jobs/scrape-tu-berlin"
import { getConnection, getEmbeddingQueue, getScraperQueue } from "./queues"
import { deactivateStaleJobs } from "./scrapers/base"

const SCRAPERS = {
  arbeitsagentur: scrapeArbeitsagentur,
  arbeitnow: scrapeArbeitnow,
  berlin_startup_jobs: scrapeBerlinStartupJobs,
  tu_berlin: scrapeTuBerlin,
  jobicco: scrapeJobicco,
  company_ats: scrapeAts,
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
          // Retire postings this source no longer returns. Runs only inside the try,
          // and only when the scrape actually produced rows, so a failed or empty
          // fetch can never mass-deactivate a healthy source.
          const retired = await deactivateStaleJobs(source, records.length)
          console.log(
            `[${source}] scraped ${records.length} jobs${retired > 0 ? `, retired ${retired} stale` : ""}`,
          )
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
      // attempts/backoff matter: a single Bedrock throttle used to fail the job with no
      // retry, leaving the newest jobs unembedded — and therefore invisible to matching —
      // until the next nightly cycle.
      await getEmbeddingQueue().add(
        "embed-new-jobs",
        {},
        {
          removeOnComplete: 5,
          removeOnFail: 10,
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
        },
      )
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

  // ── Generation worker (Agent 6): CV + CL + eval + auto-regenerate ──────────
  const generationWorker = new Worker(
    "ai-generation",
    async (job) => {
      if (job.name === "generate_documents") {
        const result = await generateDocuments(job.data as GenerateDocumentsJob)
        console.log(
          `Generated documents for ${(job.data as GenerateDocumentsJob).applicationId} ` +
            `(attempt ${result.attempt}, cv ${result.cvOverall.toFixed(1)})`,
        )
        return result
      }
      if (job.name === "generate_questions") {
        const questions = await generateQuestions(job.data as GenerateQuestionsJob)
        return { questions }
      }
      throw new Error(`Unknown ai-generation job name: ${job.name}`)
    },
    // Generation is the hot path (target < ~15s) — allow a little parallelism,
    // but each job already fans out (2 Sonnet + up to 10 Haiku calls).
    { connection: getConnection(), concurrency: 2 },
  )
  generationWorker.on("failed", (job, err) =>
    console.error(`generation job ${job?.id} failed:`, err),
  )
  workers.push(generationWorker)

  // ── Follow-up worker (Agent 6): day-10 draft if still submitted ────────────
  const followUpWorker = new Worker(
    "follow-up",
    async (job) => {
      const result = await generateFollowUpDraft(job.data as GenerateFollowUpJob)
      console.log(
        `Follow-up for ${(job.data as GenerateFollowUpJob).applicationId}: ${result.generated ? "draft generated" : "skipped (status moved on or draft exists)"}`,
      )
      return result
    },
    { connection: getConnection(), concurrency: 2 },
  )
  followUpWorker.on("failed", (job, err) => console.error(`follow-up job ${job?.id} failed:`, err))
  workers.push(followUpWorker)

  // ── Nightly repeat: 02:00 Europe/Berlin (tz CRITICAL — UTC breaks on DST) ───
  const nightlySources = (Object.keys(SCRAPERS) as SourceKey[]).filter((s) => s !== "company_ats")
  await getScraperQueue().add(
    "nightly-scrape",
    { sources: nightlySources },
    {
      jobId: "nightly-scrape", // idempotent — one scheduled instance
      repeat: { pattern: "0 2 * * *", tz: "Europe/Berlin" },
      removeOnComplete: 5,
      removeOnFail: 10,
    },
  )

  // Career-page feeds run hourly, not nightly — being first to a new posting is the
  // whole point of reading company ATSes directly. Cost is one cheap API call per company.
  await getScraperQueue().add(
    "ats-scrape",
    { sources: ["company_ats"] },
    {
      jobId: "ats-scrape",
      repeat: { pattern: "7 * * * *", tz: "Europe/Berlin" },
      removeOnComplete: 5,
      removeOnFail: 10,
    },
  )

  console.log(
    "Workers ready (scraper + embedding + profile-extract + generation + follow-up). " +
      "Nightly scrape 02:00 Europe/Berlin; company career-page (ATS) scrape hourly.",
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
