// Agent 6 — generate_documents job: CV + cover letter (Sonnet, parallel) →
// 6-dimension eval (Haiku, parallel) → auto-regenerate when overall < 8.0
// (max 2 retries) → keep BEST attempt → upload to S3 → update applications row.
//
// The application row already exists (created by the right-swipe handoff or
// applications.create). This worker never touches application *status* beyond
// generationStatus — state transitions belong to the tRPC router.

import {
  COVER_LETTER_DIMENSIONS,
  type EvalResult,
  computeOverallScore,
  evaluateDocument,
  generateCV,
  generateCoverLetter,
  uploadBuffer,
  verifyPlaceholders,
} from "@agora/ai"
import { type AuditEntry, applications, getDb, jobs, userProfiles } from "@agora/db"
import { eq } from "drizzle-orm"

export interface GenerateDocumentsJob {
  applicationId: string
  roleAnswers: Record<string, string>
}

const SCORE_THRESHOLD = 8.0
const MAX_RETRIES = 2 // initial attempt + 2 regenerations

type Attempt = {
  cv: string
  coverLetter: string
  cvEval: EvalResult
  clEval: EvalResult
  cvOverall: number
  clOverall: number
  attempt: number
}

/** Combined quality used to pick the best attempt when none clears the bar. */
function attemptQuality(a: Attempt): number {
  return Math.min(a.cvOverall, a.clOverall)
}

async function appendAudit(applicationId: string, entry: Omit<AuditEntry, "timestamp">) {
  const db = getDb()
  const row = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
    columns: { auditLog: true },
  })
  const log = (row?.auditLog ?? []) as AuditEntry[]
  await db
    .update(applications)
    .set({
      auditLog: [...log, { timestamp: new Date().toISOString(), ...entry }],
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId))
}

export async function generateDocuments({
  applicationId,
  roleAnswers,
}: GenerateDocumentsJob): Promise<{ attempt: number; cvOverall: number; clOverall: number }> {
  const db = getDb()
  const started = Date.now()

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
  })
  if (!app) throw new Error(`generateDocuments: application ${applicationId} not found`)
  if (!app.jobId) throw new Error(`generateDocuments: application ${applicationId} has no job`)
  if (app.generationStatus === "complete") {
    // Idempotency backstop (jobId gen_${appId} already dedups in BullMQ)
    return { attempt: 0, cvOverall: app.evalScoreOverall ?? 0, clOverall: 0 }
  }

  const [job, profile] = await Promise.all([
    db.query.jobs.findFirst({ where: eq(jobs.id, app.jobId) }),
    db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, app.userId) }),
  ])
  if (!job) throw new Error(`generateDocuments: job ${app.jobId} not found`)
  if (!profile) throw new Error(`generateDocuments: profile for user ${app.userId} not found`)

  await db
    .update(applications)
    .set({ generationStatus: "processing", updatedAt: new Date() })
    .where(eq(applications.id, applicationId))
  await appendAudit(applicationId, { action: "generation_started", actor: "system" })

  const userProfile = {
    skills: profile.skills ?? [],
    experienceSummary: profile.experienceSummary ?? "",
    educationSummary: profile.educationSummary ?? "",
    germanLevel: profile.germanLevel ?? "B1",
  }
  const jobInput = {
    title: job.title,
    company: job.company,
    description: job.description,
    requiredSkills: job.requiredSkills ?? [],
    sourceUrl: job.sourceUrl,
  }

  try {
    let best: Attempt | undefined

    for (let attempt = 1; attempt <= 1 + MAX_RETRIES; attempt++) {
      const cv = await generateCV({ userProfile, job: jobInput, roleAnswers })
      const coverLetter = await generateCoverLetter({
        userProfile,
        job: jobInput,
        roleAnswers,
        cvContent: cv,
      })

      // PII guard — placeholders must be present, no real-looking contact data.
      // A violation is treated like a failed attempt: regenerate.
      const cvCheck = verifyPlaceholders(cv)
      const clCheck = verifyPlaceholders(coverLetter)
      if (!cvCheck.ok || !clCheck.ok) {
        console.warn(
          `[gen ${applicationId}] attempt ${attempt} placeholder violation:`,
          [...cvCheck.problems, ...clCheck.problems].join("; "),
        )
        continue
      }

      // Eval both docs in parallel (each eval fans out its dimensions in parallel)
      const [cvEval, clEval] = await Promise.all([
        evaluateDocument(cv, job.description),
        evaluateDocument(coverLetter, job.description, COVER_LETTER_DIMENSIONS),
      ])
      const current: Attempt = {
        cv,
        coverLetter,
        cvEval,
        clEval,
        cvOverall: computeOverallScore(cvEval),
        clOverall: computeOverallScore(clEval),
        attempt,
      }
      if (!best || attemptQuality(current) > attemptQuality(best)) best = current

      if (current.cvOverall >= SCORE_THRESHOLD && current.clOverall >= SCORE_THRESHOLD) break

      console.info(
        `[gen ${applicationId}] attempt ${attempt} below threshold (cv ${current.cvOverall.toFixed(1)}, cl ${current.clOverall.toFixed(1)}) — ${attempt <= MAX_RETRIES ? "regenerating" : "keeping best attempt"}`,
      )
    }

    if (!best) {
      // Every attempt violated the PII guard — fail loudly, never store such docs.
      await db
        .update(applications)
        .set({ generationStatus: "failed", updatedAt: new Date() })
        .where(eq(applications.id, applicationId))
      await appendAudit(applicationId, {
        action: "generation_failed",
        actor: "system",
        detail: "all attempts violated the PII placeholder guard",
      })
      throw new Error("generateDocuments: all attempts failed the placeholder guard")
    }

    const [cvKey, clKey] = [
      `applications/${applicationId}/cv-v${best.attempt}.md`,
      `applications/${applicationId}/cl-v${best.attempt}.md`,
    ]
    await Promise.all([
      uploadBuffer(cvKey, Buffer.from(best.cv, "utf-8"), "text/markdown"),
      uploadBuffer(clKey, Buffer.from(best.coverLetter, "utf-8"), "text/markdown"),
    ])

    await db
      .update(applications)
      .set({
        cvStorageKey: cvKey,
        coverLetterStorageKey: clKey,
        evalScoreAts: best.cvEval.ats?.score ?? null,
        evalScoreKeywords: best.cvEval.keywords?.score ?? null,
        evalScoreFactual: best.cvEval.factual?.score ?? null,
        evalScoreFormat: best.cvEval.format?.score ?? null,
        // Tone + language are the cover letter's signal (per Prototype 05 §6.1)
        evalScoreTone: best.clEval.tone?.score ?? null,
        evalScoreLanguage: best.clEval.language?.score ?? null,
        evalScoreOverall: best.cvOverall,
        generationStatus: "complete",
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId))

    await appendAudit(applicationId, {
      action: "documents_generated",
      actor: "system",
      detail:
        `attempt ${best.attempt}, cv ${best.cvOverall.toFixed(1)}, ` +
        `cl ${best.clOverall.toFixed(1)}, ${Date.now() - started}ms`,
    })

    return { attempt: best.attempt, cvOverall: best.cvOverall, clOverall: best.clOverall }
  } catch (err) {
    await db
      .update(applications)
      .set({ generationStatus: "failed", updatedAt: new Date() })
      .where(eq(applications.id, applicationId))
    await appendAudit(applicationId, {
      action: "generation_failed",
      actor: "system",
      detail: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
