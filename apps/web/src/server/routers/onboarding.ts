import { randomUUID } from "node:crypto"
import { presignUpload } from "@agora/ai"
import type { DB } from "@agora/db"
import { germanLevelEnum, userDocuments, userProfiles, visaTypeEnum } from "@agora/db/schema"
import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { weeklyHoursForVisa } from "../lib/visa"
import { getProfileQueue } from "../queue"
import { createTRPCRouter, protectedProcedure } from "../trpc"

const visaEnum = z.enum(visaTypeEnum.enumValues)
const germanEnum = z.enum(germanLevelEnum.enumValues)

type ProfileValues = Partial<typeof userProfiles.$inferInsert>

/** Insert-or-update the caller's single profile row (no unique index on user_id → manual upsert). */
async function upsertProfile(db: DB, userId: string, values: ProfileValues) {
  const existing = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) })
  if (existing) {
    await db
      .update(userProfiles)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
  } else {
    // Row is only ever created by saveVisaStep, which always supplies visaType
    // (the one NOT NULL column without a default). Other callers update an existing row.
    await db.insert(userProfiles).values({ userId, ...values } as typeof userProfiles.$inferInsert)
  }
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

  // Step 3a — presigned upload URL for the CV (PDF). Key is scoped to the user.
  createUploadUrl: protectedProcedure
    .input(z.object({ filename: z.string().min(1), contentType: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const key = `cv/${ctx.user.id}/${randomUUID()}-${input.filename}`
      const url = await presignUpload(key, input.contentType)
      return { url, key }
    }),

  // Step 3b — record the uploaded doc and enqueue PII-free extraction.
  confirmUpload: protectedProcedure
    .input(
      z.object({
        storageKey: z.string().min(1),
        filename: z.string().min(1),
        sizeBytes: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
        { jobId: `extract_profile_${ctx.user.id}`, removeOnComplete: 10, removeOnFail: 20 },
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
