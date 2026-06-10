// Agent 6 — generate_questions job: 4 role-specific questions (HAIKU — never
// Sonnet; questions are high-volume). Results cached in Redis per job so a
// second user right-swiping the same posting gets them instantly.
//
// The web router (applications.getRoleQuestions) reads the same cache and
// generates inline on a miss; this worker exists to pre-warm asynchronously.

import { generateRoleQuestions } from "@agora/ai"
import { getDb, jobs } from "@agora/db"
import { eq } from "drizzle-orm"
import { getConnection } from "../queues"

export interface GenerateQuestionsJob {
  jobId: string
}

export const QUESTIONS_CACHE_PREFIX = "role_questions:"
export const QUESTIONS_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

export async function generateQuestions({ jobId }: GenerateQuestionsJob): Promise<string[]> {
  const redis = getConnection()
  const cacheKey = `${QUESTIONS_CACHE_PREFIX}${jobId}`

  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached) as string[]

  const job = await getDb().query.jobs.findFirst({ where: eq(jobs.id, jobId) })
  if (!job) throw new Error(`generateQuestions: job ${jobId} not found`)

  const questions = await generateRoleQuestions(job.title, job.description)
  await redis.set(cacheKey, JSON.stringify(questions), "EX", QUESTIONS_CACHE_TTL_SECONDS)
  return questions
}
