# Database Bug-Fix Report — 2026-08-06

Principal Data Engineer review of the Agora Jobs database across all three surfaces the
brief named: **user side** (auth, profiles, GDPR), **client side** (the Next.js app's
data layer), and **data side** (ingestion, classification, embeddings).

**Method.** Four parallel research audits (Fable 5) over the server data-access layer,
the client tRPC layer, the ingestion pipeline, and the migration/schema stream —
cross-checked against a live introspection of the production Neon database (structure,
indexes, FK delete rules, row-level data quality, and `EXPLAIN ANALYZE` on every query
in the matching pipeline). Every finding below was confirmed against the real database
or the real file, not inferred.

**Status.** 26 defects fixed in code. All 159 tests pass; all packages typecheck; lint
clean. **Three production actions still require your authorisation** — see
[INPUTS-NEEDED-FROM-JAY.md](INPUTS-NEEDED-FROM-JAY.md).

---

## 1. Critical — data integrity and legal exposure

### 1.1 Full-time jobs were labelled as student jobs (legal filter corruption)
`apps/workers/src/scrapers/classifier.ts`

`classifyContractType` fell through to `"werkstudent"` for any unlabelled posting on
Berlin Startup Jobs and jobicco. `requiresEnrollment` is derived directly from
`contractType`, so this is not a display bug: it told a §16b student visa holder that a
full-time role fits inside their 20 h/week, 120-day limit.

Production evidence: two live rows carried `contract_type = 'werkstudent'` with
`hours_per_week = 40` (Buena GmbH, sofatutor). 56 rows are misclassified in total.

**Fix.** Unlabelled postings now default to `vollzeit` on every source. Guessing wrong
toward `vollzeit` only hides an eligible job; guessing wrong toward `werkstudent`
surfaces one the user cannot lawfully take. Fail in the safe direction.

### 1.2 GDPR erasure orphaned users' CVs in object storage
`apps/web/src/server/routers/gdpr.ts`, `apps/web/src/server/lib/erasure.ts`

`deleteAccount` ran `Promise.allSettled` over the storage deletes, **never inspected the
results**, then deleted the `users` row. That row is the only record of which objects
belong to the person. A 30-second storage outage meant every CV and cover letter stayed
in the bucket permanently with nothing left to find them by — while the endpoint
returned `{ ok: true }`.

**Fix.** Extracted `eraseUserAndStorage()`. Storage deletion now happens first and must
succeed; a rejection aborts before the DB row is touched. (Verified S3 `DeleteObject` is
idempotent, so an already-missing key returns success — a rejection is a real outage,
never a benign 404, so aborting cannot block a legitimate erasure.)

### 1.3 Deleting a user from Clerk bypassed storage erasure entirely
`apps/web/src/app/api/webhooks/clerk/route.ts`

The `user.deleted` webhook ran a bare `db.delete(users)`. A deletion started from the
Clerk dashboard, the account portal, or the admin API never passes through
`gdpr.deleteAccount`, so it cascaded away the storage keys without deleting a single
file. Same permanent PII orphaning as 1.2, on a path that exists today.

**Fix.** The webhook now calls the same `eraseUserAndStorage()`.

### 1.4 "Erased" accounts could resurrect
`apps/web/src/server/routers/gdpr.ts`

If the Clerk delete call failed, the error was logged and `{ ok: true }` returned
anyway. The Clerk user survived holding the person's email, their session stayed valid,
and `protectedProcedure`'s just-in-time provisioning re-created the row on their very
next request.

**Fix.** A Clerk failure now throws, so the user is told to retry instead of being told
their data is gone when it isn't.

### 1.5 Fabricated job listings live in production under real company names
`apps/workers/src/seed-jobs.ts`

10 hand-written postings attributed to **Zalando, Delivery Hero, SumUp, Personio, N26,
HelloFresh, Contentful, Tier Mobility, Babbel and Flixbus**, with invented URLs. They are
active, embedded, and matchable — nothing in the read path filters `source = 'seed'`. A
user can generate a CV for and attempt to apply to a listing that never existed.

**Fix.** The seed script now refuses to run against `NODE_ENV=production` without
`--force`. **The 10 live rows still need deleting** — see the pending actions.

---

## 2. High — correctness and revenue

### 2.1 The free-tier quota gate was dead code on the product's main path
`apps/web/src/server/routers/applications.ts`, `packages/billing/src/quota.ts`

`checkApplicationQuota` was called only in the branch that creates a *new* application.
But `deck.swipe` already creates the application shell on every right-swipe, so on the
normal flow `existing` is always set and the gate never ran. Once `BILLING_ENABLED=true`,
a free user could right-swipe 100 jobs and get 100 Opus generations.

**Fix.** The gate now runs before the enqueue on both branches. Added an
`excludeApplicationId` parameter so the already-created shell isn't counted against
itself (which would otherwise reject the Nth request at N−1).

### 2.2 A failed generation was permanently unretryable while the UI claimed success
`apps/web/src/server/routers/applications.ts`

BullMQ silently drops an `add()` whose `jobId` already exists, and `removeOnFail: 50`
*retains* failed jobs. Once the 3 attempts were exhausted, every later retry was a no-op
while the router still returned `enqueued: true`.

Production evidence: 4 applications stuck at `generation_status = 'failed'` since June
and July, each with 3–6 `generation_failed` audit entries reading *"The provided model
identifier is invalid."* 5 more sit at `pending` from June with nothing in the queue.

**Fix.** The stale queue job is removed before re-adding, so a re-tap actually re-runs.
(The underlying Bedrock model-ID misconfiguration is a separate issue — flagged in the
inputs doc.)

### 2.3 213 jobs invisible to matching; the pipeline could strand more
`apps/workers/src/jobs/embed-jobs.ts`, `apps/workers/src/index.ts`, `scripts/run-*.ts`

23% of the catalogue has no embedding, and the gap is perfectly source-correlated —
`tu_berlin` (128), `berlin_startup_jobs` (70), `jobicco` (15) are 0% embedded, while
`arbeitsagentur` and `arbeitnow` are 100%. Three compounding causes:

- The manual `run-*.ts` scripts insert jobs but never embed them.
- The embedding queue job had **no retry** — one Bedrock throttle failed it with nothing
  to pick up the remainder until the next nightly cycle.
- A single failed batch inside `embedPendingJobs` aborted the whole pass, stranding every
  later job.

**Fix.** All three runner scripts now embed after scraping; the queue job gets
`attempts: 3` with exponential backoff; a failed batch is skipped and retried next pass
rather than killing the run.

### 2.4 Dead jobs accumulated forever
`apps/workers/src/scrapers/base.ts`, `apps/workers/src/index.ts`

Nothing in the codebase ever wrote `is_active = false`. Every reader's `WHERE is_active`
filter was decorative. 718 jobs (77%) had not been re-seen since 2026-07-11 and were all
still active and matchable.

**Fix.** Added `deactivateStaleJobs(source, savedCount, staleAfterDays)`, called after
each successful scrape. Guarded on `savedCount > 0` so a failed or empty fetch can never
mass-deactivate a healthy source.

### 2.5 One bad row could discard an entire scrape run
`apps/workers/src/scrapers/normalizer.ts`

`sourceUrl` was passed through unvalidated into a NOT NULL column, and `saveJobs` writes
the whole batch in **one** insert — so a single feed row with a missing URL raised a
constraint violation that threw away every record in that run. An empty string would
pass the constraint and ship a dead Apply link.

**Fix.** `normalizeJob` drops records without a valid `http(s)` URL.

---

## 3. Schema integrity

Migration `0005_keen_sharon_ventura.sql` (generated, **not yet applied** — see pending
actions):

| Change | Why |
|---|---|
| `user_profiles_user_id_idx` → **UNIQUE** | The relation is `one()`, but onboarding used check-then-insert and neon-http has no interactive transaction. Two concurrent `saveVisaStep` calls both saw no row and both inserted; every later `findFirst` read a coin-flip profile. |
| **`applications_user_id_job_id_idx` UNIQUE** (new) | `deck.swipe` and `applications.create` both insert and the client fired them in parallel — producing two rows for one job, one stuck in "Preparing…" forever. NULL `job_id` rows are exempt, which is correct for applications whose listing was later removed. |
| `jobs_is_active_scraped_at_idx` (new) | `jobs.search` filters `isActive` then orders by `scrapedAt desc`, sorting the whole active set on every search. |
| `jobs_source_scraped_at_idx` (new) | Supports the new staleness sweep. |

Correspondingly: `upsertProfile` is now a single `onConflictDoUpdate` statement, and both
application writers use `onConflictDoNothing` with a re-read on the losing side of the race.

**Verified clean** (no action needed): all 5 prior migrations are applied; zero drift
between `schema.ts` and the live database; every `user_id` FK really is `ON DELETE
CASCADE` in the deployed DDL; `vector` and `pg_trgm` both installed; `applications.job_id`
and `resumes.job_id` really are `SET NULL`.

---

## 4. Security and privacy

| Fix | File |
|---|---|
| `confirmUpload` accepted **any** storage key — a caller with someone else's key could register the victim's CV as their own document (the extraction worker then reads it into the attacker's profile, and the attacker's later account deletion deletes the victim's file). Now validated against the caller's own `cv/{clerkId}/` prefix. | `routers/onboarding.ts` |
| `deck.swipe` accepted any `jobId` unchecked — a nonexistent id surfaced a raw 500 leaking constraint and table names, and an inactive or ineligible listing could be swiped straight into a generation. Now validated against active jobs. | `routers/deck.ts` |
| `profile.get` shipped the raw row **including the 1024-dim `profileEmbedding`** to the browser on every settings load and review screen. Now explicitly projected. | `routers/profile.ts` |
| The deck's step-1 query did `select()` — 500 rows × 1024 floats over neon-http on the sub-3s critical path, for a column no caller reads. Now an explicit column list. | `packages/db/src/queries/matching.ts` |

---

## 5. Client-side data layer

| Fix | Detail |
|---|---|
| **Approve → Submit dead end** | Nothing invalidated `getWithDocuments` after approving. The submit page mounts the same query key and the 60 s `staleTime` served the stale `generated` row, so it told the user *"Review comes first"* — and going back and approving again failed with `Cannot approve from status "approved"`. Now invalidates before navigating. Same for `markSubmitted` → tracker. |
| **Infinite spinner on a failed download** | `doc.isLoading \|\| text === null` was checked *before* `doc.isError`; on failure `isLoading` goes false but `text` stays null, so the error branch was unreachable and a storage outage rendered "Loading CV…" forever. Branches reordered. |
| **Swipe/create race** | The dashboard fired `swipe.mutate` and `createApplication.mutate` in parallel with no `onError`. Now chained through a `swipeInFlight` ref, with an error surfaced instead of a row silently stuck in "Preparing…". |
| **Deck served already-swiped cards** | No cache invalidation after a swipe; navigating away and back within 60 s re-served the same cards. Now removes the card from the cached deck and invalidates `applications.list`. |
| **Settings silently saved nothing** | `profile.update` ran an UPDATE matching zero rows for a user who skipped onboarding, and still returned `{ ok: true }` — the button flipped to "Saved". Now uses `.returning()` and throws `NOT_FOUND`. The page also had no `isError` branch, so a DB failure rendered the form with hardcoded defaults (German B1) inviting the user to save over data they couldn't see. Both added. |
| **Stale profile after save** | `profile.update` never invalidated `profile.get`. Added. |

---

## 6. Data-quality defects found in the live database

These are **stale rows written before the code fixes above** — the scrapers now produce
correct data, but nothing re-processes existing rows. A repair script is ready and
dry-run verified (`apps/workers/scripts/repair-jobs-data.ts`):

| Defect | Rows | Cause |
|---|---:|---|
| Poisoned skill extraction | **369** | Substring matching tagged `"git"` from *di**git**al*, `"rust"` from *t**rust***, `"go"` from anything. 233 jobs claimed Git, 242 claimed Go, 48 claimed Rust. The regex was fixed in code on 2026-08-06; the rows were never re-classified, so the bad values still feed keyword ranking. |
| HTML entities + soft hyphens | **370** | `&amp;`, `&#x26;`, `&#xfc;` stored verbatim (282 rows). TU Berlin embeds U+00AD soft hyphens inside words, so *"Fraunhofer Heinrich-Hertz-Institut"* is stored as `Fraun\xADho\xADfer…` — invisible on screen but it forks the company name and breaks grouping and search (57 rows). Root cause fixed in `stripHtml`/`decodeEntities`. |
| `hourly_rate = 0` | **49** | A parse failure stored as a fact. Breaks the `minHourlyRate` filter and displays €0/h. |
| Misclassified contract type | **56** | Defect 1.1 above — flips `requires_enrollment` on all 56. |
| Fabricated seed jobs | **10** | Defect 1.5 above. |
| Rows needing re-embedding | **298** | Their description text changes during repair. |

Also recorded, no action taken (informational): 21 rows are true content duplicates
posted under different external IDs (19 identical "MTR / MTRA" ads); `location` is
entirely unnormalised (`Berlin`, `Berlin 10179`, `Deutschland, Berlin`,
`Berlin, Berlin, Germany`); 929 of 931 jobs have `allowed_visa_types = NULL`, which the
matching query treats as "no restriction", so the visa filter is effectively open.

---

## 7. Verified as correct — no change made

Recording these so they aren't re-investigated:

- **HNSW vector indexes are healthy but unused.** `idx_scan = 0` on both since creation.
  This is *correct planner behaviour*: at 931 rows a sequential scan (2.9 ms) genuinely
  beats the index, and the real pipeline pre-filters to ≤500 candidate IDs before
  ranking, which no HNSW index can serve. Re-check when the catalogue passes ~10k.
- Migration stream ↔ `schema.ts`: zero drift.
- User-ownership scoping: every `.where()` on every user-owned table includes
  `ctx.user.id`.
- Nullable embedding handling: all three vector paths correctly filter `IS NOT NULL`.
- Clerk webhook upsert idempotency and `resumes.setBase`'s `db.batch` + partial-unique-index
  handling are both correct.
- RLS is deliberately off (documented in `0002_rls_decision.md`) because neon-http is
  stateless per query. Authorisation is application-level only — a coherent trade-off,
  but it means there is no database backstop behind a forgotten `where` clause.

---

## Files changed

**Schema/DB** — `packages/db/src/schema.ts`, `packages/db/src/queries/matching.ts`,
`packages/db/drizzle/0005_keen_sharon_ventura.sql` (new)
**Server** — `routers/{gdpr,onboarding,deck,applications,profile}.ts`,
`server/lib/erasure.ts`, `api/webhooks/clerk/route.ts`, `packages/billing/src/quota.ts`
**Client** — `applications/[id]/{review,submit}/page.tsx`, `dashboard/page.tsx`,
`settings/page.tsx`
**Pipeline** — `scrapers/{classifier,normalizer,base}.ts`, `src/index.ts`,
`jobs/embed-jobs.ts`, `src/seed-jobs.ts`, `scripts/run-{ba,arbeitnow,ats}.ts`
**New tooling** — `scripts/repair-jobs-data.ts`, `scripts/db-e2e-check.ts`
**Tests** — `tests/{classifier,normalizer}.test.ts` (+4 cases)
