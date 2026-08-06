import raw from "./live-data.json"

/**
 * Typed access to the build-time snapshot written by `scripts/fetch-live-data.mts`
 * (BUILD-GUIDE §6). Everything downstream — claims, the Engine Theater, the proof wall,
 * the numbers band — reads from here, so a refresh is one prebuild run.
 *
 * Every row is a real, active, public listing from the `jobs` table. No user data.
 */

export type Listing = {
  title: string
  company: string
  location: string
  contractType: string
  hoursPerWeek: number | null
  hourlyRate: number | null
  germanLevel: string | null
  source: string
  scrapedAt: string
}

export const liveData = raw as {
  generatedAt: string
  totals: {
    activeJobs: number
    berlinJobs: number
    companies: number
    latestScrapedAt: string | null
    latestBatch: number
  }
  sources: { source: string; count: number; latestScrapedAt: string | null }[]
  feed: Listing[]
  /**
   * Proof wall: employers with live roles in the index right now. Never called partners.
   *
   * `logo` is a path under our own origin — the build script downloads it once so the
   * browser never calls a third-party logo service. It is null whenever we have no
   * verified domain for the company, and the wall renders a text mark instead.
   */
  companies: { name: string; roles: number; logo: string | null }[]
}

/**
 * Renders a stored UTC timestamp as a Berlin wall-clock time. Deterministic — the input
 * is a fixed string baked at build time, so server and client always agree.
 */
export function berlinTime(iso: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso))
}

/** Same instant, spelled as a date: "4 August". Deterministic for the same reason. */
export function berlinDate(iso: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    day: "numeric",
    month: "long",
  }).format(new Date(iso))
}

/** DB source keys → the names those organisations actually use. */
const SOURCE_LABELS: Record<string, string> = {
  tu_berlin: "TU Berlin Stellenticket",
  arbeitsagentur: "Bundesagentur für Arbeit",
  arbeitnow: "Arbeitnow",
  berlin_startup_jobs: "Berlin Startup Jobs",
  jobicco: "Jobicco",
}

export const sourceLabel = (key: string) => SOURCE_LABELS[key] ?? key

/** Short host-ish label for the terminal lines. */
const SOURCE_HOSTS: Record<string, string> = {
  tu_berlin: "stellenticket.tu-berlin.de",
  arbeitsagentur: "arbeitsagentur.de",
  arbeitnow: "arbeitnow.com",
  berlin_startup_jobs: "berlinstartupjobs.com",
  jobicco: "jobicco.berlin",
}

export const sourceHost = (key: string) => SOURCE_HOSTS[key] ?? key

/** €0 in the DB means "not stated", not "free". Never render it as a rate. */
export const rate = (l: Listing) => (l.hourlyRate && l.hourlyRate > 0 ? l.hourlyRate : null)

export const terms = (l: Listing) =>
  [l.hoursPerWeek ? `${l.hoursPerWeek} h/week` : null, rate(l) ? `€${rate(l)}/h` : null].filter(
    (v): v is string => v !== null,
  )

/** Locations arrive as "Berlin", "Berlin 12587", "Deutschland, Berlin". Show the city. */
export function city(location: string): string {
  if (/berlin/i.test(location)) return "Berlin"
  return location.split(",")[0]?.trim() || location
}

/** DB contract enum → the German term a reader would recognise. `unknown` shows nothing. */
const CONTRACT_LABELS: Record<string, string> = {
  werkstudent: "Werkstudent",
  minijob: "Minijob",
  vollzeit: "Vollzeit",
  teilzeit: "Teilzeit",
  praktikum: "Praktikum",
  ausbildung: "Ausbildung",
}

/**
 * The meta line under each listing in the terminal. City, contract, and the German
 * requirement — deliberately NOT hours or pay: those made the lines long and noisy, and
 * they are the two fields the scrapers fill least reliably.
 */
export function meta(l: Listing): string[] {
  const german =
    l.germanLevel === "none" || !l.germanLevel ? "German not required" : `German ${l.germanLevel}`
  return [city(l.location), CONTRACT_LABELS[l.contractType], german].filter((v): v is string =>
    Boolean(v),
  )
}

export type TheaterEvent = {
  t: string
  kind: "scan" | "hit"
  /** `scan` lines carry text; `hit` lines carry a real listing. */
  text?: string
  company?: string
  title?: string
  meta?: string[]
}

/**
 * The engine terminal script — a replay of one nightly run, built from real rows.
 *
 * The listings are picked one per source, in the order the feed already balances them, so
 * the transcript shows breadth rather than whichever scraper happened to run last. Titles,
 * companies, cities, contracts and German requirements are exactly what is in the
 * database. No invented match score is ever attached to a real listing — the only number
 * in this panel is the live index count, which comes from `claims`.
 */
export function theaterScript(count = 3): TheaterEvent[] {
  const seen = new Set<string>()
  const picks: Listing[] = []
  for (const l of liveData.feed) {
    if (seen.has(l.source)) continue
    seen.add(l.source)
    picks.push(l)
    if (picks.length === count) break
  }

  // berlinTime returns "HH:MM", or "—" when the DB has no timestamp — hence the fallbacks.
  const [h = 2, m = 0] = berlinTime(liveData.totals.latestScrapedAt).split(":").map(Number)
  const clock = (offset: number) => {
    const total = ((h || 0) * 60 + (m || 0) + offset) % 1440
    const hh = Math.floor(total / 60)
    return `${String(hh).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
  }

  return [
    {
      t: clock(0),
      kind: "scan" as const,
      text: `nightly scan · ${liveData.sources.length} sources`,
    },
    ...picks.map((l, i) => ({
      t: clock(1 + i * 2),
      kind: "hit" as const,
      company: l.company,
      title: l.title,
      meta: meta(l),
    })),
  ]
}
