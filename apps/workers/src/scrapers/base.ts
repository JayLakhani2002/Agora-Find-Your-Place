import { createHash } from "node:crypto"
import { type contractTypeEnum, type germanLevelEnum, getDb, jobs } from "@agora/db"
import { sql } from "drizzle-orm"

// Enum union types derived from Agent 2's pgEnums — NEVER redefine the values here.
export type ContractType = (typeof contractTypeEnum.enumValues)[number]
export type GermanLevel = (typeof germanLevelEnum.enumValues)[number]

// Inference-only intermediate (not a DB column). Mapped to allowedVisaTypes + requiresEnrollment.
export type VisaRequirement = "none" | "eu_only" | "any"

export type SourceName =
  | "berlin_startup_jobs"
  | "stellenticket"
  | "jobicco"
  | "arbeitsagentur"
  | "arbeitnow"

/**
 * Normalized job, shaped to Agent 2's `jobs` table columns (NOT the old spec's
 * dedupHash/source_urls/salaryMin schema). Agent 2 owns the schema; we adapt to it.
 *
 * Dedup bridge: the spec's SHA256 dedup hash becomes `externalId`. The table's
 * unique index is (external_id, source), so onConflict targets that pair.
 */
export interface JobRecord {
  externalId: string // SHA256 dedup hash of company+title+description
  source: SourceName
  sourceUrl: string
  title: string
  company: string
  location: string
  contractType: ContractType
  hourlyRate: number | null
  hoursPerWeek: number | null
  germanLevelRequired: GermanLevel | null
  requiredSkills: string[]
  requiresEnrollment: boolean
  allowedVisaTypes: string[] | null
  description: string
}

/**
 * Dedup hash — identical algorithm to the spec. Company + title + first 200 chars
 * of description, lowercased/trimmed, SHA256 hex. Used as `externalId`.
 */
export function computeDedupHash(company: string, title: string, description: string): string {
  const normalized =
    company.toLowerCase().trim() + title.toLowerCase().trim() + description.trim().slice(0, 200)
  return createHash("sha256").update(normalized, "utf-8").digest("hex")
}

/** 1 request / 5 seconds — hard minimum throttle, called at the end of every requestHandler. */
export const RATE_LIMIT_MS = 5000
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// Shared Crawlee config — maxConcurrency MUST stay 1 (IP-ban protection); robots.txt respected.
export const baseCrawlerConfig = {
  respectRobotsTxtFile: true as const,
  maxConcurrency: 1,
  minConcurrency: 1,
  maxRequestsPerCrawl: 200,
  requestHandlerTimeoutSecs: 30,
  maxRequestRetries: 2,
}

/**
 * Upsert scraped jobs. Conflict on (external_id, source) → refresh mutable fields
 * and re-activate. NEVER SELECT-then-INSERT (race). Returns count of rows written.
 */
export async function saveJobs(records: JobRecord[]): Promise<number> {
  if (records.length === 0) return 0
  const db = getDb()

  const rows = records.map((r) => ({
    externalId: r.externalId,
    source: r.source,
    sourceUrl: r.sourceUrl,
    title: r.title,
    company: r.company,
    location: r.location,
    contractType: r.contractType,
    hourlyRate: r.hourlyRate,
    hoursPerWeek: r.hoursPerWeek,
    germanLevelRequired: r.germanLevelRequired,
    requiredSkills: r.requiredSkills,
    requiresEnrollment: r.requiresEnrollment,
    allowedVisaTypes: r.allowedVisaTypes,
    description: r.description,
    isActive: true,
  }))

  await db
    .insert(jobs)
    .values(rows)
    .onConflictDoUpdate({
      target: [jobs.externalId, jobs.source],
      set: {
        sourceUrl: sql`excluded.source_url`,
        title: sql`excluded.title`,
        company: sql`excluded.company`,
        location: sql`excluded.location`,
        contractType: sql`excluded.contract_type`,
        hourlyRate: sql`excluded.hourly_rate`,
        hoursPerWeek: sql`excluded.hours_per_week`,
        germanLevelRequired: sql`excluded.german_level_required`,
        requiredSkills: sql`excluded.required_skills`,
        requiresEnrollment: sql`excluded.requires_enrollment`,
        allowedVisaTypes: sql`excluded.allowed_visa_types`,
        description: sql`excluded.description`,
        scrapedAt: sql`now()`,
        isActive: true,
      },
    })

  return rows.length
}
