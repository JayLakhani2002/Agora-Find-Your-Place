/**
 * Build-time live-data fetch (BUILD-GUIDE §6). Runs as `prebuild`.
 *
 * SELECT-only. Reads DATABASE_URL from the repo-root .env.local (or the ambient env on
 * Vercel), writes src/content/live-data.json, and NEVER prints the connection string —
 * every error goes through `redact()` first.
 *
 * Graceful fallback: if DATABASE_URL is missing or a query fails, the existing committed
 * snapshot is left untouched and the build continues with a loud warning. Local builds
 * and CI therefore never break on a DB outage.
 *
 * Only public listing facts are read (title, company, terms, source). No user data — the
 * queries never touch a user-linked table.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { neon } from "@neondatabase/serverless"
import { COMPANY_DOMAINS } from "./company-domains.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, "../src/content/live-data.json")
const ENV_FILE = resolve(here, "../../../.env.local")

const FEED_SIZE = 24
const COMPANY_WALL_SIZE = 22
const LOGO_DIR = resolve(here, "../public/img/logos")

/**
 * Download an employer's logo once, at build time, and serve it from our own origin.
 *
 * Deliberately NOT a runtime call: hotlinking a third-party logo service would leak every
 * visitor's IP to that service on page load, which is exactly the kind of silent
 * third-party request a GDPR-first site should not make. Fetching here means the browser
 * only ever talks to us.
 *
 * Returns the public path, or null — a company without a logo renders as a text mark, and
 * that is a supported state rather than a failure. Never throws: a logo is decoration, and
 * it must not be able to break a build.
 */
async function fetchLogo(company: string): Promise<string | null> {
  const domain = COMPANY_DOMAINS[company]
  if (!domain) return null

  const file = `${domain.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`
  const dest = resolve(LOGO_DIR, file)
  const publicPath = `/img/logos/${file}`
  if (existsSync(dest)) return publicPath

  try {
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    // A 16px default-globe placeholder comes back tiny; treat that as "no logo".
    if (buf.byteLength < 700) return null
    mkdirSync(LOGO_DIR, { recursive: true })
    writeFileSync(dest, buf)
    return publicPath
  } catch {
    return null
  }
}
/**
 * `seed` is local test data, not a real scraper. It must never be counted as a source or
 * shown as a listing — that would be a fabricated number on a page that claims real ones.
 */
const EXCLUDED_SOURCES = ["seed"]

function loadDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  try {
    const line = readFileSync(ENV_FILE, "utf8")
      .split("\n")
      .find((l) => l.trimStart().startsWith("DATABASE_URL="))
    if (!line) return undefined
    return line
      .slice(line.indexOf("=") + 1)
      .trim()
      .replace(/^["']|["']$/g, "")
  } catch {
    return undefined
  }
}

/** Strip the connection string (and any password-shaped token) out of anything we print. */
function redact(value: unknown, secret?: string): string {
  let text = value instanceof Error ? `${value.name}: ${value.message}` : String(value)
  if (secret) text = text.split(secret).join("[REDACTED]")
  return text.replace(/postgres(ql)?:\/\/[^\s"']+/gi, "[REDACTED]")
}

const url = loadDatabaseUrl()

if (!url) {
  console.warn(
    "[live-data] DATABASE_URL not set — keeping the committed live-data.json snapshot.\n" +
      "[live-data] Numbers on the site will be as fresh as the last successful fetch.",
  )
  process.exit(0)
}

try {
  const sql = neon(url)

  const [totals] = (await sql`
    SELECT
      count(*)::int AS active_jobs,
      count(*) FILTER (WHERE location ILIKE '%berlin%')::int AS berlin_jobs,
      count(DISTINCT company)::int AS companies,
      max(scraped_at) AS latest_scraped_at
    FROM jobs
    WHERE is_active = true AND source <> ALL(${EXCLUDED_SOURCES})
  `) as {
    active_jobs: number
    berlin_jobs: number
    companies: number
    latest_scraped_at: string | null
  }[]

  const sources = (await sql`
    SELECT source, count(*)::int AS count, max(scraped_at) AS latest_scraped_at
    FROM jobs
    WHERE is_active = true AND source <> ALL(${EXCLUDED_SOURCES})
    GROUP BY source
    ORDER BY count DESC
  `) as { source: string; count: number; latest_scraped_at: string | null }[]

  // How many rows the most recent nightly run brought in. Used for the `01 · Find` receipt,
  // so that number is measured rather than asserted.
  const [batch] = (await sql`
    SELECT count(*)::int AS rows
    FROM jobs
    WHERE is_active = true
      AND source <> ALL(${EXCLUDED_SOURCES})
      AND scraped_at >= (
        SELECT max(scraped_at) - interval '2 hours' FROM jobs
        WHERE is_active = true AND source <> ALL(${EXCLUDED_SOURCES})
      )
  `) as { rows: number }[]

  /**
   * Curated feed for the theater + listing ticker: Berlin (the launch city), one row per
   * company, ALL contract types now (§6 — the audience is every job seeker, not students),
   * `unknown`-classified rows dropped, titles ≤ 60 chars so a chip never wraps oddly.
   * Round-robin across sources (row_number partitioned by source, then ordered by rank)
   * so the ticker never turns into 24 rows from whichever scraper ran last. Within a
   * source, rows carrying real terms come first — they are what makes the theater concrete.
   */
  const feed = (await sql`
    SELECT title, company, location, contract_type, hours_per_week, hourly_rate,
           german_level_required, source, scraped_at
    FROM (
      SELECT t.*, row_number() OVER (
        PARTITION BY source ORDER BY (hours_per_week IS NOT NULL) DESC, scraped_at DESC
      ) AS rn
      FROM (
        SELECT DISTINCT ON (company)
          title, company, location, contract_type, hours_per_week, hourly_rate,
          german_level_required, source, scraped_at
        FROM jobs
        WHERE is_active = true
          AND source <> ALL(${EXCLUDED_SOURCES})
          AND char_length(title) <= 60
          AND company <> ''
          AND lower(company) <> 'unknown'
          AND lower(title) <> 'unknown'
          AND contract_type IS NOT NULL
          AND lower(contract_type::text) <> 'unknown'
          AND location ILIKE '%berlin%'
        ORDER BY company, scraped_at DESC
      ) t
    ) r
    ORDER BY rn, source
    LIMIT ${FEED_SIZE}
  `) as {
    title: string
    company: string
    location: string
    contract_type: string
    hours_per_week: number | null
    hourly_rate: number | null
    german_level_required: string | null
    source: string
    scraped_at: string
  }[]

  /**
   * Proof wall (§4.2): companies with the most live roles in the index right now, across
   * the whole index rather than Berlin only. These are text-marks of REAL indexed
   * employers — the UI labels them as exactly that and never as partners or as companies
   * that hired anyone. Agency-style aggregator rows are dropped: their listings are real,
   * but the name on the wall would not be the employer a reader thinks it is.
   */
  const candidates = (await sql`
    SELECT company, count(*)::int AS roles
    FROM jobs
    WHERE is_active = true
      AND source <> ALL(${EXCLUDED_SOURCES})
      AND company <> ''
      AND lower(company) <> 'unknown'
      AND char_length(company) BETWEEN 3 AND 60
      AND company !~* '(zeitarbeit|personaldienst|personalservice|recruit|staffing|vermittlung)'
    GROUP BY company
    ORDER BY roles DESC, company ASC
    LIMIT 150
  `) as { company: string; roles: number }[]

  /**
   * Order the wall so employers with a verified logo come first.
   *
   * This is a PRESENTATION choice, not a truth claim: every name here still has to come
   * back from the query above, so the wall can only ever contain companies with live roles
   * in the index right now. Sorting by "do we have a logo" just stops the wall being a row
   * of obscure agency names when Zalando, BVG and TU Berlin are also in there.
   */
  const withLogo = candidates.filter((c) => COMPANY_DOMAINS[c.company])
  const withoutLogo = candidates.filter((c) => !COMPANY_DOMAINS[c.company])
  const companies = [...withLogo, ...withoutLogo].slice(0, COMPANY_WALL_SIZE)

  if (!feed.length)
    throw new Error("query returned an empty feed — refusing to write an empty file")
  if (companies.length < 16)
    throw new Error("company wall came back under 16 names — refusing to write a thin file")

  const payload = {
    generatedAt: new Date().toISOString(),
    totals: {
      activeJobs: totals.active_jobs,
      berlinJobs: totals.berlin_jobs,
      companies: totals.companies,
      latestScrapedAt: totals.latest_scraped_at,
      latestBatch: batch.rows,
    },
    sources: sources.map((s) => ({
      source: s.source,
      count: s.count,
      latestScrapedAt: s.latest_scraped_at,
    })),
    feed: feed.map((j) => ({
      title: j.title,
      company: j.company,
      location: j.location,
      contractType: j.contract_type,
      hoursPerWeek: j.hours_per_week,
      hourlyRate: j.hourly_rate,
      germanLevel: j.german_level_required,
      source: j.source,
      scrapedAt: j.scraped_at,
    })),
    // Some feeds append a language artefact to the employer name ("Wolt - English"), and
    // TU Berlin's feed contains soft hyphens. Both are scraper metadata, not the name.
    companies: await Promise.all(
      companies.map(async (c) => ({
        name: c.company.replace(/­/g, "").replace(/\s+-\s+(English|Deutsch|German)$/i, ""),
        roles: c.roles,
        logo: await fetchLogo(c.company),
      })),
    ),
  }

  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(
    `[live-data] wrote ${feed.length} listings · ${companies.length} wall companies · ` +
      `${payload.totals.activeJobs} active jobs · ${sources.length} sources · ` +
      `last batch ${payload.totals.latestBatch}`,
  )
} catch (error) {
  console.warn(`[live-data] fetch failed, keeping the committed snapshot: ${redact(error, url)}`)
  process.exit(0)
}
