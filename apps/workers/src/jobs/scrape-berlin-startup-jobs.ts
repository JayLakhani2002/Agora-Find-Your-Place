import { CheerioCrawler, purgeDefaultStorages } from "crawlee"
import { type JobRecord, RATE_LIMIT_MS, baseCrawlerConfig, saveJobs, sleep } from "../scrapers/base"
import { normalizeJob } from "../scrapers/normalizer"

const SOURCE = "berlin_startup_jobs" as const

// Category listing pages — engineering is the densest student-eligible category for v1.
const START_URLS = [
  "https://berlinstartupjobs.com/engineering/",
  "https://berlinstartupjobs.com/sales-marketing/",
  "https://berlinstartupjobs.com/other-jobs/",
]

/**
 * Scrapes Berlin Startup Jobs (static HTML). Two-stage crawl:
 *  - LIST: a category page → enqueue each job-detail link + the next paginated page
 *  - DETAIL: a single job page → extract, normalize, collect
 * Returns the normalized, deduped-by-externalId JobRecord[] (caller persists + embeds).
 */
export async function scrapeBerlinStartupJobs(): Promise<JobRecord[]> {
  const collected: JobRecord[] = []
  const seen = new Set<string>()

  // Reset Crawlee's process-level default storage — otherwise the nightly repeat
  // sees the same start URLs as already-handled and scrapes 0 jobs on re-run.
  await purgeDefaultStorages()

  const crawler = new CheerioCrawler({
    ...baseCrawlerConfig,
    async requestHandler({ $, request, enqueueLinks }) {
      if (request.label === "DETAIL") {
        const title = $("h1.bjs-jlid__h").first().text() || $("h1").first().text()
        const company = $(".bjs-jlid__top a").first().text() || $(".company-title").first().text()
        const description = $(".bjs-jlid__description").html() || $("article").html() || ""

        const record = normalizeJob({
          title,
          company,
          sourceUrl: request.url,
          source: SOURCE,
          description,
        })
        if (record && !seen.has(record.externalId)) {
          seen.add(record.externalId)
          collected.push(record)
        }
      } else {
        // LIST page: enqueue every job link, then the next page.
        await enqueueLinks({
          selector: "a.bjs-jlid__b, h4.bjs-jlid__h a",
          label: "DETAIL",
        })
        await enqueueLinks({
          selector: "a.next.page-numbers",
          label: "LIST",
        })
      }
      // Hard throttle: 1 req / 5 s per domain.
      await sleep(RATE_LIMIT_MS)
    },
    failedRequestHandler({ request, log }) {
      log.warning(`[${SOURCE}] failed twice: ${request.url}`)
    },
  })

  await crawler.run(START_URLS.map((url) => ({ url, label: "LIST" })))
  await saveJobs(collected)
  return collected
}
