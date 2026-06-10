import { PlaywrightCrawler, purgeDefaultStorages } from "crawlee"
import { type JobRecord, RATE_LIMIT_MS, baseCrawlerConfig, saveJobs, sleep } from "../scrapers/base"
import { normalizeJob } from "../scrapers/normalizer"

const SOURCE = "stellenticket" as const

// Highest Werkstudent density of the three sources — the most important for v1.
// University-partnership target → extra-cautious crawling (robots respected, 1 req / 5 s).
const START_URLS = ["https://www.stellenticket.de/en/jobs/?q=werkstudent&location=Berlin"]

/**
 * Scrapes Stellenticket (JS-rendered → Playwright). LIST → DETAIL, same shape as the
 * Cheerio scrapers but using page locators. Returns normalized JobRecord[].
 */
export async function scrapeStellenticket(): Promise<JobRecord[]> {
  const collected: JobRecord[] = []
  const seen = new Set<string>()

  // Reset Crawlee's process-level default storage — otherwise the nightly repeat
  // sees the same start URLs as already-handled and scrapes 0 jobs on re-run.
  await purgeDefaultStorages()

  const crawler = new PlaywrightCrawler({
    ...baseCrawlerConfig,
    launchContext: { launchOptions: { headless: true } },
    async requestHandler({ page, request, enqueueLinks }) {
      if (request.label === "DETAIL") {
        const title = (await page.locator("h1").first().textContent())?.trim() ?? ""
        const company =
          (
            await page
              .locator('[itemprop="hiringOrganization"], .company-name')
              .first()
              .textContent()
          )?.trim() ?? ""
        const description =
          (await page
            .locator('[itemprop="description"], .job-description, main')
            .first()
            .innerHTML()
            .catch(() => "")) ?? ""

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
        await page
          .waitForSelector("a.job-listing, .joblist a, article a", { timeout: 15000 })
          .catch(() => {})
        await enqueueLinks({ selector: "a.job-listing, .joblist a", label: "DETAIL" })
        await enqueueLinks({ selector: "a.pagination__next, a[rel='next']", label: "LIST" })
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
