import { type JobRecord, type SourceName, computeDedupHash } from "./base"
import {
  classifyContractType,
  classifyGermanLevel,
  classifyVisaRequirement,
  extractHourlyRate,
  extractHoursPerWeek,
  extractSkills,
  inferRequiresEnrollment,
  visaRequirementToAllowedTypes,
} from "./classifier"

/** Raw fields a scraper pulls off a page before classification. */
export interface RawJob {
  title: string
  company: string
  sourceUrl: string
  source: SourceName
  description: string // already stripped of HTML tags
  location?: string
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

/**
 * Decode HTML entities and drop soft hyphens.
 *
 * Both were reaching the database verbatim: 282 rows carried raw `&amp;` / `&#x26;` /
 * `&#xfc;` in their description, and TU Berlin renders its markup with U+00AD soft
 * hyphens inside words, so "Fraunhofer Heinrich-Hertz-Institut" was stored as
 * "Fraun\xADho\xADfer …" — invisible on screen but it silently forks the company name,
 * breaking company grouping and any search for the real string.
 */
export function decodeEntities(text: string): string {
  // Two passes: feeds contain double-encoded entities ("&amp;#xA;"), where decoding the
  // named entity first only reveals the numeric one. One extra pass settles those; a
  // third would start mangling text that legitimately contains a literal "&#38;".
  return stripSoftHyphens(decodePass(decodePass(text)))
}

function decodePass(text: string): string {
  return text
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
}

const stripSoftHyphens = (text: string) => text.replace(/­/g, "")

/** Strip HTML tags and collapse whitespace — scrapers pass already-extracted text, this is a safety net. */
export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Raw scraped job → normalized JobRecord mapped 1:1 to Agent 2's `jobs` columns.
 * Returns null if the record is unusable (missing title/company/description).
 */
export function normalizeJob(raw: RawJob): JobRecord | null {
  const title = decodeEntities(raw.title ?? "").trim()
  const company = decodeEntities(raw.company ?? "").trim()
  const description = stripHtml(raw.description ?? "")
  const sourceUrl = raw.sourceUrl?.trim()

  // jobs.title / company / description are NOT NULL — drop incomplete records rather than insert empties.
  if (!title || !company || !description) return null

  // sourceUrl is NOT NULL too, and saveJobs writes the whole batch in ONE insert: a single
  // feed row with a missing url raises a not-null violation that throws away every record
  // in that run. An empty string would pass the constraint and ship a dead Apply link.
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null

  const haystack = `${title} ${description}`
  const contractType = classifyContractType(haystack)
  const visaReq = classifyVisaRequirement(haystack)

  return {
    externalId: computeDedupHash(company, title, description),
    source: raw.source,
    sourceUrl,
    title,
    company,
    // jobs.location is NOT NULL — these three sources are all Berlin-scoped.
    location: decodeEntities(raw.location ?? "").trim() || "Berlin",
    contractType,
    hourlyRate: extractHourlyRate(haystack),
    hoursPerWeek: extractHoursPerWeek(haystack),
    germanLevelRequired: classifyGermanLevel(haystack),
    requiredSkills: extractSkills(haystack),
    requiresEnrollment: inferRequiresEnrollment(contractType),
    allowedVisaTypes: visaRequirementToAllowedTypes(visaReq),
    description,
  }
}
