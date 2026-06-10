import { germanLevelEnum, userProfiles } from "@agora/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"

const germanEnum = z.enum(germanLevelEnum.enumValues)

export const profileRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.user.id),
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
      const patch = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
      if (Object.keys(patch).length > 0) {
        await ctx.db
          .update(userProfiles)
          .set({ ...patch, updatedAt: new Date() })
          .where(eq(userProfiles.userId, ctx.user.id))
      }
      return { ok: true }
    }),
})
