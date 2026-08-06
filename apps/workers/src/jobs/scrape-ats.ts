import { ATS_ADAPTERS } from "../scrapers/ats"
import { ATS_COMPANIES } from "../scrapers/ats-companies"
import { type JobRecord, saveJobs, sleep } from "../scrapers/base"
import { normalizeJob } from "../scrapers/normalizer"

const SOURCE = "company_ats" as const

/**
 * Beta scope, same as the other sources: Berlin or remote. Applied to the ATS's own
 * location string only — an empty location is dropped rather than defaulted to Berlin,
 * because a global Workday board would otherwise dump every city into the Berlin deck.
 */
const IN_SCOPE = /berlin|remote/i

/** Abandoned demo boards still serve their template text — never show it as a real job. */
const PLACEHOLDER = /lorem ipsum|consetetur sadipscing/i

const COMPANY_DELAY_MS = 2000

/**
 * Pulls every company in the ATS registry straight from its career-page feed.
 * A failing company is logged and skipped — one dead board never sinks the cycle.
 */
export async function scrapeAts(): Promise<JobRecord[]> {
  const seen = new Set<string>()
  const collected: JobRecord[] = []

  for (const { company, ats, token } of ATS_COMPANIES) {
    try {
      const postings = await ATS_ADAPTERS[ats](token)
      let kept = 0

      for (const p of postings) {
        if (!IN_SCOPE.test(p.location) || PLACEHOLDER.test(p.description)) continue
        const record = normalizeJob({
          title: p.title,
          company, // canonical registry name — ATS feeds spell it inconsistently
          location: p.location,
          sourceUrl: p.url,
          source: SOURCE,
          description: p.description,
        })
        if (!record || seen.has(record.externalId)) continue
        seen.add(record.externalId)
        collected.push(record)
        kept++
      }
      console.log(`[${SOURCE}] ${company} (${ats}): ${kept}/${postings.length} in scope`)
    } catch (err) {
      console.warn(`[${SOURCE}] ${company} (${ats}/${token}) failed:`, (err as Error).message)
    }
    await sleep(COMPANY_DELAY_MS)
  }

  await saveJobs(collected)
  console.log(`[${SOURCE}] saved ${collected.length} jobs from ${ATS_COMPANIES.length} companies`)
  return collected
}
