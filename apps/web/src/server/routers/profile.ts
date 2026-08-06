import { germanLevelEnum, userProfiles } from "@agora/db/schema"
import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"

const germanEnum = z.enum(germanLevelEnum.enumValues)

export const profileRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.user.id),
      // Explicit projection: the unfiltered row shipped the 1024-dim profileEmbedding
      // to the browser on every settings load and every review-screen Pre-fills panel —
      // tens of KB of floats the client immediately drops.
      columns: { profileEmbedding: false },
    })
    return profile ?? null
  }),

  update: protectedProcedure
    .input(
      z.object({
        germanLevel: germanEnum.optional(),
        locationPreference: z.string().min(1).optional(),
        minHourlyRate: z.number().min(0).max(200).optional(),
        preferredFields: z.array(z.string().min(1)).max(10).optional(),
        availableFrom: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only update provided fields — never null out values the user didn't touch.
      // `null` is meaningful here (clear the field) and survives the filter; only
      // `undefined` (field absent) is dropped.
      const patch = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
      if (Object.keys(patch).length === 0) return { ok: true }

      // .returning() so a user who never completed onboarding gets an error instead of
      // a green "Saved" over an UPDATE that matched zero rows.
      const updated = await ctx.db
        .update(userProfiles)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(userProfiles.userId, ctx.user.id))
        .returning({ id: userProfiles.id })

      if (updated.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No profile to update — finish onboarding first.",
        })
      }
      return { ok: true }
    }),
})
