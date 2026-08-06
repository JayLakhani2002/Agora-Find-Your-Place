// Standalone resume builder. Every procedure is ownership-checked: a resume is
// raw PII, so no query may ever return a row the caller does not own.

import { decryptFieldOrPassThrough, encryptField, fieldEncryptionEnabled } from "@agora/ai"
import { type ResumeContent, jobs, resumes } from "@agora/db/schema"
import { TRPCError } from "@trpc/server"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { emptyResume, isTemplateId } from "../../lib/resume"
import { createTRPCRouter, protectedProcedure } from "../trpc"

/**
 * `content` holds the most identifying data in the product — real name, email, phone.
 * These two helpers are the only places it crosses the storage boundary.
 *
 * The envelope is a JSON *string*, which the existing `jsonb` column stores natively, so
 * there is no schema migration and no dual-column window. A row is either a legacy object
 * or an envelope string, and `decryptFieldOrPassThrough` handles both — which is what
 * makes a gradual backfill possible instead of a flag-day rewrite.
 *
 * Gated on FIELD_ENCRYPTION_ENABLED, off by default. See docs/Security/FIELD-ENCRYPTION.md.
 */
async function writeContent(content: ResumeContent): Promise<ResumeContent | string> {
  if (!fieldEncryptionEnabled()) return content
  return encryptField(content)
}

async function readContent(stored: ResumeContent | string): Promise<ResumeContent> {
  // Always attempt the decrypt path regardless of the flag: turning the flag OFF must not
  // make already-encrypted rows unreadable, or a rollback becomes data loss.
  return decryptFieldOrPassThrough<ResumeContent>(stored)
}

// ── Input validation (trust boundary — this is written straight to the DB) ────

// Postgres text/jsonb cannot store U+0000, but z.string() accepts it, so a
// resume pasted out of a badly-encoded PDF used to fail the autosave with a
// raw 22P05. Stripped silently rather than rejected: the character is
// invisible, the surrounding text is legitimate, and the editor autosaves —
// an error here just loses the user's work.
const stripNul = (s: string) => s.replaceAll("\u0000", "")

/** Capped, NUL-free string. Every user-supplied string in content uses this. */
const txt = (max: number) => z.string().max(max).transform(stripNul)

// Caps are generous enough never to bite a real resume, but stop a crafted
// payload from writing megabytes of jsonb per row.
const entrySchema = z.object({
  id: z.string().min(1).max(64).transform(stripNul),
  title: txt(200),
  organisation: txt(200),
  location: txt(200),
  startDate: txt(40),
  endDate: txt(40).nullable(),
  current: z.boolean(),
  bullets: z.array(txt(1000)).max(20),
})

const ratedItemSchema = z.object({
  id: z.string().min(1).max(64).transform(stripNul),
  name: txt(120),
  level: txt(60),
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
    firstName: txt(100),
    lastName: txt(100),
    jobTitle: txt(150),
    email: txt(200),
    phone: txt(50),
    location: txt(150),
    linkedinUrl: txt(300),
    portfolioUrl: txt(300),
  }),
  summary: txt(4000),
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
      return { ...row, content: await readContent(row.content) }
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200).transform(stripNul),
        template: templateSchema.default("harvard"),
        jobId: z.string().min(1).nullable().default(null),
        /** Copy this resume's content instead of starting blank. */
        fromResumeId: z.string().min(1).nullable().default(null),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let content = emptyResume()

      // A scraper can hard-delete a listing between page load and submit. Without
      // this the insert trips the FK and tRPC returns a 500 whose message leaks
      // the constraint and table names.
      if (input.jobId) {
        const job = await ctx.db.query.jobs.findFirst({
          where: eq(jobs.id, input.jobId),
          columns: { id: true },
        })
        if (!job) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That job listing is no longer available.",
          })
        }
      }

      if (input.fromResumeId) {
        const source = await ctx.db.query.resumes.findFirst({
          where: and(eq(resumes.id, input.fromResumeId), eq(resumes.userId, ctx.user.id)),
        })
        if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Base resume not found" })
        content = await readContent(source.content)
      }

      const inserted = await ctx.db
        .insert(resumes)
        .values({
          userId: ctx.user.id,
          title: input.title,
          template: input.template,
          jobId: input.jobId,
          content: await writeContent(content),
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
        title: z.string().min(1).max(200).transform(stripNul).optional(),
        template: templateSchema.optional(),
        content: contentSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input
      const updated = await ctx.db
        .update(resumes)
        .set({
          ...patch,
          ...(patch.content ? { content: await writeContent(patch.content) } : {}),
          updatedAt: new Date(),
        })
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
   * Promote one resume to base.
   *
   * Clear-then-set used to be two independent round trips, so concurrent
   * callers (a double-click, two open tabs) interleaved as clear/clear/set/set
   * and left two or three bases; a crash between them left zero. `db.batch`
   * sends both statements to Neon as one HTTP request wrapped in a single
   * transaction — neon-http has no *interactive* transaction, but it does have
   * this non-interactive one, which is all an ordered pair of writes needs.
   *
   * The clear deliberately matches *every* one of the caller's resumes, the
   * target included, rather than only the rows where `is_base` is already true.
   * Two reasons, both found the hard way:
   *   • Filtering on `is_base` lets a concurrent promotion match zero rows, take
   *     no locks, and then collide on `resumes_user_id_is_base_idx` at commit.
   *   • Excluding the target makes each caller lock a different subset first,
   *     which deadlocks two callers promoting different resumes. Locking the
   *     identical row set in the identical order makes them queue instead.
   *
   * Both statements are scoped by userId, so neither can reach another user's
   * rows even if the pre-check below were somehow bypassed, and the partial
   * unique index enforces "at most one base per user" in the database itself.
   */
  setBase: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Still required: the writes below are no-ops for an id the caller does
      // not own, so without this lookup setBase would report success instead of
      // NOT_FOUND for someone else's resume.
      const owned = await ctx.db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.user.id)),
        columns: { id: true },
      })
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" })

      await ctx.db.batch([
        ctx.db.update(resumes).set({ isBase: false }).where(eq(resumes.userId, ctx.user.id)),
        ctx.db
          .update(resumes)
          .set({ isBase: true })
          .where(and(eq(resumes.id, input.id), eq(resumes.userId, ctx.user.id))),
      ])

      return { ok: true }
    }),
})
