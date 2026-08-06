/**
 * Company career-page ingestion via ATS public JSON/XML feeds.
 *
 * Why not crawl career pages: almost every company career page is a thin skin over
 * one of ~8 applicant tracking systems, and each ATS exposes the same public feed the
 * page itself renders from. One adapter per ATS covers thousands of companies, and the
 * feed carries the posting minutes after HR hits publish — the same freshness edge the
 * "Google Alerts on site:careers.x.com" trick buys, without depending on Google's crawler.
 *
 * Adding a company = one line in ats-companies.ts. Find its ATS + token with
 * `pnpm --filter @agora/workers exec tsx scripts/detect-ats.ts <domain…>`.
 */

export type AtsKind = "greenhouse" | "lever" | "ashby" | "personio" | "recruitee" | "workday"

/** One posting as the ATS returns it, before normalizeJob() classifies it. */
export interface AtsPosting {
  title: string
  location: string
  description: string // HTML or plain — normalizeJob strips tags
  url: string
}

const UA = "AgoraJobsBot/1.0 (+https://agorajobs.eu/bot)"
const TIMEOUT_MS = 15_000

async function req(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { accept: "application/json", "user-agent": UA, ...init?.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await req(url, init)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return (await res.json()) as T
}

/** Greenhouse ships descriptions HTML-entity-escaped; stripHtml can't see tags until decoded. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
}

// ── Adapters ─────────────────────────────────────────────────────────────────
// Each takes the board token from the registry and returns every listed posting.

const greenhouse = async (token: string): Promise<AtsPosting[]> => {
  const { jobs = [] } = await getJson<{
    jobs?: { title: string; location?: { name?: string }; absolute_url: string; content?: string }[]
  }>(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`)
  return jobs.map((j) => ({
    title: j.title,
    location: j.location?.name ?? "",
    description: decodeEntities(j.content ?? ""),
    url: j.absolute_url,
  }))
}

const lever = async (token: string): Promise<AtsPosting[]> => {
  const rows = await getJson<
    {
      text: string
      hostedUrl: string
      categories?: { location?: string }
      description?: string
      lists?: { text?: string; content?: string }[]
      additional?: string
    }[]
  >(`https://api.lever.co/v0/postings/${token}?mode=json`)
  return rows.map((j) => ({
    title: j.text,
    location: j.categories?.location ?? "",
    // Lever splits the posting across description + labelled lists (responsibilities,
    // requirements). Concatenate — the classifier needs the requirement text.
    description: [
      j.description ?? "",
      ...(j.lists ?? []).map((l) => `${l.text ?? ""} ${l.content ?? ""}`),
      j.additional ?? "",
    ].join(" "),
    url: j.hostedUrl,
  }))
}

const ashby = async (token: string): Promise<AtsPosting[]> => {
  const { jobs = [] } = await getJson<{
    jobs?: {
      title: string
      location?: string
      jobUrl: string
      descriptionHtml?: string
      descriptionPlain?: string
      isListed?: boolean
    }[]
  }>(`https://api.ashbyhq.com/posting-api/job-board/${token}`)
  return jobs
    .filter((j) => j.isListed !== false)
    .map((j) => ({
      title: j.title,
      location: j.location ?? "",
      description: j.descriptionHtml ?? j.descriptionPlain ?? "",
      url: j.jobUrl,
    }))
}

/**
 * Personio (the dominant ATS for German SMEs) publishes an XML feed, not JSON.
 * ponytail: regex over the feed instead of an XML parser — the schema is flat and
 * CDATA-wrapped, so tags can't nest ambiguously. Swap in fast-xml-parser if Personio
 * ever nests <position> or we start needing attributes.
 */
const personio = async (token: string): Promise<AtsPosting[]> => {
  const res = await req(`https://${token}.jobs.personio.de/xml`, {
    headers: { accept: "text/xml" },
  })
  if (!res.ok) throw new Error(`${res.status} personio/${token}`)
  return parsePersonioXml(await res.text(), token)
}

export function parsePersonioXml(xml: string, token: string): AtsPosting[] {
  const out: AtsPosting[] = []

  for (const match of xml.matchAll(/<position>([\s\S]*?)<\/position>/g)) {
    const body = match[1] ?? ""
    // <name> appears both as the job title and as each description section's heading —
    // split at <jobDescriptions> so the title only ever comes from the head.
    const [head = "", tail = ""] = body.split("<jobDescriptions>")
    const title = text(head.match(/<name>([\s\S]*?)<\/name>/)?.[1])
    const id = text(head.match(/<id>([\s\S]*?)<\/id>/)?.[1])
    if (!title || !id) continue
    out.push({
      title,
      // A role open in several cities lists the extra ones under <additionalOffices>;
      // reading only the first <office> hides Berlin behind whichever HQ comes first.
      location: [...head.matchAll(/<office>([\s\S]*?)<\/office>/g)]
        .map((m) => text(m[1]))
        .join(", "),
      description: text(
        [...tail.matchAll(/<value>([\s\S]*?)<\/value>/g)].map((m) => m[1]).join(" "),
      ),
      url: `https://${token}.jobs.personio.de/job/${id}`,
    })
  }
  return out
}

const text = (raw?: string): string =>
  (raw ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/\s+/g, " ")
    .trim()

const recruitee = async (token: string): Promise<AtsPosting[]> => {
  const { offers = [] } = await getJson<{
    offers?: {
      title: string
      location?: string
      city?: string
      careers_url?: string
      careers_apply_url?: string
      description?: string
      requirements?: string
    }[]
  }>(`https://${token}.recruitee.com/api/offers/`)
  return offers.map((o) => ({
    title: o.title,
    location: o.location || o.city || "",
    description: `${o.description ?? ""} ${o.requirements ?? ""}`,
    url: o.careers_url || o.careers_apply_url || `https://${token}.recruitee.com/`,
  }))
}

// NO SmartRecruiters adapter, deliberately. Their API answers anonymously, but
// api.smartrecruiters.com/robots.txt is `Disallow: /` for every agent except LinkedInBot —
// a machine-readable opt-out, which is exactly the signal our legal posture says we obey
// (see docs/Job Data/LEGAL-POSTURE.md). The lawful route is their Partner API key. The
// detector still reports SmartRecruiters employers so we know who to ask for.

/**
 * Workday (the enterprise default — the banks in the original Google-Alerts trick all
 * run it). Token is `<host>/<siteId>`, e.g. `zalando.wd3.myworkdayjobs.com/zalando_career`.
 * The undocumented-but-public cxs endpoint backs the career site's own React app.
 */
const WD_PAGE = 20
const WD_MAX = 100
const workday = async (token: string, max = WD_MAX): Promise<AtsPosting[]> => {
  const [host, site] = token.split("/")
  if (!host || !site) throw new Error(`workday token must be "<host>/<siteId>", got "${token}"`)
  const tenant = host.split(".")[0]
  const base = `https://${host}/wday/cxs/${tenant}/${site}`

  const postings: { title: string; externalPath: string; locationsText?: string }[] = []
  for (let offset = 0; offset < max; offset += WD_PAGE) {
    const page = await getJson<{ jobPostings?: typeof postings }>(`${base}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appliedFacets: {}, limit: WD_PAGE, offset, searchText: "" }),
    })
    const rows = page.jobPostings ?? []
    postings.push(...rows)
    if (rows.length < WD_PAGE) break
    await new Promise((r) => setTimeout(r, 500))
  }

  const out: AtsPosting[] = []
  for (const p of postings.slice(0, max)) {
    try {
      const d = await getJson<{
        jobPostingInfo?: { jobDescription?: string; externalUrl?: string; location?: string }
      }>(`${base}${p.externalPath}`)
      out.push({
        title: p.title,
        location: d.jobPostingInfo?.location ?? p.locationsText ?? "",
        description: d.jobPostingInfo?.jobDescription ?? "",
        url: d.jobPostingInfo?.externalUrl ?? `https://${host}/${site}${p.externalPath}`,
      })
    } catch {
      // Skip the posting, keep the company.
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return out
}

/** `max` bounds Workday, the one N+1 adapter; detection passes a small value. */
export const ATS_ADAPTERS: Record<AtsKind, (token: string, max?: number) => Promise<AtsPosting[]>> =
  {
    greenhouse,
    lever,
    ashby,
    personio,
    recruitee,
    workday,
  }

// ── Detection ────────────────────────────────────────────────────────────────

/**
 * ATS fingerprints found in career-page HTML (iframe src, apply links, embed scripts).
 * `kind: null` = detected but not ingestible yet — detect-ats reports these so the next
 * adapter is chosen by real demand instead of a guess.
 */
export const ATS_SIGNATURES: { kind: AtsKind | null; name: string; re: RegExp }[] = [
  {
    kind: "greenhouse",
    name: "greenhouse",
    re: /(?:boards|job-boards)\.greenhouse\.io\/([\w-]+)/i,
  },
  {
    kind: "greenhouse",
    name: "greenhouse",
    re: /boards-api\.greenhouse\.io\/v1\/boards\/([\w-]+)/i,
  },
  { kind: "lever", name: "lever", re: /jobs\.(?:eu\.)?lever\.co\/([\w-]+)/i },
  { kind: "ashby", name: "ashby", re: /jobs\.ashbyhq\.com\/([\w.-]+)/i },
  { kind: "personio", name: "personio", re: /([\w-]+)\.jobs\.personio\.(?:de|com)/i },
  { kind: "recruitee", name: "recruitee", re: /([\w-]+)\.recruitee\.com/i },
  // kind:null — robots.txt opt-out, see the note above the adapters. Detect, never ingest.
  { kind: null, name: "smartrecruiters", re: /(?:careers|jobs)\.smartrecruiters\.com\/([\w-]+)/i },
  {
    kind: "workday",
    name: "workday",
    re: /([\w-]+\.wd\d+\.myworkdayjobs\.com)\/(?:[\w-]{2,5}-[\w-]{2,5}\/)?([\w-]+)/i,
  },
  { kind: null, name: "softgarden", re: /([\w-]+)\.softgarden\.io/i },
  { kind: null, name: "join.com", re: /join\.com\/companies\/([\w-]+)/i },
  { kind: null, name: "teamtailor", re: /([\w-]+)\.teamtailor\.com/i },
  { kind: null, name: "dvinci", re: /([\w-]+)\.dvinci\.de/i },
  { kind: null, name: "rexx", re: /([\w-]+)\.rexx-systems\.com/i },
  { kind: null, name: "workable", re: /apply\.workable\.com\/([\w-]+)/i },
]

export interface AtsHit {
  kind: AtsKind | null
  name: string
  token: string
}

/** First ATS fingerprint in a page's HTML, or null. Workday needs host + site joined. */
export function detectAts(html: string): AtsHit | null {
  for (const sig of ATS_SIGNATURES) {
    const m = html.match(sig.re)
    if (!m) continue
    const token = sig.name === "workday" ? `${m[1]}/${m[2]}` : m[1]
    if (token) return { kind: sig.kind, name: sig.name, token }
  }
  return null
}
