# Inputs Needed From Jay — Database Remediation

> **Status update — items 1, 2 and 3 are DONE.** You authorised them and I ran them:
> migration 0005 applied, 578 rows repaired, 10 fabricated listings deleted, embedding
> coverage now 100% (921/921). The E2E harness reports **24 passed, 1 failed**. They are
> kept below as a record of what was run and how to verify it.
>
> **What still needs you: item 4** (run the write-path E2E — it writes to production, so
> the sandbox blocked me) **and item 5** (information only you have — the Bedrock model
> ID is the one blocking the last failing check and all document generation).

Each item is self-contained: what it is, why it matters, the exact command, and how to
verify it worked.

---

## 1. Apply migration 0005 — ✅ DONE (2026-08-06)

**Why it matters.** Two integrity constraints do not exist in production today. Until
they do, a double-clicked onboarding can create two profile rows for one user (every
later read then picks one at random), and a right-swipe racing its own follow-up call can
create two application rows for one job, one of which sits in "Preparing…" forever.

**What it does** (4 statements, all additive, no data loss):

```sql
DROP INDEX "user_profiles_user_id_idx";
CREATE UNIQUE INDEX "applications_user_id_job_id_idx" ON "applications" ("user_id","job_id");
CREATE INDEX "jobs_is_active_scraped_at_idx" ON "jobs" ("is_active","scraped_at" DESC NULLS LAST);
CREATE INDEX "jobs_source_scraped_at_idx" ON "jobs" ("source","scraped_at");
CREATE UNIQUE INDEX "user_profiles_user_id_idx" ON "user_profiles" ("user_id");
```

**Safety check — already run, both returned zero rows.** The two UNIQUE indexes can only
fail if duplicates already exist. There are none, so this will apply cleanly:

```sql
SELECT user_id, count(*) FROM user_profiles GROUP BY 1 HAVING count(*) > 1;
SELECT user_id, job_id, count(*) FROM applications WHERE job_id IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1;
```

**Command:**
```bash
pnpm --filter @agora/db db:migrate
```

**Result.** Applied successfully. All three previously-failing index checks now PASS, and
both new indexes are confirmed UNIQUE in the deployed DDL.

---

## 2. Repair the existing job rows — ✅ DONE (2026-08-06)

**Why it matters.** 931 rows were written before today's code fixes. The scrapers now
produce correct data, but nothing re-processes what's already stored. Concretely: 369
jobs carry fabricated skill tags, 370 display raw `&amp;` / invisible soft hyphens, 49
advertise €0/h, 56 mislabel full-time roles as student jobs, and 10 are fabricated
listings under real company names.

**Dry run first** (this is safe, writes nothing, and I have already run it — output below
for comparison):

```bash
pnpm --filter @agora/workers tsx scripts/repair-jobs-data.ts
```

Expected:
```
[1] seed rows (fabricated, real company names): 10
scanned 931 | textCleaned 370 | skillsChanged 369 | contractChanged 56
enrollmentChanged 56 | germanChanged 6 | rateNulled 49 | hoursNulled 1 | reEmbed 298
contract-type corrections:  werkstudent → vollzeit: 56
```

**If those numbers match, apply:**
```bash
pnpm --filter @agora/workers tsx scripts/repair-jobs-data.ts --apply
pnpm --filter @agora/workers tsx scripts/run-embed.ts     # re-embeds the 298 changed rows
```

**Result.** You chose to delete the seed rows. Two passes were run (the second after I
fixed two residual defects the first pass exposed — `go-to-market` still tagging as Go,
and one double-encoded `&amp;#xA;` entity that needed a second decode):

| | Pass 1 | Pass 2 | Verified after |
|---|---:|---:|---|
| seed rows deleted | 10 | 0 | **0 remain** |
| rows written | 552 | 26 | — |
| skill tags corrected | 369 | 25 | `git` 233→**0**, `rust` 48→**0**, `go` 242→**29** |
| text cleaned | 370 | 1 | soft hyphens **0**, entities **0** |
| €0/h rates nulled | 49 | 0 | **0** |
| contract types corrected | 56 | 0 | **0** mislabelled |

Company names now read correctly: *Fraunhofer Heinrich-Hertz-Institut*, *Technische
Universität Berlin*.

---

## 3. Backfill the missing embeddings — ✅ DONE (2026-08-06)

**Why it matters.** 213 active jobs (23% of the catalogue) have no embedding, so they are
invisible to vector matching — they can never appear in a user's deck. All of
`tu_berlin` (128), `berlin_startup_jobs` (70) and `jobicco` (15) are affected.

**Separately and more urgently: your own profile has no embedding.** There is exactly one
user row in production, `onboarding_complete = true`, `profile_embedding = NULL`. Step 2
of the matching pipeline is skipped entirely for that user, so the deck is currently
running on keyword ranking alone. The likely cause is the same Bedrock misconfiguration
as item 5 — the CV extraction worker never completed. Re-uploading the CV once the
worker is healthy should fix it.

**Result.** 412 embeddings generated across the two runs. **Coverage is now 100% —
921 of 921 active jobs are embedded** (verified: `SELECT count(*) FROM jobs WHERE
job_embedding IS NULL AND is_active` returns 0). Every job in the catalogue can now
reach a user's deck.

Your profile embedding is still NULL — that one is blocked on §5.1, not on this step.

---

## 4. Run the write-path end-to-end test — ⬜ STILL NEEDS YOU

The read-only half is done and passes **24 of 25**. The write half still needs running.

It provisions a throwaway user, walks profile → swipe → application → resume → GDPR
erasure against the real database, asserts each new constraint actually rejects its
duplicate, and deletes everything it created — via the `ON DELETE CASCADE` chain, which
is itself what the test verifies. It cleans up after itself in a `finally` block.

**I could not run this one:** it inserts a user row into production, and the sandbox
blocked it. That guardrail is working as intended — it wants a human to decide. The write
is genuinely small (1 user + ~5 child rows, all deleted at the end), but it is your call.

```bash
pnpm --filter @agora/workers tsx scripts/db-e2e-check.ts --write
```

Expected: **29 passed, 1 failed** — the single failure being the profile embedding
(§5.1). If anything else fails it names the invariant, so paste the output back to me.

---

## 5. Information I need from you

### 5.1 The Bedrock model ID is invalid — which model should generation use?
Every document generation has failed since June with the same error:

> `"The provided model identifier is invalid."`

9 applications are stuck (4 `failed`, 5 `pending`). This is a configuration problem, not
a code one, and I can't resolve it without your AWS setup.

**How to get me what I need:**
```bash
# 1. What the app is currently configured to call:
grep -E 'CLAUDE_.*MODEL_ID|AWS_BEDROCK_REGION' apps/web/.env.local

# 2. What your AWS account can actually call in that region:
aws bedrock list-foundation-models \
  --region "$(grep AWS_BEDROCK_REGION apps/web/.env.local | cut -d= -f2)" \
  --query 'modelSummaries[?contains(modelId,`anthropic`)].modelId' --output table

# 3. Which of those you have been granted access to:
aws bedrock list-inference-profiles --region <same-region> --output table
```

Paste all three outputs. The most likely cause is that the env var holds a bare model ID
where the region requires an **inference profile ID** (the `eu.anthropic.…` prefixed
form) — EU regions generally require the cross-region profile. `CLAUDE.md` also specifies
Opus 4.8 for CV and cover-letter generation and Sonnet 4.6 for Ari's advanced tasks, and
I want to confirm the env vars match that routing before I change anything.

### 5.2 Is there a non-production database, or is Neon the only one?
`.env.local` and `apps/web/.env.local` both point at the same Neon `neondb`. If that is
the only database, then every test that writes — including item 4 — runs against
production. For a pre-launch product with one user that is survivable, but before beta I
would want a separate branch. **Neon branching makes this nearly free**: a branch is a
copy-on-write clone of production. If you want it:

```bash
# Neon console → your project → Branches → "New Branch" → name it "dev"
# then copy its connection string into a new .env.test
```
Tell me if you'd like me to wire the test scripts to use it.

### 5.3 Product decision: what should happen to non-Berlin jobs?
The catalogue contains Munich (15), Hamburg (12), Frankfurt (8) and Großbeeren (7)
listings, and `location` is stored as free text with at least six different spellings of
Berlin (`Berlin`, `Berlin 10179`, `Deutschland, Berlin`, `Berlin, Berlin, Germany`,
`Berlin, Germany`, `Deutschland, Berlin, Charlottenburg`). No location filtering is
possible against that. Two questions:

1. Should non-Berlin jobs be dropped at scrape time, or kept for later expansion?
2. Do you want me to add a normalised `city` column (derived at ingest, with the raw
   string retained)? That is the prerequisite for the `locationPreference` field on the
   user profile ever doing anything — today it is collected and ignored.

### 5.4 Legal: the visa filter is currently open for 929 of 931 jobs
`allowed_visa_types` is `NULL` on 929 rows, and the matching query treats NULL as "no
restriction", so the visa gate passes everything. Only 2 jobs are marked EU-only.

I widened the detection patterns (added "no visa sponsorship", "cannot sponsor",
"unrestricted right to work"; removed `arbeitserlaubnis erforderlich`, which was wrong in
the other direction — non-EU students on a §16b visa *do* hold an Arbeitserlaubnis). But
keyword detection will always be a weak signal on a legal filter.

**This is a question for your German legal review** (the same one flagged in
`TSENTA-KEY-FINDINGS §10`): is "we did not detect a restriction, so we showed it" an
acceptable posture, or does the product need to default *closed* and only show jobs where
eligibility is positively established? That is a product-and-liability call, not an
engineering one.

---

## Quick reference

**Already run (items 1–3):**
```bash
pnpm --filter @agora/db db:migrate
pnpm --filter @agora/workers tsx scripts/repair-jobs-data.ts --apply
pnpm --filter @agora/workers tsx scripts/run-embed.ts
```

**Still to run — your call (item 4):**
```bash
pnpm --filter @agora/workers tsx scripts/db-e2e-check.ts --write
```

**Re-runnable any time** — the read-only health check is safe against production and is
the fastest way to confirm the database is still sound after any future change:
```bash
pnpm --filter @agora/workers tsx scripts/db-e2e-check.ts
```

Both repair and embed scripts are **idempotent** — re-running them is safe and a no-op
once the data is clean.
