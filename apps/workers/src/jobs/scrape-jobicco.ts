import { CheerioCrawler, purgeDefaultStorages } from "crawlee"
import { type JobRecord, RATE_LIMIT_MS, baseCrawlerConfig, saveJobs, sleep } from "../scrapers/base"
import { normalizeJob } from "../scrapers/normalizer"

const SOURCE = "jobicco" as const

// Student / short-term Berlin jobs (static HTML).
const START_URLS = ["https://jobicco.berlin/jobs/"]

/**
 * Scrapes jobicco Berlin (static HTML → Cheerio). LIST → DETAIL. Returns normalized JobRecord[].
 */
export async function scrapeJobicco(): Promise<JobRecord[]> {
  const collected: JobRecord[] = []
  const seen = new Set<string>()

  // Reset Crawlee's process-level default storage — otherwise the nightly repeat
  // sees the same start URLs as already-handled and scrapes 0 jobs on re-run.
  await purgeDefaultStorages()

  const crawler = new CheerioCrawler({
    ...baseCrawlerConfig,
    async requestHandler({ $, request, enqueueLinks }) {
      if (request.label === "DETAIL") {
        const title = $("h1").first().text()
        const company = $(".job-company, .company").first().text()
        const description = $(".job-description, .entry-content, article").html() || ""

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
        await enqueueLinks({
          selector: ".job-listing a, .job-item a, article h2 a",
          label: "DETAIL",
        })
        await enqueueLinks({ selector: "a.next.page-numbers, a[rel='next']", label: "LIST" })
      }
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
