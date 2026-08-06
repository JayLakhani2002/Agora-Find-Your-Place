import type { DB } from "@agora/db"
import { germanLevelEnum, userDocuments, userProfiles, visaTypeEnum } from "@agora/db/schema"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { weeklyHoursForVisa } from "../lib/visa"
import { getProfileQueue } from "../queue"
import { aiProcedure, createTRPCRouter, protectedProcedure } from "../trpc"

const visaEnum = z.enum(visaTypeEnum.enumValues)
const germanEnum = z.enum(germanLevelEnum.enumValues)

type ProfileValues = Partial<typeof userProfiles.$inferInsert>

/**
 * Insert-or-update the caller's single profile row.
 *
 * One statement, not check-then-insert: neon-http has no interactive transaction, so
 * the old read-then-branch let two concurrent calls (double-click, client retry) both
 * observe "no row" and both insert. Every later findFirst then read a coin-flip profile.
 * Backed by the unique index on user_profiles.user_id.
 *
 * Only saveVisaStep supplies visaType (the one NOT NULL column without a default), so an
 * insert from any other caller still fails loudly rather than writing a half-built row.
 */
async function upsertProfile(db: DB, userId: string, values: ProfileValues) {
  await db
    .insert(userProfiles)
    .values({ userId, ...values } as typeof userProfiles.$inferInsert)
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { ...values, updatedAt: new Date() },
    })
}

export const onboardingRouter = createTRPCRouter({
  getState: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.user.id),
    })
    const cv = await ctx.db.query.userDocuments.findFirst({
      where: and(eq(userDocuments.userId, ctx.user.id), eq(userDocuments.fileType, "cv_upload")),
    })
    return {
      onboardingComplete: profile?.onboardingComplete ?? false,
      hasVisaStep: !!profile?.visaType,
      hasCv: !!cv,
      extractionComplete: !!profile?.profileEmbedding,
      profile: profile ?? null,
    }
  }),

  // Step 1 — visa & legal. Sets the weekly hours cap from the visa type.
  saveVisaStep: protectedProcedure
    .input(
      z.object({
        visaType: visaEnum,
        daysRemainingThisYear: z.number().int().min(0).max(365).optional(),
        semesterEnd: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await upsertProfile(ctx.db, ctx.user.id, {
        visaType: input.visaType,
        weeklyHoursLimit: weeklyHoursForVisa(input.visaType),
        daysRemainingThisYear: input.daysRemainingThisYear ?? null,
        semesterEnd: input.semesterEnd ?? null,
      })
      return { ok: true }
    }),

  // Step 2 — preferences.
  savePreferences: protectedProcedure
    .input(
      z.object({
        germanLevel: germanEnum,
        preferredFields: z.array(z.string().min(1)).max(10).default([]),
        locationPreference: z.string().min(1).default("Berlin"),
        minHourlyRate: z.number().min(0).max(200).optional(),
        availableFrom: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await upsertProfile(ctx.db, ctx.user.id, {
        germanLevel: input.germanLevel,
        preferredFields: input.preferredFields,
        locationPreference: input.locationPreference,
        minHourlyRate: input.minHourlyRate ?? null,
        availableFrom: input.availableFrom ?? null,
      })
      return { ok: true }
    }),

  // Step 3 — record the uploaded doc and enqueue PII-free extraction.
  // Upload itself goes through /api/upload/cv (server-side S3 proxy, no CORS).
  confirmUpload: aiProcedure
    .input(
      z.object({
        storageKey: z.string().min(1),
        filename: z.string().min(1),
        sizeBytes: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // The key must live under the caller's own prefix (/api/upload/cv writes
      // `cv/${clerkId}/…`). Without this check a caller who learns someone else's key
      // can register the victim's CV as their own document — the extraction worker then
      // reads it into the attacker's profile, and the attacker's later account deletion
      // collects that key and deletes the victim's file.
      if (!input.storageKey.startsWith(`cv/${ctx.user.clerkId}/`)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid storage key" })
      }
      await ctx.db.insert(userDocuments).values({
        userId: ctx.user.id,
        storageKey: input.storageKey,
        fileType: "cv_upload",
        filename: input.filename,
        sizeBytes: input.sizeBytes ?? null,
      })
      await getProfileQueue().add(
        "extract-profile",
        { userId: ctx.user.id, storageKey: input.storageKey },
        // jobId keyed on the storage key, not just the user: BullMQ silently drops an
        // add() whose jobId already exists, and removeOnComplete:10 retains completed
        // jobs — so a per-user id meant the SECOND CV upload was discarded and the
        // profile kept reflecting the first one, with no error anywhere.
        {
          jobId: `extract_profile_${input.storageKey}`,
          removeOnComplete: 10,
          removeOnFail: 20,
        },
      )
      return { ok: true }
    }),

  extractionStatus: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.user.id),
    })
    return { complete: !!profile?.profileEmbedding }
  }),

  complete: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.user.id),
    })
    if (!profile?.visaType) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Complete the visa step first" })
    }
    await ctx.db
      .update(userProfiles)
      .set({ onboardingComplete: true, updatedAt: new Date() })
      .where(eq(userProfiles.userId, ctx.user.id))
    return { ok: true }
  }),
})
