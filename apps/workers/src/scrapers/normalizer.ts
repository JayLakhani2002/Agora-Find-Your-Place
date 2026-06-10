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

/** Strip HTML tags and collapse whitespace — scrapers pass already-extracted text, this is a safety net. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Raw scraped job → normalized JobRecord mapped 1:1 to Agent 2's `jobs` columns.
 * Returns null if the record is unusable (missing title/company/description).
 */
export function normalizeJob(raw: RawJob): JobRecord | null {
  const title = raw.title?.trim()
  const company = raw.company?.trim()
  const description = stripHtml(raw.description ?? "")

  // jobs.title / company / description are NOT NULL — drop incomplete records rather than insert empties.
  if (!title || !company || !description) return null

  const haystack = `${title} ${description}`
  const contractType = classifyContractType(haystack, raw.source)
  const visaReq = classifyVisaRequirement(haystack)

  return {
    externalId: computeDedupHash(company, title, description),
    source: raw.source,
    sourceUrl: raw.sourceUrl,
    title,
    company,
    // jobs.location is NOT NULL — these three sources are all Berlin-scoped.
    location: raw.location?.trim() || "Berlin",
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
