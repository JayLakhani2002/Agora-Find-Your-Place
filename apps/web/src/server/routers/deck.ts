// Agent 5 — swipe deck API: the 4-step ranking pipeline + swipe actions.
//
// Pipeline (each step timed, deck target < 3s):
//   1. SQL hard filter   — legal eligibility at the query layer (@agora/db matching)
//   2. Vector similarity — cosine over 1024-dim HNSW (skipped if profile not embedded yet)
//   3. Keyword rerank    — pg_trgm similarity of description vs user skills
//   4. LLM reranker      — Claude HAIKU via Bedrock (never Sonnet/Opus: ranking is
//                          high-volume; Sonnet is Agent 6's generation model)
//
// A right-swipe hands off to Agent 6 by creating the application row with
// generationStatus "pending" — no document generation happens here.

import { invokeClaudeJSON } from "@agora/ai"
import {
  type EligibleJobRow,
  getLegallyEligibleUnseenJobs,
  keywordRankJobs,
  vectorRankJobs,
} from "@agora/db/queries/matching"
import { applications, userJobActions, userProfiles } from "@agora/db/schema"
import {
  type EligibilityResult,
  type GermanLevel,
  type VisaType,
  allowedContractTypesFor,
  checkEligibility,
  germanLevelSatisfies,
  maxWeeklyHoursFor,
} from "@agora/legal"
import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"

const DECK_SIZE = 25
const VECTOR_POOL = 50
const LLM_RERANK_POOL = 30

/**
 * Hard ceiling on step 4. Bedrock latency is bimodal — usually ~200ms for the
 * whole pool, but under throttling it has been measured at 19.8s, which is the
 * deck's total latency because the reranker sits on the critical path.
 * The combined vector+keyword signal is already the designed fallback, so
 * blowing this budget costs ranking quality, never a broken deck.
 */
const RERANK_BUDGET_MS = 2500

type Profile = typeof userProfiles.$inferSelect

// ── Pure helpers (exported for unit tests) ────────────────────────────────────

/**
 * Per-dimension eligibility ticks shown on each card. These reflect the real
 * filter state: `true`/`false` are verified against profile + job data;
 * `null` means the job didn't state the field, so it couldn't be verified.
 */
export type CardTicks = {
  visa: boolean
  hours: boolean | null
  german: boolean
  salary: boolean | null
  skills: boolean | null
}

export function buildTicks(
  job: Pick<
    EligibleJobRow,
    "hoursPerWeek" | "hourlyRate" | "germanLevelRequired" | "requiredSkills"
  >,
  profile: Pick<Profile, "weeklyHoursLimit" | "germanLevel" | "minHourlyRate" | "skills">,
  eligibility: EligibilityResult,
): CardTicks {
  const userSkills = new Set((profile.skills ?? []).map((s) => s.toLowerCase().trim()))
  const required = job.requiredSkills ?? []

  return {
    // Hard-filter dimensions: true by construction for every card served, but
    // computed from the engine result so the tick can never drift from reality.
    visa: eligibility.eligible,
    hours: job.hoursPerWeek === null ? null : job.hoursPerWeek <= profile.weeklyHoursLimit,
    german: germanLevelSatisfies(
      profile.germanLevel as GermanLevel | null,
      job.germanLevelRequired as GermanLevel | null,
    ),
    salary:
      job.hourlyRate === null
        ? null
        : profile.minHourlyRate === null || job.hourlyRate >= profile.minHourlyRate,
    skills:
      required.length === 0 ? null : required.some((s) => userSkills.has(s.toLowerCase().trim())),
  }
}

/**
 * Blend the dense (vector) and lexical (keyword) signals into one 0–1 score
 * used to pick the LLM-rerank pool and as the fallback when Haiku is
 * unavailable. Weights favour the semantic signal.
 */
export function combineSignals(
  vectorSimilarity: number | null,
  keywordScore: number | null,
): number {
  const vec = vectorSimilarity ?? 0
  const kw = keywordScore ?? 0
  return 0.7 * vec + 0.3 * kw
}

/**
 * Resolve `work`, or give up and return `fallback` once `budgetMs` elapses.
 * The loser keeps running — we simply stop waiting on it — so this bounds
 * latency, not cost. Always clears its timer: a live timer would hold the
 * request's event loop open after the response was sent.
 */
export async function withBudget<T>(
  work: Promise<T>,
  budgetMs: number,
  fallback: T,
): Promise<{ value: T; timedOut: boolean }> {
  const TIMEOUT = Symbol("timeout")
  let timer: ReturnType<typeof setTimeout> | undefined
  const raced = await Promise.race([
    work,
    new Promise<typeof TIMEOUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMEOUT), budgetMs)
    }),
  ])
  if (timer) clearTimeout(timer)
  return raced === TIMEOUT
    ? { value: fallback, timedOut: true }
    : { value: raced as T, timedOut: false }
}

// ── Step 4: Haiku reranker ─────────────────────────────────────────────────────

const RERANK_SYSTEM =
  "You evaluate whether an international student in Germany would get an interview " +
  "callback for a Werkstudent-type role. Respond ONLY with a JSON object of the form " +
  '{"score": 7.5} where score is 0-10 (skill match and experience fit).'

async function haikuScore(
  profileStr: string,
  job: Pick<EligibleJobRow, "title" | "description">,
): Promise<number | null> {
  try {
    const result = await invokeClaudeJSON<{ score: number }>({
      model: "haiku",
      maxTokens: 64,
      system: RERANK_SYSTEM,
      prompt: `Student profile: ${profileStr}\n\nJob: ${job.title}\nDescription: ${job.description.slice(0, 500)}`,
    })
    const score = Number(result?.score)
    if (!Number.isFinite(score)) return null
    return Math.min(10, Math.max(0, score))
  } catch {
    // Reranker is best-effort: a Bedrock hiccup must never break the deck.
    return null
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

export const deckRouter = createTRPCRouter({
  getDeck: protectedProcedure.query(async ({ ctx }) => {
    const timings: Record<string, number> = {}
    const started = performance.now()
    const mark = (step: string, from: number) => {
      timings[step] = Math.round(performance.now() - from)
    }

    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.user.id),
    })
    if (!profile) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Complete onboarding before requesting a deck",
      })
    }
    const visaType = profile.visaType as VisaType

    // Step 1 — SQL hard filter (legal eligibility + unseen), then the full
    // pure-TS engine as defense in depth: it additionally enforces the annual
    // day limit, enrollment, and the Minijob ceiling. Nothing ineligible
    // survives past this point — the client never sees it.
    let t = performance.now()
    const pool = await getLegallyEligibleUnseenJobs(ctx.db, {
      userId: ctx.user.id,
      visaType,
      maxWeeklyHours: maxWeeklyHoursFor(visaType),
      allowedContractTypes: allowedContractTypesFor(visaType),
    })
    const eligible = pool
      .map((job) => ({
        job,
        eligibility: checkEligibility(
          visaType,
          {
            contractType: job.contractType,
            hoursPerWeek: job.hoursPerWeek,
            hourlyRate: job.hourlyRate,
          },
          {
            daysRemainingThisYear: profile.daysRemainingThisYear,
            enrollmentStatus: profile.enrollmentStatus,
          },
        ),
      }))
      .filter((e) => e.eligibility.eligible)
    mark("step1_sql_filter_ms", t)

    const byId = new Map(eligible.map((e) => [e.job.id, e]))

    // Step 2 — vector similarity (cosine, HNSW). If the profile embedding has
    // not landed yet (extraction queue lag), degrade gracefully to the keyword
    // signal over the SQL pool instead of serving an empty deck.
    t = performance.now()
    const vectorScores = new Map<string, number>()
    let candidateIds = eligible.map((e) => e.job.id)
    if (profile.profileEmbedding) {
      const ranked = await vectorRankJobs(
        ctx.db,
        profile.profileEmbedding,
        candidateIds,
        VECTOR_POOL,
      )
      for (const r of ranked) vectorScores.set(r.id, r.similarity)
      if (ranked.length > 0) candidateIds = ranked.map((r) => r.id)
    }
    mark("step2_vector_ms", t)

    // Step 3 — pg_trgm keyword rerank over the vector pool.
    t = performance.now()
    const keywordScores = new Map<string, number>()
    const kwRanked = await keywordRankJobs(ctx.db, profile.skills ?? [], candidateIds)
    for (const r of kwRanked) keywordScores.set(r.id, r.keywordScore)
    mark("step3_keyword_ms", t)

    const combined = candidateIds
      .map((id) => ({
        id,
        combined: combineSignals(vectorScores.get(id) ?? null, keywordScores.get(id) ?? null),
      }))
      .sort((a, b) => b.combined - a.combined)

    // Step 4 — Claude Haiku scores the top pool; combined signal is the
    // fallback score for any call that fails.
    t = performance.now()
    const rerankPool = combined.slice(0, LLM_RERANK_POOL)
    const profileStr = `Skills: ${(profile.skills ?? []).join(", ")}. ${profile.experienceSummary ?? ""}`
    // Bounded: on timeout every score is null and the combined vector+keyword
    // signal below ranks the deck instead, so a throttled Bedrock degrades
    // ranking quality rather than stalling the user for 20 seconds.
    const { value: llmScores, timedOut } = await withBudget(
      Promise.all(
        rerankPool.map(async ({ id }) => {
          const entry = byId.get(id)
          if (!entry) return { id, score: null as number | null }
          return { id, score: await haikuScore(profileStr, entry.job) }
        }),
      ),
      RERANK_BUDGET_MS,
      rerankPool.map(({ id }) => ({ id, score: null as number | null })),
    )
    mark("step4_llm_rerank_ms", t)
    if (timedOut) {
      console.warn(
        JSON.stringify({
          event: "deck_rerank_timeout",
          budgetMs: RERANK_BUDGET_MS,
          userId: ctx.user.id,
        }),
      )
    }

    const llmById = new Map(llmScores.map((s) => [s.id, s.score]))
    const deck = rerankPool
      .map(({ id, combined: combinedScore }) => {
        const entry = byId.get(id)
        if (!entry) return null
        const matchScore = llmById.get(id) ?? combinedScore * 10
        return { entry, matchScore: Math.round(matchScore * 10) / 10 }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, DECK_SIZE)

    timings.total_ms = Math.round(performance.now() - started)
    console.info(
      JSON.stringify({ event: "deck_built", userId: ctx.user.id, cards: deck.length, ...timings }),
    )

    return {
      cards: deck.map(({ entry, matchScore }) => ({
        jobId: entry.job.id,
        title: entry.job.title,
        company: entry.job.company,
        location: entry.job.location,
        contractType: entry.job.contractType,
        hourlyRate: entry.job.hourlyRate,
        hoursPerWeek: entry.job.hoursPerWeek,
        sourceUrl: entry.job.sourceUrl,
        matchScore,
        ticks: buildTicks(entry.job, profile, entry.eligibility),
        eligibilityReasons: entry.eligibility.reasons,
      })),
      timings,
    }
  }),

  swipe: protectedProcedure
    .input(
      z.object({
        jobId: z.string().min(1),
        action: z.enum(["right", "left", "save"]),
        matchScore: z.number().min(0).max(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Idempotent: the unique (user_id, job_id) index makes repeat swipes
      // no-ops instead of errors; only the first swipe wins.
      const inserted = await ctx.db
        .insert(userJobActions)
        .values({
          userId: ctx.user.id,
          jobId: input.jobId,
          action: input.action,
          matchScore: input.matchScore,
        })
        .onConflictDoNothing({ target: [userJobActions.userId, userJobActions.jobId] })
        .returning({ id: userJobActions.id })

      const recorded = inserted.length > 0

      // Right-swipe hands off to Agent 6: create the application shell with
      // generationStatus "pending" (the default). Agent 6's worker owns
      // everything from here — no generation happens in this router.
      if (recorded && input.action === "right") {
        await ctx.db.insert(applications).values({
          userId: ctx.user.id,
          jobId: input.jobId,
          auditLog: [
            {
              timestamp: new Date().toISOString(),
              action: "application_created_from_right_swipe",
              actor: "user" as const,
            },
          ],
        })
      }

      return { recorded, action: input.action }
    }),
})
