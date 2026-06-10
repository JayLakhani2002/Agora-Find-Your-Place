import { jobs } from "@agora/db/schema"
import { eq, isNotNull, sql } from "drizzle-orm"
import { baseProcedure, createTRPCRouter } from "../trpc"

/**
 * Agent 3 owns ONLY this scrape-status health endpoint — no match/generation logic.
 * Public (baseProcedure): used for deployment + ingestion-pipeline monitoring.
 */
export const jobsRouter = createTRPCRouter({
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
})
