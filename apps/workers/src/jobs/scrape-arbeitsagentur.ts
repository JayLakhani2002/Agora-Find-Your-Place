import { type ContractType, type JobRecord, saveJobs, sleep } from "../scrapers/base"
import { inferRequiresEnrollment } from "../scrapers/classifier"
import { normalizeJob } from "../scrapers/normalizer"

const SOURCE = "arbeitsagentur" as const

// Reverse-engineered BA (Bundesagentur für Arbeit) REST API. Static public key, no signup.
// Search returns list rows WITHOUT a description; the detail endpoint carries the text we need.
const BA_KEY = "jobboerse-jobsuche"
const SEARCH_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs"
const DETAIL_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobdetails"

// Cap detail fetches per run — one HTTP call per job, so this bounds run time + API load.
const DETAIL_CAP = Number(process.env.BA_DETAIL_CAP) || 500
const DETAIL_CONCURRENCY = 8

// Highest-supply student odd-job categories (from the sourcing strategy). Each is its own search.
const ODD_JOB_KEYWORDS = [
  "Küchenhilfe",
  "Küchenhelfer",
  "Spülkraft",
  "Servicekraft",
  "Kellner",
  "Barkeeper",
  "Housekeeping",
  "Reinigungskraft",
  "Lagerhelfer",
  "Kommissionierer",
  "Paketzusteller",
  "Aushilfe",
]

interface SearchHit {
  refnr: string
  title: string
  company: string
  location: string
}

interface BaDetail {
  description: string
  hourlyRate: number | null
  contractType: ContractType
  externalUrl: string | null
}

/** One BA search page → list rows (no description yet). */
async function baSearch(params: { arbeitszeit?: string; was?: string; size?: number }): Promise<
  SearchHit[]
> {
  const url = new URL(SEARCH_URL)
  url.searchParams.set("wo", "Berlin")
  url.searchParams.set("umkreis", "25")
  url.searchParams.set("angebotsart", "1") // 1 = job (not apprenticeship/internship)
  url.searchParams.set("page", "1")
  url.searchParams.set("size", String(params.size ?? 100))
  if (params.arbeitszeit) url.searchParams.set("arbeitszeit", params.arbeitszeit)
  if (params.was) url.searchParams.set("was", params.was)

  const res = await fetch(url, { headers: { "X-API-Key": BA_KEY } })
  if (!res.ok) throw new Error(`BA search ${res.status}`)
  const data = (await res.json()) as { ergebnisliste?: BaSearchRow[] }

  return (data.ergebnisliste ?? [])
    .map((j) => {
      const adr = j.stellenlokationen?.[0]?.adresse
      return {
        refnr: j.referenznummer ?? "",
        title: j.stellenangebotsTitel ?? "",
        company: j.firma ?? "",
        location: adr ? [adr.ort, adr.plz].filter(Boolean).join(" ") : "Berlin",
      }
    })
    .filter((h) => h.refnr && h.title && h.company)
}

/** Contract type from BA's structured flags — authoritative for this source, beats text guessing. */
function baContractType(d: BaDetailRow, title: string): ContractType {
  const t = title.toLowerCase()
  if (/werkstudent|working student/.test(t)) return "werkstudent"
  if (d.istGeringfuegigeBeschaeftigung) return "minijob"
  if (/praktik|internship|\bintern\b/.test(t)) return "praktikum"
  const teilzeit =
    d.arbeitszeitTeilzeitVormittag ||
    d.arbeitszeitTeilzeitNachmittag ||
    d.arbeitszeitTeilzeitAbend ||
    d.arbeitszeitTeilzeitFlexibel
  if (d.arbeitszeitVollzeit && !teilzeit) return "vollzeit"
  return "teilzeit"
}

/** Detail endpoint → description + authoritative structured fields. Returns null if unusable. */
async function baDetail(hit: SearchHit): Promise<(JobRecord & { _ok: true }) | null> {
  const id = Buffer.from(hit.refnr).toString("base64url")
  const res = await fetch(`${DETAIL_URL}/${id}`, { headers: { "X-API-Key": BA_KEY } })
  if (!res.ok) return null
  const d = (await res.json()) as BaDetailRow

  const description = d.stellenangebotsBeschreibung ?? ""
  // normalizeJob drops empty descriptions — correct, they're useless for AI generation.
  const record = normalizeJob({
    title: hit.title,
    company: hit.company,
    location: hit.location,
    sourceUrl:
      d.externeUrl ??
      `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(hit.refnr)}`,
    source: SOURCE,
    description,
  })
  if (!record) return null

  // Override the text-classifier guesses with BA's structured signal.
  const contractType = baContractType(d, hit.title)
  record.contractType = contractType
  record.requiresEnrollment = inferRequiresEnrollment(contractType)
  if (d.verguetungsangabe === "STUNDENLOHN" && typeof d.festgehalt === "number") {
    record.hourlyRate = d.festgehalt
  }
  return { ...record, _ok: true }
}

/** Run `fn` over items with bounded concurrency; drops failures. */
async function mapBounded<T, R>(
  items: T[],
  fn: (item: T) => Promise<R | null>,
  size: number,
): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) {
    const settled = await Promise.allSettled(items.slice(i, i + size).map(fn))
    for (const s of settled) if (s.status === "fulfilled" && s.value) out.push(s.value)
    await sleep(200) // gentle pacing between chunks
  }
  return out
}

/**
 * Scrapes Bundesagentur für Arbeit for Berlin. Two-stage (search list → per-job detail),
 * capped at DETAIL_CAP detail fetches. Covers student part-time (tz+mj), odd-jobs, and full-time.
 * Returns normalized, deduped-by-externalId JobRecord[] (also persisted via saveJobs).
 */
export async function scrapeArbeitsagentur(): Promise<JobRecord[]> {
  // ── Stage 1: search across all three segments, merge, dedup by referenznummer ──
  const searches = await Promise.allSettled([
    baSearch({ arbeitszeit: "tz;mj", size: 100 }), // student part-time
    baSearch({ arbeitszeit: "vz", size: 100 }), // full-time
    ...ODD_JOB_KEYWORDS.map((was) => baSearch({ arbeitszeit: "mj;tz", was, size: 25 })),
  ])

  const seenRef = new Set<string>()
  const hits: SearchHit[] = []
  for (const s of searches) {
    if (s.status !== "fulfilled") continue
    for (const h of s.value) {
      if (seenRef.has(h.refnr)) continue
      seenRef.add(h.refnr)
      hits.push(h)
    }
  }
  console.log(`[${SOURCE}] ${hits.length} unique search hits → fetching up to ${DETAIL_CAP} details`)

  // ── Stage 2: fetch descriptions, normalize, dedup by content hash ──
  const detailed = await mapBounded(hits.slice(0, DETAIL_CAP), baDetail, DETAIL_CONCURRENCY)
  const seenHash = new Set<string>()
  const collected: JobRecord[] = []
  for (const { _ok, ...record } of detailed) {
    void _ok
    if (seenHash.has(record.externalId)) continue
    seenHash.add(record.externalId)
    collected.push(record)
  }

  await saveJobs(collected)
  console.log(`[${SOURCE}] saved ${collected.length} jobs`)
  return collected
}

// ── BA response shapes (only the fields we read) ──
interface BaSearchRow {
  referenznummer?: string
  stellenangebotsTitel?: string
  firma?: string
  stellenlokationen?: { adresse?: { ort?: string; plz?: string } }[]
}

interface BaDetailRow {
  stellenangebotsBeschreibung?: string
  externeUrl?: string | null
  verguetungsangabe?: string
  festgehalt?: number
  istGeringfuegigeBeschaeftigung?: boolean
  arbeitszeitVollzeit?: boolean
  arbeitszeitTeilzeitVormittag?: boolean
  arbeitszeitTeilzeitNachmittag?: boolean
  arbeitszeitTeilzeitAbend?: boolean
  arbeitszeitTeilzeitFlexibel?: boolean
}
