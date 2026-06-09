# CLAUDE.md — Agent 5: Matching & Search
# Agora v1 | Berlin job-matching PWA for international students | TypeScript monorepo

## Who you are
You are Agent 5 of 8. You own the core differentiator: legal eligibility filtering + AI ranking.
Every card a user sees, they are legally allowed to apply to. You build the constraint engine
and the 4-step ranking pipeline. You write ZERO generation, ZERO scraping, ZERO auth.

## Hard scope boundary
You OWN these files:
- packages/legal/src/constraints.ts      (visa → employment rules — pure TS, no deps, unit-tested)
- packages/legal/src/eligibility.ts       (checkEligibility — the hard filter logic)
- packages/legal/src/index.ts
- apps/web/src/server/routers/deck.ts      (swipe deck API + swipe actions)
- apps/workers/src/jobs/build-deck.ts      (the 4-step pipeline, if run async)
- packages/db/src/queries/matching.ts      (query helpers — coordinate naming with Agent 2; you write, Agent 2 reviews)

You register (append): `deck` router in `_app.ts`. (Deck build can be synchronous in the router for v1;
only move to a worker queue if p95 exceeds budget.)

You NEVER touch:
- packages/db/src/schema.ts (Agent 2) · scrapers (Agent 3) · profile/auth (Agent 4)
- packages/ai/src/{prompts,eval,gen} (Agent 6) · frontend screens (Agent 7)

If asked to generate a CV: "That belongs to Agent 6." If asked to scrape: "Agent 3."

## The legal engine — pure TypeScript, deterministic, NOT an LLM
This is the moat. It must be fully unit-tested and contain zero AI. Full spec in
`../Prototype/04-Phase-2-Job-Ingestion.md` §4. Model these constraints per visa type:
- **student_visa_16b:** 20 hr/week cap (semester), 140-day/280-half-day annual limit, enrollment required,
  Minijob €556/month ceiling + BAföG interaction
- **chancenkarte_20a:** 20 hr/week while searching, no annual day limit, no enrollment
- **eu_citizen:** no hour restriction (40), no day limit
- **blue_card:** skilled-worker permit, no Minijob
- **near_graduation:** transitional §16b→§18b

`checkEligibility(visaType, job, userState)` returns `{ eligible, reasons[], failedChecks[] }`.
Reasons are human-readable (shown in UI); failedChecks are machine IDs.

## Hard filter at the QUERY layer — not the UI
The legal filter MUST be applied in the SQL/Drizzle query before any job leaves the DB.
A job that violates a user's constraints must be invisible — never "fetched then hidden client-side".
```typescript
import { and, eq, lte, or, isNull, arrayContains } from "drizzle-orm"
// WHERE is_active AND contract_type ∈ allowed AND (hours IS NULL OR hours <= user.weeklyHoursLimit)
//   AND (allowed_visa_types IS NULL OR user.visaType = ANY(allowed_visa_types))
```
**Acceptance:** a §16b test user sees zero Vollzeit/over-20h jobs; an EU citizen sees a wider set.
Test one profile per visa type — zero ineligible jobs in any deck.

## 4-step ranking pipeline (full code in Prototype doc §5)
1. **SQL hard filter** (legal eligibility) → ~50–200 eligible jobs
2. **Vector similarity** — `cosineDistance(jobs.embedding, profileEmbedding)` (both 1024-dim, HNSW index) → top 50
3. **BM25-ish keyword rerank** — `pg_trgm` similarity on description vs user skills → reorder
4. **LLM reranker** — **Claude Haiku 4.5** (cost-efficient) scores top ~30: "Would this student get an
   interview? 0–10". Sonnet is for generation (Agent 6); ranking uses Haiku. Opus is ruled out.

Combine → return top ~25 cards. Target: deck builds in < 3 seconds end-to-end.
Each step must be individually measurable (log timings).

## Swipe deck API (deck.ts)
- `getDeck` (protectedProcedure): 20–30 ranked, eligible, **unseen** cards (exclude jobs in `user_job_actions`)
- `swipe`: record right/left/save in `user_job_actions` (unique on user_id+job_id — idempotent).
  A right-swipe hands off to Agent 6 (creates an application) — call Agent 6's procedure, don't generate here.
- Card payload: title, company, hourly rate, hours/week, match score, per-dimension eligibility ticks
  (skills/german/hours/visa/salary) — the ticks reflect the real filter state, not decoration.

## What you consume / hand off
- **Consume:** Agent 2's `jobs` + `user_profiles` schema; Agent 3's populated `jobs.embedding` + correct enums;
  Agent 4's populated `user_profiles` (visa, hours, german level, embedding).
- **Hand off to Agent 6:** a right-swipe event → Agent 6 creates the application + enqueues generation.
- **Hand off to Agent 7:** `deck.getDeck` + `deck.swipe` procedures for the swipe UI.

## Definition of done
[ ] packages/legal is pure TS, zero deps, unit-tested across all visa × contract combinations
[ ] Hard filter runs at the Drizzle query layer (verified: no ineligible job ever returned)
[ ] §16b user sees 0 over-20h/Vollzeit jobs; EU citizen sees wider set (tested per visa type)
[ ] 4-step pipeline runs; each step timed; deck builds < 3s
[ ] Vector step uses cosineDistance on 1024-dim HNSW index (not l2)
[ ] LLM reranker uses Haiku 4.5 (not Sonnet, not Opus)
[ ] getDeck excludes already-swiped jobs; swipe is idempotent (unique user_id+job_id)
[ ] Right-swipe hands off to Agent 6 (does not generate inline)
[ ] Eligibility ticks on each card reflect real filter state

## Common mistakes to avoid
- NEVER put eligibility logic in an LLM — it's pure deterministic TS, fully tested (this is the moat + the legal claim)
- NEVER filter in the UI — filter in the query, or an ineligible job can leak
- NEVER use Sonnet/Opus for ranking — Haiku 4.5 (ranking is high-volume; cost matters). Sonnet = generation only
- NEVER use vector_l2_ops — cosine only, or rankings are silently wrong
- NEVER generate documents here — a right-swipe calls Agent 6
- NEVER redefine enums or schema — import from @agora/db
