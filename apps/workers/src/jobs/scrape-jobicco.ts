import { CheerioCrawler, purgeDefaultStorages } from "crawlee"
import { type JobRecord, RATE_LIMIT_MS, baseCrawlerConfig, saveJobs, sleep } from "../scrapers/base"
import { normalizeJob } from "../scrapers/normalizer"

const SOURCE = "jobicco" as const

// Student / short-term Berlin jobs (static HTML). The listing lives on the site root —
// /jobs/ is 404, and /jobs/<uuid> are the detail pages. Use the www host: the apex
// redirects there, and enqueueLinks' same-hostname default needs the final host.
const START_URLS = ["https://www.jobicco.berlin/"]

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
        // Everything lives inside the #vacancy turbo-frame — the page-level h1 is the
        // site logo and .trix-content also matches two footer blocks, so scope to it.
        const title = $("#vacancy h1").first().text()
        const company = $("#vacancy h2").first().text()
        const description = $("#vacancy .trix-content").first().html() || ""

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
        // Single-page board (pagy nav renders one page), so no LIST pagination to follow.
        await enqueueLinks({ selector: 'a[href^="/jobs/"]', label: "DETAIL" })
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
