import { jobs, userJobActions } from "@agora/db/schema"
import { and, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm"
import { z } from "zod"
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../trpc"

const CONTRACT_TYPES = [
  "werkstudent",
  "minijob",
  "vollzeit",
  "teilzeit",
  "praktikum",
  "freelance",
] as const

const PAGE_SIZE = 20

/** `%` and `_` are LIKE wildcards — escape so a literal user query matches literally. */
function likeLiteral(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`)
}

const JOB_COLUMNS = {
  id: jobs.id,
  title: jobs.title,
  company: jobs.company,
  location: jobs.location,
  contractType: jobs.contractType,
  hourlyRate: jobs.hourlyRate,
  hoursPerWeek: jobs.hoursPerWeek,
  requiredSkills: jobs.requiredSkills,
  sourceUrl: jobs.sourceUrl,
  scrapedAt: jobs.scrapedAt,
}

export const jobsRouter = createTRPCRouter({
  /**
   * Agent 3 owns ONLY this scrape-status health endpoint — no match/generation logic.
   * Public (baseProcedure): used for deployment + ingestion-pipeline monitoring.
   */
  health: baseProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({
        jobsTotal: sql<number>`count(*)::int`,
        jobsActive: sql<number>`count(*) filter (where ${eq(jobs.isActive, true)})::int`,
        jobsEmbedded: sql<number>`count(*) filter (where ${isNotNull(jobs.jobEmbedding)})::int`,
        lastRun: sql<string | null>`max(${jobs.scrapedAt})`,
      })
      .from(jobs)

    return {
      lastRun: row?.lastRun ?? null,
      jobsTotal: row?.jobsTotal ?? 0,
      jobsActive: row?.jobsActive ?? 0,
      jobsEmbedded: row?.jobsEmbedded ?? 0,
    }
  }),

  /**
   * Browsable job board (the deck's counterpart: no ranking, no legal filter —
   * the user is searching explicitly). Eligibility is still shown per row by the
   * deck; this list is deliberately unfiltered so a search never silently hides
   * results the user typed the exact title of.
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().max(200).default(""),
        location: z.string().max(200).default(""),
        contractType: z.enum(CONTRACT_TYPES).optional(),
        page: z.number().int().min(0).max(500).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const q = likeLiteral(input.query.trim())
      const loc = likeLiteral(input.location.trim())

      const rows = await ctx.db
        .select(JOB_COLUMNS)
        .from(jobs)
        .where(
          and(
            eq(jobs.isActive, true),
            q ? or(ilike(jobs.title, `%${q}%`), ilike(jobs.company, `%${q}%`)) : undefined,
            loc ? ilike(jobs.location, `%${loc}%`) : undefined,
            input.contractType ? eq(jobs.contractType, input.contractType) : undefined,
          ),
        )
        .orderBy(desc(jobs.scrapedAt))
        // Fetch one extra to learn whether another page exists without a COUNT(*).
        .limit(PAGE_SIZE + 1)
        .offset(input.page * PAGE_SIZE)

      const hasMore = rows.length > PAGE_SIZE
      const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows

      const pageIds = page.map((j) => j.id)
      const savedRows = pageIds.length
        ? await ctx.db
            .select({ jobId: userJobActions.jobId })
            .from(userJobActions)
            .where(
              and(
                eq(userJobActions.userId, ctx.user.id),
                eq(userJobActions.action, "save"),
                inArray(userJobActions.jobId, pageIds),
              ),
            )
        : []
      const savedIds = new Set(savedRows.map((r) => r.jobId))

      return {
        jobs: page.map((j) => ({ ...j, saved: savedIds.has(j.id) })),
        hasMore,
      }
    }),

  /** Everything the user bookmarked, newest save first. */
  saved: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ ...JOB_COLUMNS, savedAt: userJobActions.createdAt })
      .from(userJobActions)
      .innerJoin(jobs, eq(jobs.id, userJobActions.jobId))
      .where(and(eq(userJobActions.userId, ctx.user.id), eq(userJobActions.action, "save")))
      .orderBy(desc(userJobActions.createdAt))

    return { jobs: rows.map((j) => ({ ...j, saved: true as const })) }
  }),

  /**
   * Bookmark / un-bookmark. One row per (user, job) is enforced by a unique
   * index, so saving a job the user previously left-swiped promotes that row
   * rather than inserting a second one. Un-saving only ever deletes a `save`
   * row — it must not resurrect a job the user explicitly declined.
   */
  toggleSave: protectedProcedure
    .input(z.object({ jobId: z.string().min(1), saved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!input.saved) {
        await ctx.db
          .delete(userJobActions)
          .where(
            and(
              eq(userJobActions.userId, ctx.user.id),
              eq(userJobActions.jobId, input.jobId),
              eq(userJobActions.action, "save"),
            ),
          )
        return { saved: false }
      }

      await ctx.db
        .insert(userJobActions)
        .values({ userId: ctx.user.id, jobId: input.jobId, action: "save" })
        .onConflictDoUpdate({
          target: [userJobActions.userId, userJobActions.jobId],
          set: { action: "save" },
        })
      return { saved: true }
    }),
})
