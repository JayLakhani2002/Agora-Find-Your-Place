// Standalone resume builder. Every procedure is ownership-checked: a resume is
// raw PII, so no query may ever return a row the caller does not own.

import { type ResumeContent, resumes } from "@agora/db/schema"
import { TRPCError } from "@trpc/server"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { emptyResume, isTemplateId } from "../../lib/resume"
import { createTRPCRouter, protectedProcedure } from "../trpc"

// ── Input validation (trust boundary — this is written straight to the DB) ────

// Caps are generous enough never to bite a real resume, but stop a crafted
// payload from writing megabytes of jsonb per row.
const entrySchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().max(200),
  organisation: z.string().max(200),
  location: z.string().max(200),
  startDate: z.string().max(40),
  endDate: z.string().max(40).nullable(),
  current: z.boolean(),
  bullets: z.array(z.string().max(1000)).max(20),
})

const ratedItemSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(120),
  level: z.string().max(60),
})

const sectionSchema = z.enum([
  "summary",
  "experience",
  "education",
  "skills",
  "languages",
  "certificates",
])

const contentSchema = z.object({
  contact: z.object({
    firstName: z.string().max(100),
    lastName: z.string().max(100),
    jobTitle: z.string().max(150),
    email: z.string().max(200),
    phone: z.string().max(50),
    location: z.string().max(150),
    linkedinUrl: z.string().max(300),
    portfolioUrl: z.string().max(300),
  }),
  summary: z.string().max(4000),
  experience: z.array(entrySchema).max(30),
  education: z.array(entrySchema).max(30),
  skills: z.array(ratedItemSchema).max(60),
  languages: z.array(ratedItemSchema).max(30),
  certificates: z.array(ratedItemSchema).max(30),
  sectionOrder: z.array(sectionSchema).max(6),
  showSkillLevels: z.boolean(),
}) satisfies z.ZodType<ResumeContent>

const templateSchema = z.string().refine(isTemplateId, "Unknown template")

// ── Router ────────────────────────────────────────────────────────────────────

export const resumesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: resumes.id,
        title: resumes.title,
        template: resumes.template,
        isBase: resumes.isBase,
        jobId: resumes.jobId,
        createdAt: resumes.createdAt,
        updatedAt: resumes.updatedAt,
      })
      .from(resumes)
      .where(eq(resumes.userId, ctx.user.id))
      .orderBy(desc(resumes.updatedAt))
    return rows
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.user.id)),
      })
      if (!row) throw new TRPCError({ code: "NOT_FOUND" })
      return row
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        template: templateSchema.default("harvard"),
        jobId: z.string().min(1).nullable().default(null),
        /** Copy this resume's content instead of starting blank. */
        fromResumeId: z.string().min(1).nullable().default(null),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let content = emptyResume()

      if (input.fromResumeId) {
        const source = await ctx.db.query.resumes.findFirst({
          where: and(eq(resumes.id, input.fromResumeId), eq(resumes.userId, ctx.user.id)),
        })
        if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Base resume not found" })
        content = source.content
      }

      const inserted = await ctx.db
        .insert(resumes)
        .values({
          userId: ctx.user.id,
          title: input.title,
          template: input.template,
          jobId: input.jobId,
          content,
        })
        .returning({ id: resumes.id })

      const row = inserted[0]
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
      return { id: row.id }
    }),

  /** Autosaved from the editor — partial so a title rename doesn't resend the doc. */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        template: templateSchema.optional(),
        content: contentSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input
      const updated = await ctx.db
        .update(resumes)
        .set({ ...patch, updatedAt: new Date() })
        // userId in the WHERE is the ownership check — without it this would
        // let any authenticated user overwrite any resume by guessing an id.
        .where(and(eq(resumes.id, id), eq(resumes.userId, ctx.user.id)))
        .returning({ id: resumes.id, updatedAt: resumes.updatedAt })

      const row = updated[0]
      if (!row) throw new TRPCError({ code: "NOT_FOUND" })
      return row
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db
        .delete(resumes)
        .where(and(eq(resumes.id, input.id), eq(resumes.userId, ctx.user.id)))
        .returning({ id: resumes.id })
      if (deleted.length === 0) throw new TRPCError({ code: "NOT_FOUND" })
      return { ok: true }
    }),

  /**
   * Promote one resume to base. Two statements, not one: clearing every other
   * flag first is what guarantees at most one base per user, since the schema
   * has no partial unique index to enforce it.
   */
  setBase: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const owned = await ctx.db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.user.id)),
        columns: { id: true },
      })
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" })

      await ctx.db
        .update(resumes)
        .set({ isBase: false })
        .where(and(eq(resumes.userId, ctx.user.id), eq(resumes.isBase, true)))
      await ctx.db.update(resumes).set({ isBase: true }).where(eq(resumes.id, input.id))

      return { ok: true }
    }),
})
