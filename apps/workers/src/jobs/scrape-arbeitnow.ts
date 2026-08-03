import { type ContractType, type JobRecord, saveJobs, sleep } from "../scrapers/base"
import { inferRequiresEnrollment } from "../scrapers/classifier"
import { normalizeJob } from "../scrapers/normalizer"

const SOURCE = "arbeitnow" as const

// Arbeitnow public job-board API — no auth, descriptions inline (unlike BA, no detail fetch).
// Germany-wide, so we keep only Berlin + remote to match the beta scope.
const API = "https://www.arbeitnow.com/api/job-board-api"
const PAGES = Number(process.env.AN_PAGES) || 15
const PAGE_DELAY_MS = 3000 // Arbeitnow 429s on faster paging.

interface AnJob {
  slug: string
  title: string
  company_name: string
  description: string // HTML
  location: string
  url: string
  remote: boolean
  job_types: string[]
}

/** Berlin beta scope: on-site Berlin, or remote (valid for a Berlin-based student). */
function inScope(j: AnJob): boolean {
  return /berlin/i.test(j.location ?? "") || j.remote === true
}

/**
 * Contract type from Arbeitnow's (messy, multilingual) job_types + title. Order matters —
 * student signals win over generic part/full-time so werkstudent roles reach the §16b deck.
 */
function anContractType(title: string, jobTypes: string[]): ContractType {
  const hay = `${title} ${jobTypes.join(" ")}`.toLowerCase()
  if (/werkstudent|working student|studentenjob|student \(college\)|hilfst[äa]tigkeit \/ student/.test(hay))
    return "werkstudent"
  if (/minijob|mini-?job|geringf[üu]gig/.test(hay)) return "minijob"
  if (/praktik|internship|\bintern\b/.test(hay)) return "praktikum"
  if (/freelance|freiberuflich/.test(hay)) return "freelance"
  if (/vollzeit|full-?time|permanent/.test(hay)) return "vollzeit"
  if (/teilzeit|part-?time|\bside\b/.test(hay)) return "teilzeit"
  return "teilzeit"
}

/**
 * Scrapes the Arbeitnow job board (Berlin + remote), paginated with a throttle.
 * Descriptions are inline, so no per-job detail fetch. Returns normalized,
 * deduped-by-externalId JobRecord[] (also persisted via saveJobs).
 */
export async function scrapeArbeitnow(): Promise<JobRecord[]> {
  const seen = new Set<string>()
  const collected: JobRecord[] = []

  for (let page = 1; page <= PAGES; page++) {
    let rows: AnJob[]
    try {
      const res = await fetch(`${API}?page=${page}`)
      if (!res.ok) {
        console.warn(`[${SOURCE}] page ${page} → ${res.status}, stopping`)
        break
      }
      rows = ((await res.json()) as { data?: AnJob[] }).data ?? []
    } catch (err) {
      console.warn(`[${SOURCE}] page ${page} fetch failed, stopping:`, err)
      break
    }
    if (rows.length === 0) break

    for (const j of rows) {
      if (!inScope(j)) continue
      const record = normalizeJob({
        title: j.title,
        company: j.company_name,
        location: j.location || (j.remote ? "Remote" : "Germany"),
        sourceUrl: j.url,
        source: SOURCE,
        description: j.description,
      })
      if (!record || seen.has(record.externalId)) continue

      // Override the text-classifier guess with Arbeitnow's job_types signal.
      const contractType = anContractType(j.title, j.job_types ?? [])
      record.contractType = contractType
      record.requiresEnrollment = inferRequiresEnrollment(contractType)

      seen.add(record.externalId)
      collected.push(record)
    }

    if (page < PAGES) await sleep(PAGE_DELAY_MS)
  }

  await saveJobs(collected)
  console.log(`[${SOURCE}] saved ${collected.length} jobs`)
  return collected
}
