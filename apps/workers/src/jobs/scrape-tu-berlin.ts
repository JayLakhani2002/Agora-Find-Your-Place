import { CheerioCrawler, purgeDefaultStorages } from "crawlee"
import {
  type ContractType,
  type JobRecord,
  RATE_LIMIT_MS,
  baseCrawlerConfig,
  saveJobs,
  sleep,
} from "../scrapers/base"
import { inferRequiresEnrollment } from "../scrapers/classifier"
import { normalizeJob } from "../scrapers/normalizer"

const SOURCE = "tu_berlin" as const

/**
 * The portal hyphenates long German words with soft hyphens (U+00AD). They are invisible
 * but real characters, so "Tech­ni­sche Uni­ver­si­tät Ber­lin" never matches a search for
 * "Technische Universität Berlin" — and they would poison the dedup hash. Strip them.
 */
export const unsoften = (s: string) => s.replace(/­/g, "")

// TU Berlin's official Stellenticket portal (static HTML → Cheerio). This replaces the
// old `stellenticket` scraper: stellenticket.de itself is the vendor's marketing site and
// has no public board — the job data lives on the per-university portals like this one.
const START_URLS = ["https://stellenticket.tu-berlin.de/stellenangebote"]

/**
 * Contract type from the portal's own "Fakten" → Kategorie field. This is a structured,
 * publisher-set value (same idea as BA's flags), NOT text guessing — so we never fall
 * through to classifyContractType, whose default would label everything "werkstudent".
 *
 * The portal carries 33 categories, most of which are not student employment at all
 * (Abschlussarbeit, Stipendienprogramm, Professur, Postdoc, Messe, Wettbewerb …).
 * Returning null for those means "not determined" and the caller drops the row rather
 * than inventing a contract type. Once the contract_type enum gains an "unknown" member,
 * this can return that instead of null and the rows can be kept.
 */
export function contractFromKategorie(kategorie: string): ContractType | null {
  const k = kategorie.toLowerCase()
  // Ads are published in German OR English, and one cell can carry several categories
  // ("Studentische Hilfskraft, Werkstudent*in") — werkstudent is tested first so it wins
  // a combined cell. "Wissenschaftliche Mitarbeiter*in" (academic staff) must NOT match
  // the "wissenschaftliche hilfskraft" (student assistant) rule.
  if (/werkstudent|working student/.test(k)) return "werkstudent"
  if (/studentische hilfskraft|student assistant/.test(k)) return "werkstudent"
  if (/studentische verwaltungskraft|student administrative assistant/.test(k)) return "werkstudent"
  if (/wissenschaftliche hilfskraft/.test(k)) return "werkstudent"
  // "Praktikum (für Studierende/Graduierte)" / "Internship (for students/graduates)".
  if (/praktikum|internship/.test(k)) return "praktikum"
  return null
}

/**
 * Scrapes the TU Berlin Stellenticket portal. LIST → DETAIL, then walks the portal's own
 * `rel="next"` chain so both namespaces (non_science / science) are covered beyond the
 * 20 rows each that the landing page renders. Returns normalized JobRecord[].
 */
export async function scrapeTuBerlin(): Promise<JobRecord[]> {
  const collected: JobRecord[] = []
  const seen = new Set<string>()
  // Kategorie values we saw but could not map — reported so undetermined rows stay visible.
  const undetermined = new Map<string, number>()

  // Reset Crawlee's process-level default storage — otherwise the nightly repeat
  // sees the same start URLs as already-handled and scrapes 0 jobs on re-run.
  await purgeDefaultStorages()

  const crawler = new CheerioCrawler({
    ...baseCrawlerConfig,
    async requestHandler({ $, request, enqueueLinks }) {
      if (request.label === "DETAIL") {
        // Scope everything to <main>: the page header carries its own h1s
        // ("Stellenticket Portale") that would otherwise win .first().
        const faktum = (label: string) =>
          $("main th")
            .filter((_, el) => $(el).text().replace(/\s+/g, " ").trim() === label)
            .first()
            .next("td")
            .text()
            .replace(/\s+/g, " ")
            .trim()
        const faktumClean = (label: string) => unsoften(faktum(label))

        // English-language ads label the same row "Category".
        const kategorie = faktum("Kategorie") || faktum("Category")
        const contractType = contractFromKategorie(kategorie)
        if (!contractType) {
          undetermined.set(
            kategorie || "(none)",
            (undetermined.get(kategorie || "(none)") ?? 0) + 1,
          )
        } else {
          const blocks = $("main .autoformat")
          const title = unsoften($("main h1").first().text())
          // Block 0 is the employer name; the rest are the advert body sections.
          const company = unsoften(blocks.first().text())
          const description = unsoften(
            blocks
              .slice(1)
              .map((_, el) => $(el).text())
              .get()
              .join("\n\n"),
          )

          const record = normalizeJob({
            title,
            company,
            // "Deutschland, Berlin" → keep the portal's value, else the Berlin default.
            location: faktumClean("Standort") || faktumClean("Location"),
            sourceUrl: request.url,
            source: SOURCE,
            description,
          })
          if (record && !seen.has(record.externalId)) {
            // Override the text-classifier guess with the portal's structured signal.
            record.contractType = contractType
            record.requiresEnrollment = inferRequiresEnrollment(contractType)
            seen.add(record.externalId)
            collected.push(record)
          }
        }

        // Walk the portal's own next-offer chain — the landing page only lists 20 per
        // namespace, this reaches the rest.
        // ponytail: baseCrawlerConfig caps the run at 200 requests (~17 min at 1 req/5s),
        // so a run covers ~199 offers, not the whole portal. Raise maxRequestsPerCrawl
        // here if TU Berlin's board grows past that.
        await enqueueLinks({ selector: 'a[rel="next"]', label: "DETAIL" })
      } else {
        // Every job link on the list carries ?namespace=; the nav/filter links do not.
        await enqueueLinks({
          selector: 'a[href*="/stellenangebote/"][href*="namespace="]',
          label: "DETAIL",
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
  console.log(
    `[${SOURCE}] saved ${collected.length} jobs; undetermined Kategorie (skipped): ${JSON.stringify(
      Object.fromEntries(undetermined),
    )}`,
  )
  return collected
}
