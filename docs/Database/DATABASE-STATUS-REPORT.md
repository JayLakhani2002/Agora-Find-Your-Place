# Database Status Report — 2026-08-06

Measured live against the production Neon database. Every number below came from a query
run today, not from documentation.

**Engine.** PostgreSQL 17.10 on Neon (`neondb`), `pgvector` 0.8.0, `pg_trgm` 1.6.
**Driver.** `@neondatabase/serverless` over HTTP via `drizzle-orm/neon-http` — stateless
per query, therefore **no interactive transactions** anywhere in the system. This single
fact drives most of the integrity design: races have to be made impossible by database
constraints, not by application sequencing.

---

## 1. Health summary — post-remediation

Migration 0005 applied, data repair applied, embeddings backfilled. **E2E harness: 24 of
25 checks pass.** The single remaining failure is not a database defect — see §8.

| Area | Before | After |
|---|---|---|
| Schema ↔ migrations | Clean, zero drift | **Clean** (6 migrations applied) |
| GDPR cascade wiring | Clean | **Clean** |
| Extensions | Clean | **Clean** |
| Referential integrity | Zero orphans | **Zero orphans** |
| Required-field integrity | Clean | **Clean** |
| Unique constraints | **2 missing** | **Present and enforced** |
| Embedding coverage | 77% (213 unembedded) | **100% — 921/921** |
| Fabricated skill tags | 369 rows | **0** |
| HTML entities / soft hyphens | 370 rows | **0** |
| `hourly_rate = 0` | 49 rows | **0** |
| Contract-type misclassification | 56 rows | **0** |
| Fabricated seed listings | 10 rows | **0 (deleted)** |
| Query performance | Slowest 138 ms | **Unchanged**; see §5 |

---

## 2. Size and shape

| Table | Rows | Size |
|---|---:|---:|
| jobs | 921 | 13 MB |
| applications | 9 | 120 kB |
| user_job_actions | 13 | 64 kB |
| user_documents | 6 | 48 kB |
| user_profiles | 1 | 64 kB |
| users | 1 | 64 kB |
| resumes | 0 | 72 kB |
| subscriptions | 0 | 32 kB |
| follow_up_drafts | 0 | 32 kB |

The database is pre-launch: one real user, nine applications, zero resumes, zero
subscriptions. `jobs` is effectively the whole database, and 89% of its 13 MB is the
1024-dim embedding column.

---

## 3. The job catalogue

| Source | Rows | Embedded (before → after) | Active | Last scraped |
|---|---:|---|---:|---|
| arbeitsagentur | 389 | 100% → **100%** | 389 | 2026-07-11 |
| arbeitnow | 319 | 100% → **100%** | 319 | 2026-07-11 |
| tu_berlin | 128 | **0%** → **100%** | 128 | 2026-08-03 |
| berlin_startup_jobs | 70 | **0%** → **100%** | 70 | 2026-08-02 |
| jobicco | 15 | **0%** → **100%** | 15 | 2026-08-02 |
| ~~seed~~ *(fabricated)* | ~~10~~ | — | — | **deleted** |
| **Total** | **921** | 77% → **100% (921/921)** | **921** | — |

**Composition.** Contract types: teilzeit 531, werkstudent 231, vollzeit 112, praktikum
29, minijob 17, freelance 11. German requirement: none 504, B2 120, A2 117, C1 99, C2 49,
B1 33. Enrollment required: 260 of 931.

**Freshness.** 718 rows (77%) have not been re-seen since 2026-07-11 — 26 days. All are
still `is_active = true`, because until today's fix nothing in the codebase ever set that
column to false. The deactivation sweep now runs after each successful scrape.

---

## 4. Data-quality defects — all resolved

578 rows repaired across two passes. Every defect verified at zero afterwards.

| Defect | Before | After | What it was |
|---|---:|---:|---|
| Fabricated skill tags | 369 | **0** | 242 jobs claimed "go", 233 "git", 48 "rust" — substring hits inside *di**git**al*, *t**rust***. A second pass also removed "go" read out of *go-to-market*. Real Go mentions: 29. |
| Raw HTML entities | 282 | **0** | `&amp;`, `&#x26;`, `&#xfc;` shown literally. One row was double-encoded (`&amp;#xA;`) and needed a second decode pass. |
| Soft hyphens in names | 57 | **0** | `Fraun\xADho\xADfer` now reads *Fraunhofer Heinrich-Hertz-Institut*; *Technische Universität Berlin* is one company again, not many. |
| `hourly_rate = 0` | 49 | **0** | Parse failures nulled; the min-rate filter works. |
| Contract-type misclassification | 56 | **0** | Berlin Startup Jobs dropped from 52 → 8 `requires_enrollment`, jobicco 13 → 1. |
| Fabricated seed listings | 10 | **0** | Deleted. |

**One known residual, already contained:** one jobicco posting (Buena GmbH) declares both
"werkstudent" and 40 h/week — contradictory source data, not a classifier fault. It
cannot reach a student's deck: the step-1 SQL filter caps `hours_per_week` at the visa's
weekly limit, so 40 > 20 excludes it. No fix needed; recorded so it isn't re-diagnosed.

**Recorded, no action taken:**
- **21 true content duplicates** — distinct `external_id`s with byte-identical
  descriptions (19 identical "MTR / MTRA" ads from one employer). `external_id` is a
  hash of company + title + first 200 chars, so an employer re-posting with a tweaked
  opening mints a new row. Worth addressing before scaling to 10k.
- **`location` is unnormalised free text** — six spellings of Berlin, plus Munich (15),
  Hamburg (12), Frankfurt (8). No location filtering is possible, so the
  `locationPreference` profile field is collected and ignored.
- **`allowed_visa_types` is NULL on 929 of 931 rows**, and the matching query reads NULL
  as "unrestricted" — so the visa gate currently passes essentially everything.

---

## 5. Query performance (measured, `EXPLAIN ANALYZE`)

The matching pipeline is four steps. Each was profiled against the real data:

| Step | Plan | Time |
|---|---|---:|
| 1. Legal SQL filter | Hash Anti Join, 233 rows | **1.2 ms** |
| 2. Vector rank (cosine over candidate set) | Sort over 386 rows | **2.6 ms** |
| 3. Keyword rank (`pg_trgm similarity`) | Hash Semi Join + Sort, 500 rows | **138 ms** |
| Pure KNN (not used by the pipeline) | Seq Scan + Sort, 718 rows | 254 ms |

**Step 3 is the bottleneck** — 98% of database time in the deck build. It computes
trigram similarity between each full 2–4 kB description and a short skill string. There
is no GIN trigram index, and one wouldn't help this shape (`similarity()` as a projected
score, not a filter). It will scale linearly: at 10k jobs this path alone is ~1.4 s
against a <3 s deck budget. Flagged, not yet changed — fixing it properly means
reconsidering the lexical signal, which is a ranking-quality decision rather than a bug.

**On the HNSW indexes.** Both vector indexes are valid, ready, and have `idx_scan = 0` —
never used since creation. This is correct behaviour, not a fault: at 931 rows a
sequential scan (2.9 ms) genuinely beats the index, and the pipeline pre-filters to ≤500
candidate IDs before ranking, a shape no HNSW index can serve. They cost 5.7 MB and write
amplification today and start paying off somewhere past 10k rows. Re-measure then.

---

## 6. Schema inventory

9 tables, 10 enums, 30 indexes, 11 foreign keys.

**Delete semantics** — all verified against deployed DDL:
- `user_profiles`, `user_documents`, `user_job_actions`, `applications`,
  `follow_up_drafts`, `subscriptions`, `resumes` → `user_id` **CASCADE** (GDPR Art. 17).
- `applications.job_id`, `resumes.job_id` → **SET NULL** (history survives a listing
  being retired).
- `user_job_actions.job_id`, `follow_up_drafts.application_id` → **CASCADE**.

**Row-level security is off on all 9 tables**, by documented decision
(`drizzle/0002_rls_decision.md`): neon-http is stateless per query, so
`current_setting('app.current_user_id')` cannot survive between `SET` and `SELECT`.
Authorisation is therefore application-level only. I verified every `.where()` on every
user-owned table in every router includes `ctx.user.id` — that audit came back clean —
but there is no database backstop behind a future forgotten clause. Worth revisiting
(WebSocket driver or Neon native auth) before the user count grows.

---

## 7. Test coverage

| Suite | Tests |
|---|---:|
| `@agora/web` | 112 passed, 10 skipped |
| `@agora/workers` | 40 passed |
| `@agora/billing` | 7 passed |
| **Total** | **159 passed** |

Plus a new end-to-end database harness, `scripts/db-e2e-check.ts`:
- **Read-only half** (safe against production): extensions, index presence *and
  uniqueness*, FK delete rules, orphan checks, duplicate-profile check, required-field
  integrity, embedding coverage, and live execution of both the trigram and cosine query
  paths. **24 passed, 1 failed** (see §8).
- **Write half** (`--write`): provisions a throwaway user, walks profile → swipe →
  application → resume → GDPR erasure against the real database, asserts each unique
  constraint actually rejects its duplicate, then verifies the cascade removed every
  linked row. Not yet run — it writes to production, so it is left for a human to
  trigger deliberately.

---

## 8. The one remaining failure

```
FAIL  every onboarded profile is embedded — 1 onboarded user has no profile embedding
```

This is **not** a database defect and no schema or data change will fix it. There is one
user row, `onboarding_complete = true`, `profile_embedding = NULL`. Step 2 of the
matching pipeline (vector similarity) is skipped entirely for that user, so their deck
currently runs on the legal filter plus keyword ranking alone.

The cause is upstream: **document generation and profile extraction have failed on every
attempt since June** with

> `"The provided model identifier is invalid."`

9 applications are stuck (4 `failed`, 5 `pending`), each carrying 3–6 `generation_failed`
audit entries with that message. It is an AWS Bedrock configuration problem — most likely
a bare model ID where the EU region requires a cross-region inference profile
(`eu.anthropic.…`). Diagnostic commands are in
[INPUTS-NEEDED-FROM-JAY.md](INPUTS-NEEDED-FROM-JAY.md) §5.1. Once the worker is healthy,
re-uploading the CV populates the embedding and this check goes green.

---

## 9. Recommended next, in priority order

1. **Fix the Bedrock model ID** — unblocks generation, profile extraction, and the last
   failing check. Nothing else in the product works end-to-end without it.
2. **Decide the visa-filter posture** (fail-open vs fail-closed) — needs the German legal
   review, and it governs a legal filter.
3. **Normalise `location`** before the catalogue grows; `locationPreference` is collected
   from users today and silently ignored.
4. **Switch `external_id` to source-native stable IDs** before scaling toward 10k, or
   edited postings will keep minting duplicate rows.
5. **Revisit the step-3 trigram rank** — 138 ms today, ~1.4 s at 10k against a <3 s deck
   budget.
6. **Re-measure the HNSW indexes past 10k rows**, when the planner should start choosing
   them.
