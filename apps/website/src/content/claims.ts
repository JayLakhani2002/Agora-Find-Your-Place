import { berlinDate, berlinTime, liveData } from "./live-data"

/**
 * SINGLE SOURCE OF TRUTH for every number the site prints.
 *
 * Rule (BUILD-GUIDE §3, legally binding — German UWG treats fabricated counts as
 * actionable): no number ships unless this file can point at the system of record.
 *
 * Counts marked `live` are read from `live-data.json`, regenerated from the `jobs` table
 * on every build by `scripts/fetch-live-data.mts`. They are never hand-edited. There are
 * deliberately NO user counts, hire counts or ratings here — those do not exist yet, so
 * they cannot appear on the page.
 */

type Claim = {
  value: string
  /** Where the number lives. A human must be able to open this and check. */
  source: string
  status: "live" | "verified"
  checkedOn: string
}

const generatedOn = liveData.generatedAt.slice(0, 10)

export const claims = {
  /** Active listings across every real source (the local `seed` fixture is excluded). */
  activeListings: {
    value: String(liveData.totals.activeJobs),
    source: "jobs table · is_active = true · source <> 'seed' → live-data.json",
    status: "live",
    checkedOn: generatedOn,
  },

  /** Of those, the ones in Berlin — the launch city. */
  berlinListings: {
    value: String(liveData.totals.berlinJobs),
    source: "jobs table · location ILIKE '%berlin%' → live-data.json",
    status: "live",
    checkedOn: generatedOn,
  },

  /** Distinct employers with at least one active listing. Drives the numbers band. */
  companiesIndexed: {
    value: String(liveData.totals.companies),
    source: "count(distinct jobs.company) · is_active = true → live-data.json",
    status: "live",
    checkedOn: generatedOn,
  },

  /** Real scrapers, counted from the data rather than asserted. */
  sourcesIndexed: {
    value: String(liveData.sources.length),
    source: "distinct jobs.source (excluding the local `seed` fixture) → live-data.json",
    status: "live",
    checkedOn: generatedOn,
  },

  /**
   * When the last nightly run finished, in Berlin time. The site says "nightly" and shows
   * this clock rather than a round number, because this one is measured.
   */
  lastScan: {
    value: berlinTime(liveData.totals.latestScrapedAt),
    source: "max(jobs.scraped_at), rendered in Europe/Berlin → live-data.json",
    status: "live",
    checkedOn: generatedOn,
  },

  /** The date of that run, spelled out. Pairs with `lastScan` under the numbers band. */
  lastScanDate: {
    value: berlinDate(liveData.totals.latestScrapedAt),
    source: "max(jobs.scraped_at), rendered in Europe/Berlin → live-data.json",
    status: "live",
    checkedOn: generatedOn,
  },

  /** Rows the most recent nightly run brought in. Drives the `01 · Find` receipt. */
  latestBatch: {
    value: String(liveData.totals.latestBatch),
    source: "jobs scraped within 2h of max(scraped_at) → live-data.json",
    status: "live",
    checkedOn: generatedOn,
  },

  /** Dimensions each generated document is graded on before the user reads it. */
  scoreDimensions: {
    value: "6",
    source: "packages/ai → document eval rubric (names in en.frames.scoreDimensions)",
    status: "verified",
    checkedOn: "2026-08-04",
  },

  /** Automated tests covering the work-permit and eligibility rules. From a real run. */
  legalTests: {
    value: "374",
    source: "packages/legal/tests → vitest reported test count",
    status: "verified",
    checkedOn: "2026-08-04",
  },
} as const satisfies Record<string, Claim>
