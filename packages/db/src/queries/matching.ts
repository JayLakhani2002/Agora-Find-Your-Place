// Agent 5 — matching query helpers (Agent 2 reviews naming).
//
// THE LEGAL FILTER LIVES HERE, AT THE QUERY LAYER. A job that violates a
// user's visa constraints must never leave the database — it is filtered in
// SQL, not fetched-then-hidden. Callers derive `allowedContractTypes` and
// `maxWeeklyHours` from @agora/legal's VISA_CONSTRAINTS (the single source of
// truth); this module stays free of an @agora/legal dependency by taking them
// as parameters.

import {
  and,
  arrayContains,
  cosineDistance,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  notExists,
  or,
  sql,
} from "drizzle-orm"
import type { DB } from "../client"
import { jobs, userJobActions } from "../schema"

type ContractTypeValue = (typeof jobs.contractType.enumValues)[number]

/**
 * Every jobs column EXCEPT jobEmbedding. A bare `select()` shipped 500 × 1024 float
 * vectors over the neon-http driver on every deck build — megabytes of payload on the
 * sub-3s critical path, for a column no caller of this function reads.
 */
const ELIGIBLE_JOB_COLUMNS = {
  id: jobs.id,
  externalId: jobs.externalId,
  source: jobs.source,
  sourceUrl: jobs.sourceUrl,
  title: jobs.title,
  company: jobs.company,
  location: jobs.location,
  contractType: jobs.contractType,
  hourlyRate: jobs.hourlyRate,
  hoursPerWeek: jobs.hoursPerWeek,
  germanLevelRequired: jobs.germanLevelRequired,
  requiredSkills: jobs.requiredSkills,
  requiresEnrollment: jobs.requiresEnrollment,
  allowedVisaTypes: jobs.allowedVisaTypes,
  description: jobs.description,
  scrapedAt: jobs.scrapedAt,
  isActive: jobs.isActive,
} as const

export type EligibleJobRow = Omit<typeof jobs.$inferSelect, "jobEmbedding">

/**
 * Step 1 — SQL hard filter. Returns only jobs the user is legally allowed to
 * apply to, excluding anything they have already swiped on (unseen only).
 */
export async function getLegallyEligibleUnseenJobs(
  db: DB,
  params: {
    userId: string
    visaType: string
    maxWeeklyHours: number
    allowedContractTypes: readonly string[]
    limit?: number
  },
): Promise<EligibleJobRow[]> {
  const { userId, visaType, maxWeeklyHours, allowedContractTypes, limit = 500 } = params
  if (allowedContractTypes.length === 0) return []

  return (
    db
      .select(ELIGIBLE_JOB_COLUMNS)
      .from(jobs)
      .where(
        and(
          eq(jobs.isActive, true),
          inArray(jobs.contractType, allowedContractTypes as ContractTypeValue[]),
          // Hours cap: unknown hours pass the SQL gate; the per-card eligibility
          // ticks surface "hours unverified" to the user.
          or(isNull(jobs.hoursPerWeek), lte(jobs.hoursPerWeek, maxWeeklyHours)),
          // Visa allow-list: NULL means the posting declared no restriction.
          or(isNull(jobs.allowedVisaTypes), arrayContains(jobs.allowedVisaTypes, [visaType])),
          // Unseen only: anything in user_job_actions is excluded at the source.
          notExists(
            db
              .select({ one: sql`1` })
              .from(userJobActions)
              .where(and(eq(userJobActions.userId, userId), eq(userJobActions.jobId, jobs.id))),
          ),
        ),
      )
      // Newest first. Without an ORDER BY, LIMIT 500 over a growing table returns an
      // arbitrary planner-chosen slice — once the eligible pool exceeds 500, freshly
      // scraped jobs can stay permanently invisible to a given user.
      .orderBy(desc(jobs.scrapedAt))
      .limit(limit)
  )
}

export type VectorRankedJob = { id: string; similarity: number }

/**
 * Step 2 — vector similarity over the eligible pool. Cosine only (the HNSW
 * indexes are built with vector_cosine_ops; l2 would silently mis-rank).
 * Jobs without an embedding are skipped — they re-enter ranking once Agent 3's
 * pipeline embeds them.
 */
export async function vectorRankJobs(
  db: DB,
  profileEmbedding: number[],
  jobIds: string[],
  limit = 50,
): Promise<VectorRankedJob[]> {
  if (jobIds.length === 0) return []
  const similarity = sql<number>`1 - (${cosineDistance(jobs.jobEmbedding, profileEmbedding)})`

  return db
    .select({ id: jobs.id, similarity })
    .from(jobs)
    .where(and(inArray(jobs.id, jobIds), isNotNull(jobs.jobEmbedding)))
    .orderBy(desc(similarity))
    .limit(limit)
}

export type KeywordRankedJob = { id: string; keywordScore: number }

/**
 * Step 3 — pg_trgm keyword score of the job description against the user's
 * skill list (BM25-ish lexical signal to complement the dense vector step).
 */
export async function keywordRankJobs(
  db: DB,
  userSkills: string[],
  jobIds: string[],
): Promise<KeywordRankedJob[]> {
  if (jobIds.length === 0) return []
  // similarity() is symmetric trigram overlap; an empty skill list scores 0 for
  // every job, preserving the vector ordering downstream.
  const skillQuery = userSkills.join(" ")
  const keywordScore = sql<number>`similarity(${jobs.description}, ${skillQuery})`

  return db
    .select({ id: jobs.id, keywordScore })
    .from(jobs)
    .where(inArray(jobs.id, jobIds))
    .orderBy(desc(keywordScore))
}
