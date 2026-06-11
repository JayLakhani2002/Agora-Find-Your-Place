// Agent 6 — application lifecycle router: the legal heart of the product.
//
// State machine (server-enforced, ownership-checked on every call):
//   generated → approved → submitted → interview_invited / rejected / offer_received
//   (withdrawn reachable from any non-terminal state)
//
// HARD RULES:
//   1. No server-side submitter, EVER (Mode 3 permanently banned). markSubmitted
//      only RECORDS that the user submitted the application themselves.
//   2. `submitted` is reachable ONLY from `approved` via explicit user action.
//   3. Every transition appends to the append-only audit_log.

import { generateRoleQuestions } from "@agora/ai"
import { type AuditEntry, applications, followUpDrafts, jobs } from "@agora/db/schema"
import { TRPCError } from "@trpc/server"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { getFollowUpQueue, getGenerationQueue, getQueueRedis } from "../queue"
import { createTRPCRouter, protectedProcedure } from "../trpc"

// ── Pure state machine (exported for unit tests) ──────────────────────────────

export type ApplicationStatus =
  | "generated"
  | "approved"
  | "submitted"
  | "rejected"
  | "interview_invited"
  | "offer_received"
  | "withdrawn"

/**
 * The ONLY legal transitions. Everything absent here is rejected server-side.
 * Note: `submitted` appears exclusively under `approved` — that single line is
 * rule 2, and tests assert no other source can reach it.
 */
export const VALID_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  generated: ["approved", "withdrawn"],
  approved: ["submitted", "withdrawn"],
  submitted: ["interview_invited", "rejected", "offer_received", "withdrawn"],
  interview_invited: ["offer_received", "rejected", "withdrawn"],
  offer_received: ["withdrawn"],
  rejected: [],
  withdrawn: [],
}

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function appendAuditEntry(
  log: AuditEntry[] | null | undefined,
  entry: Omit<AuditEntry, "timestamp">,
): AuditEntry[] {
  return [...(log ?? []), { timestamp: new Date().toISOString(), ...entry }]
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

const QUESTIONS_CACHE_PREFIX = "role_questions:"
const QUESTIONS_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

const FOLLOW_UP_DELAY_MS = 10 * 24 * 60 * 60 * 1000 // day 10

/** Statuses the tracker can set after submission — never `submitted` itself. */
const userUpdatableStatus = z.enum(["interview_invited", "rejected", "offer_received", "withdrawn"])

// ── Router ─────────────────────────────────────────────────────────────────────

export const applicationsRouter = createTRPCRouter({
  /**
   * 4 role-specific questions (HAIKU, Redis-cached per job). Asked right after
   * the right-swipe, before generation starts.
   */
  getRoleQuestions: protectedProcedure
    .input(z.object({ jobId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const redis = getQueueRedis()
      const cacheKey = `${QUESTIONS_CACHE_PREFIX}${input.jobId}`
      const cached = await redis.get(cacheKey)
      if (cached) return { questions: JSON.parse(cached) as string[] }

      const job = await ctx.db.query.jobs.findFirst({ where: eq(jobs.id, input.jobId) })
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" })

      let questions: string[]
      try {
        questions = await generateRoleQuestions(job.title, job.description)
        await redis.set(cacheKey, JSON.stringify(questions), "EX", QUESTIONS_CACHE_TTL_SECONDS)
      } catch {
        // Bedrock unavailable or returned bad output — serve generic questions so the
        // user can always continue. These are not cached (next attempt retries Haiku).
        questions = [
          "Describe a relevant project you've worked on recently.",
          "What's your experience with the main technical skills listed?",
          "When are you available, and how many hours per week?",
          "Why are you interested in this role?",
        ]
      }
      return { questions }
    }),

  /**
   * Attach role answers and start generation. The application row usually
   * already exists (right-swipe handoff); if not, it is created here.
   * roleAnswers travel in the queue payload only — they are generation input,
   * not stored PII.
   */
  create: protectedProcedure
    .input(
      z.object({
        jobId: z.string().min(1),
        roleAnswers: z.record(z.string(), z.string().max(2000)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.applications.findFirst({
        where: and(eq(applications.userId, ctx.user.id), eq(applications.jobId, input.jobId)),
        orderBy: desc(applications.createdAt),
      })

      let applicationId: string
      if (existing) {
        if (existing.generationStatus === "complete") {
          // Already generated — nothing to enqueue (idempotent re-tap).
          return { applicationId: existing.id, enqueued: false }
        }
        applicationId = existing.id
        await ctx.db
          .update(applications)
          .set({
            auditLog: appendAuditEntry(existing.auditLog, {
              action: "role_questions_answered",
              actor: "user",
            }),
            updatedAt: new Date(),
          })
          .where(eq(applications.id, applicationId))
      } else {
        const inserted = await ctx.db
          .insert(applications)
          .values({
            userId: ctx.user.id,
            jobId: input.jobId,
            auditLog: appendAuditEntry(null, { action: "created", actor: "user" }),
          })
          .returning({ id: applications.id })
        const row = inserted[0]
        if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
        applicationId = row.id
      }

      await getGenerationQueue().add(
        "generate_documents",
        { applicationId, roleAnswers: input.roleAnswers },
        {
          jobId: `gen_${applicationId}`, // idempotent — one generation per application
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      )

      return { applicationId, enqueued: true }
    }),

  /** Application detail + presigned document URLs for the review screen (Agent 7). */
  getWithDocuments: protectedProcedure
    .input(z.object({ applicationId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const app = await ctx.db.query.applications.findFirst({
        where: and(eq(applications.id, input.applicationId), eq(applications.userId, ctx.user.id)),
        with: { job: true },
      })
      if (!app) throw new TRPCError({ code: "NOT_FOUND" })

      // Return storage keys, not presigned URLs — the browser fetches through
      // /api/download/document to avoid cross-origin S3 CORS issues.
      const cvUrl = app.cvStorageKey
        ? `/api/download/document?applicationId=${app.id}&key=${encodeURIComponent(app.cvStorageKey)}`
        : null
      const coverLetterUrl = app.coverLetterStorageKey
        ? `/api/download/document?applicationId=${app.id}&key=${encodeURIComponent(app.coverLetterStorageKey)}`
        : null

      return {
        id: app.id,
        status: app.status,
        generationStatus: app.generationStatus,
        evalScores: {
          ats: app.evalScoreAts,
          keywords: app.evalScoreKeywords,
          factual: app.evalScoreFactual,
          format: app.evalScoreFormat,
          tone: app.evalScoreTone,
          language: app.evalScoreLanguage,
          overall: app.evalScoreOverall,
        },
        cvUrl,
        coverLetterUrl,
        employerUrl: app.job?.sourceUrl ?? null,
        job: app.job
          ? { title: app.job.title, company: app.job.company, location: app.job.location }
          : null,
        auditLog: (app.auditLog ?? []) as AuditEntry[],
        userApprovedAt: app.userApprovedAt,
        userSubmittedAt: app.userSubmittedAt,
        createdAt: app.createdAt,
      }
    }),

  /** generated → approved. Requires generation complete. */
  approve: protectedProcedure
    .input(z.object({ applicationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.query.applications.findFirst({
        where: and(eq(applications.id, input.applicationId), eq(applications.userId, ctx.user.id)),
      })
      if (!app) throw new TRPCError({ code: "NOT_FOUND" })
      if (app.generationStatus !== "complete") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Generation not complete" })
      }
      if (!canTransition(app.status, "approved")) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot approve from status "${app.status}"`,
        })
      }

      await ctx.db
        .update(applications)
        .set({
          status: "approved",
          userApprovedAt: new Date(),
          auditLog: appendAuditEntry(app.auditLog, {
            action: "approved_by_user",
            actor: "user",
          }),
          updatedAt: new Date(),
        })
        .where(eq(applications.id, input.applicationId))

      return { status: "approved" as const }
    }),

  /**
   * approved → submitted ONLY. Records that the USER submitted the application
   * on the employer's page themselves (Mode 1). Enqueues the day-10 follow-up.
   */
  markSubmitted: protectedProcedure
    .input(z.object({ applicationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.query.applications.findFirst({
        where: and(eq(applications.id, input.applicationId), eq(applications.userId, ctx.user.id)),
      })
      if (!app) throw new TRPCError({ code: "NOT_FOUND" })
      // Rule 2 — the single legal source state for `submitted` is `approved`.
      if (app.status !== "approved") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `submitted is only reachable from approved (current: "${app.status}")`,
        })
      }

      await ctx.db
        .update(applications)
        .set({
          status: "submitted",
          userSubmittedAt: new Date(),
          auditLog: appendAuditEntry(app.auditLog, {
            action: "marked_submitted_by_user",
            actor: "user",
            detail: "user submitted on employer page (Mode 1)",
          }),
          updatedAt: new Date(),
        })
        .where(eq(applications.id, input.applicationId))

      await getFollowUpQueue().add(
        "generate_followup",
        { applicationId: input.applicationId },
        {
          jobId: `followup_${input.applicationId}`, // idempotent — one follow-up per application
          delay: FOLLOW_UP_DELAY_MS,
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      )

      return { status: "submitted" as const }
    }),

  /** Post-submission tracker updates (valid transitions only). */
  updateStatus: protectedProcedure
    .input(
      z.object({
        applicationId: z.string().min(1),
        status: userUpdatableStatus,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.query.applications.findFirst({
        where: and(eq(applications.id, input.applicationId), eq(applications.userId, ctx.user.id)),
      })
      if (!app) throw new TRPCError({ code: "NOT_FOUND" })
      if (!canTransition(app.status, input.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Invalid transition ${app.status} → ${input.status}`,
        })
      }

      await ctx.db
        .update(applications)
        .set({
          status: input.status,
          auditLog: appendAuditEntry(app.auditLog, {
            action: `status_${input.status}`,
            actor: "user",
          }),
          updatedAt: new Date(),
        })
        .where(eq(applications.id, input.applicationId))

      return { status: input.status }
    }),

  /** Tracker list: the user's applications with job context + follow-up drafts. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.applications.findMany({
      where: eq(applications.userId, ctx.user.id),
      with: { job: true, followUpDrafts: true },
      orderBy: desc(applications.createdAt),
    })
    return rows.map((app) => ({
      id: app.id,
      status: app.status,
      generationStatus: app.generationStatus,
      overallScore: app.evalScoreOverall,
      job: app.job
        ? { title: app.job.title, company: app.job.company, location: app.job.location }
        : null,
      followUpDrafts: app.followUpDrafts.map((d) => ({
        id: d.id,
        draftText: d.draftText,
        generatedAt: d.generatedAt,
        sentAt: d.sentAt,
      })),
      userSubmittedAt: app.userSubmittedAt,
      createdAt: app.createdAt,
    }))
  }),

  /** Mark a follow-up draft as sent (the user copied + sent it themselves). */
  markFollowUpSent: protectedProcedure
    .input(z.object({ draftId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const draft = await ctx.db.query.followUpDrafts.findFirst({
        where: and(eq(followUpDrafts.id, input.draftId), eq(followUpDrafts.userId, ctx.user.id)),
      })
      if (!draft) throw new TRPCError({ code: "NOT_FOUND" })
      await ctx.db
        .update(followUpDrafts)
        .set({ sentAt: new Date() })
        .where(eq(followUpDrafts.id, input.draftId))
      return { ok: true }
    }),
})
