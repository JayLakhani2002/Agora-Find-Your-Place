// Agent 6 — day-10 follow-up draft job. Enqueued by markSubmitted with
// delay: 10 days, jobId followup_${appId} (idempotent). Generates a
// 3-sentence German follow-up (Sonnet) ONLY if the application is still
// `submitted` (no response). The user copies + sends it themselves — we
// NEVER send email on their behalf in v1.

import { generateFollowUp } from "@agora/ai"
import { type AuditEntry, applications, followUpDrafts, getDb, jobs } from "@agora/db"
import { eq } from "drizzle-orm"

export interface GenerateFollowUpJob {
  applicationId: string
}

export async function generateFollowUpDraft({
  applicationId,
}: GenerateFollowUpJob): Promise<{ generated: boolean }> {
  const db = getDb()

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
  })
  if (!app) throw new Error(`generateFollowUpDraft: application ${applicationId} not found`)

  // Only follow up if the application is still sitting in `submitted`.
  // Any progression (interview, rejection, offer, withdrawal) cancels the draft.
  if (app.status !== "submitted") return { generated: false }
  if (!app.jobId) return { generated: false }

  // Idempotency backstop: one draft per application.
  const existing = await db.query.followUpDrafts.findFirst({
    where: eq(followUpDrafts.applicationId, applicationId),
  })
  if (existing) return { generated: false }

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, app.jobId) })
  if (!job) return { generated: false }

  const daysSinceSubmission = app.userSubmittedAt
    ? Math.round((Date.now() - app.userSubmittedAt.getTime()) / 86_400_000)
    : 10

  const draftText = await generateFollowUp({
    job: { title: job.title, company: job.company },
    daysSinceSubmission,
  })

  await db.insert(followUpDrafts).values({
    applicationId,
    userId: app.userId,
    draftText,
  })

  const log = (app.auditLog ?? []) as AuditEntry[]
  await db
    .update(applications)
    .set({
      auditLog: [
        ...log,
        {
          timestamp: new Date().toISOString(),
          action: "followup_draft_generated",
          actor: "system" as const,
          detail: `day ${daysSinceSubmission}`,
        },
      ],
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId))

  return { generated: true }
}
