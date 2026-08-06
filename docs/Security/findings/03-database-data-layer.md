# 03 — Database, Data Layer, Object Storage & GDPR Security Assessment

**Scope:** `packages/db/`, `apps/web/src/server/`, `apps/workers/`, `packages/ai/` (storage), `packages/legal/`
**Method:** Static (whitebox) read-only. No DB writes performed.
**Date:** 2026-08-06

## Executive summary

The data layer is, for a prototype, unusually disciplined: every tRPC procedure scopes
by `ctx.user.id`, object-storage keys are namespaced per user with an explicit prefix
check on registration, the download proxy re-checks ownership against the DB, the erasure
path deletes storage *before* the DB row, and every `userId` FK carries `ON DELETE CASCADE`.
There is **no SQL injection** and **no cross-tenant IDOR** in the code as written.

The real risk is structural, not a code bug: **RLS is disabled and the app connects as the
Neon owner role (`neondb_owner`) from web, workers, and migrations alike**. App-layer scoping
is the *only* tenant boundary, and the credential that enforces it can also `DROP TABLE`. A
single leaked connection string, or a single future query that forgets its `WHERE user_id`,
is a full-database event. Everything below is ranked against that reality.

---

## SQL Injection (Task 1)

**Verdict: no injection findings.** Every dynamic value reaches Postgres through Drizzle's
parameterizing `sql` tag or the query builder. There is **no `sql.raw()` anywhere** in the
audited paths, and no user-controlled identifier, `ORDER BY`, `LIMIT`, or operator.

Places checked and cleared:

- `packages/db/src/queries/matching.ts:143` — `sql<number>\`similarity(${jobs.description}, ${skillQuery})\``.
  `skillQuery` is `userSkills.join(" ")` (user-derived) but interpolated through the `sql`
  tag → sent as a bound parameter, not concatenated. Safe.
- `packages/db/src/queries/matching.ts:118` — `cosineDistance(jobs.jobEmbedding, profileEmbedding)`
  with a user-derived embedding array → parameterized. Safe.
- `apps/web/src/server/routers/jobs.ts:83-84` — `ilike(jobs.title, \`%${q}%\`)`. `q` is passed
  as a bound parameter *and* `likeLiteral()` (line 18) escapes `\ % _` so wildcards can't be
  injected into the LIKE pattern. Correct on both axes. Safe.
- `apps/web/src/server/routers/jobs.ts:44-45` — `count(*) filter (where ${eq(...)})` uses
  Drizzle condition builders inside the `sql` tag, no user string. Safe.
- `apps/workers/scripts/db-e2e-check.ts` and `repair-jobs-data.ts:206` — `sql` tag with numeric
  `STALE_DAYS`/`staleAfterDays` constants, `make_interval(days => ${...})` parameterized. Safe.
- `apps/workers/src/scrapers/base.ts:102-114` — `sql\`excluded.*\`` are static column
  references in an upsert, no interpolation. Safe.

No action required for SQLi. **Keep the rule that `sql.raw()` is banned** — a lint rule below
makes that permanent.

### [SEV-P3] Add a lint guard so `sql.raw` / string-built SQL can never regress
- **File:** repo-wide (currently clean)
- **Attack:** future contributor adds `sql.raw(\`... ${userInput} ...\`)` for a dynamic sort
  column; parameterization silently lost.
- **Impact:** latent injection.
- **Fix:** Biome/grep CI check:
  ```bash
  ! grep -rn --include='*.ts' -E 'sql\.raw|execute\(\s*`' packages apps | grep -v node_modules
  ```

---

## Tenant Isolation / RLS (Task 2)

### [SEV-P1] Row Level Security disabled on all tables; app-layer WHERE is the only tenant boundary
- **File:** `packages/db/drizzle/0002_rls_decision.md` (documents the decision); no `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` in any migration.
- **Attack:** any future query that omits `eq(table.userId, ctx.user.id)`, any raw `getDb()`
  call outside `protectedProcedure` (the download route and both workers already call `getDb()`
  directly), or any endpoint that trusts a client-supplied id without the ownership `WHERE`,
  returns or mutates **another user's rows**. There is no second net.
- **Impact:** cross-tenant read/write of CV text (`resumes.content`), visa/nationality
  (`user_profiles`), applications, and storage keys. Blast radius on a single missed clause =
  the entire user base, not one row.
- **Evidence:** the decision doc's own rationale — neon-http is stateless so
  `current_setting('app.current_user_id')` can't persist across the SET/SELECT round-trips.
  That is true for the *pooled http* driver, but the repo already ships
  `DATABASE_URL_UNPOOLED` (a direct connection) in `.env.local`, and Drizzle supports RLS via
  the WebSocket driver or Neon's `neon_authenticated`/`crypto` RLS with per-request JWT.
- **Fix (defence-in-depth, worth doing before real user data lands):** enable RLS with a
  restricted role and set the user id per request. Concrete Neon DDL:
  ```sql
  -- Run as neondb_owner (migration role)
  ALTER TABLE user_profiles     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE user_documents    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE user_job_actions  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE applications      ENABLE ROW LEVEL SECURITY;
  ALTER TABLE follow_up_drafts  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE resumes           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE subscriptions     ENABLE ROW LEVEL SECURITY;

  -- Policy pattern (repeat per table; follow_up_drafts already carries a denormalised user_id)
  CREATE POLICY tenant_isolation ON resumes
    USING       (user_id = current_setting('app.user_id', true))
    WITH CHECK  (user_id = current_setting('app.user_id', true));
  ```
  Then, on the WebSocket/unpooled driver, wrap each request:
  ```sql
  SELECT set_config('app.user_id', $1, true);  -- $1 = ctx.user.id, txn-local
  ```
  `jobs` stays RLS-free (public catalog, comment at `schema.ts:134` already says so).
  If switching drivers is out of scope for the prototype, at minimum ship the restricted role
  (below) so the app credential can't `DROP TABLE`.

---

## Credential Scope (Task 3)

### [SEV-P1] App, workers, and migrations all connect as the Neon owner role (`neondb_owner`)
- **File:** `packages/db/src/client.ts:12-14` (single `DATABASE_URL`, one lazy singleton);
  `.env.local` → `postgresql://neondb_owner:***@…-pooler…eu-central-1…/neondb?sslmode=require`.
- **Attack:** `neondb_owner` owns every table and has full DDL. If this string leaks (it is
  in `.env.local`, injected into the Vercel web app *and* the workers host, and printed by any
  stack trace that dumps `process.env`), the holder can `DROP TABLE`, `TRUNCATE`, disable
  constraints, or exfiltrate everything. The web app never needs DDL; the ingest worker only
  needs write on `jobs`; only migrations need DDL.
- **Impact:** credential blast radius = destroy or exfiltrate the whole database. This is the
  ransomware precondition in Task 7.
- **Evidence:** one env var shared by `apps/web`, `apps/workers`, and `drizzle-kit`; no role
  separation anywhere.
- **Fix:** create three least-privilege roles in Neon; keep `neondb_owner` for migrations only.
  ```sql
  -- Web app: read/write user-scoped tables, read jobs, NO DDL
  CREATE ROLE agora_web LOGIN PASSWORD '...';
  GRANT SELECT ON jobs TO agora_web;
  GRANT SELECT, INSERT, UPDATE, DELETE ON
    users, user_profiles, user_documents, user_job_actions,
    applications, follow_up_drafts, resumes, subscriptions TO agora_web;

  -- Ingest worker: write jobs only, plus the profile/app rows it updates
  CREATE ROLE agora_worker LOGIN PASSWORD '...';
  GRANT SELECT, INSERT, UPDATE ON jobs TO agora_worker;
  GRANT SELECT, UPDATE ON user_profiles, applications TO agora_worker;
  GRANT SELECT ON users, follow_up_drafts TO agora_worker;
  GRANT INSERT ON follow_up_drafts TO agora_worker;

  -- Neither app role gets DDL; revoke the public schema default
  REVOKE CREATE ON SCHEMA public FROM agora_web, agora_worker;
  ```
  Give `agora_web` to Vercel, `agora_worker` to the workers host, and reserve `neondb_owner`
  for `drizzle-kit push`/`migrate` run from CI only. Combined with RLS, `agora_web` should
  connect via `neon_authenticated`-style row policies.

---

## GDPR / Data Protection (Task 4)

### Tables with userId FK — cascade audit

| table | FK column | ON DELETE rule | erased by erasure.ts? | verdict |
|---|---|---|---|---|
| `user_profiles` | `user_id` → users.id | **cascade** (`0000:115`) | via cascade | ✅ (includes profile embedding, visa, german level) |
| `user_documents` | `user_id` → users.id | **cascade** (`0000:112`) | storage key deleted explicitly + row cascades | ✅ |
| `user_job_actions` | `user_id` → users.id | **cascade** (`0000:113`) | via cascade | ✅ |
| `applications` | `user_id` → users.id | **cascade** (`0000:109`) | cv/cl storage keys deleted explicitly + row cascades | ✅ |
| `follow_up_drafts` | `user_id` → users.id | **cascade** (`0001:17`) | via cascade | ✅ (denormalised user_id, own cascade) |
| `follow_up_drafts` | `application_id` → applications.id | cascade (`0000:111`) | via application cascade | ✅ |
| `resumes` | `user_id` → users.id | **cascade** (`0003:13`) | via cascade — content jsonb is raw PII, DB-only, no storage | ✅ |
| `subscriptions` | `user_id` → users.id | **cascade** (`0002:17`) | via cascade | ⚠️ row gone, but Stripe customer survives — see below |

**Every `userId` FK cascades. Erasure is complete for DB + object storage.** `collectErasureKeys`
(`erasure.ts:12`) gathers both `userDocuments.storageKey` and `applications.cvStorageKey`/
`coverLetterStorageKey`, filters nulls, deletes via `Promise.allSettled`, and **aborts before
the DB row delete if any object failed** (`erasure.ts:45-52`) — failure-aware and correctly
ordered (storage first, because the `users` row is the only index of which objects are whose).

Confirmed safe against the specific attacks asked about:
- **Export another user's data:** there is **no data-export/portability endpoint at all** (grep
  found none). Nothing to abuse — but note the Art. 20 gap below.
- **Erase another user's id:** `gdpr.deleteAccount` (`gdpr.ts:13-20`) takes **no input**; it
  erases `ctx.user.id` only. An attacker cannot target another id.
- **Mass-delete / mass-export from any session:** impossible — deletion is self-only and there
  is no bulk endpoint. Good.

### [SEV-P2] Stripe customer (holds email + payment metadata) is not deleted on erasure
- **File:** `apps/web/src/server/lib/erasure.ts:53` deletes the `users` row (cascading away
  `subscriptions`), but never calls Stripe; `billing.ts:37` created a Stripe customer with the
  user's email.
- **Attack:** not an attack — a compliance defect. After a GDPR Art. 17 erasure the person's
  email and billing history remain in Stripe indefinitely, and the local `stripeCustomerId`
  link is gone so it can't even be found later.
- **Impact:** incomplete erasure of personal data held by a processor; Art. 17 violation.
- **Fix:** in `eraseUserAndStorage`, before deleting the row, read `stripeCustomerId` and
  `await getStripe().customers.del(customerId)` (idempotent; tolerate already-deleted). Guard
  behind `BILLING_ENABLED` so pre-BSS it's a no-op.

### [SEV-P3] No Article 20 data-portability export endpoint
- **File:** absent from `apps/web/src/server/routers/`.
- **Impact:** users can delete but cannot obtain a machine-readable copy of their data. Not a
  security hole; a GDPR completeness gap to schedule before launch.
- **Fix:** add a `gdpr.exportData` protected query that serialises the caller's `user_profiles`,
  `resumes.content`, `applications`, `user_job_actions`, `follow_up_drafts` scoped to
  `ctx.user.id`, returned as JSON. Ownership is automatic (self-only, like `deleteAccount`).

---

## Object Storage (Task 5)

Client: `packages/ai/src/storage.ts` — Scaleway S3 (`s3.fr-par.scw.cloud`, EU, good for
residency), `forcePathStyle`, credentials from env. Callers audited:
`api/upload/cv/route.ts`, `api/download/document/route.ts`, `server/lib/erasure.ts`,
`workers/src/jobs/extract-profile.ts`, `workers/src/jobs/generate-documents.ts`.

**Key namespacing and ownership are handled correctly:**
- Upload writes `cv/${clerkId}/${uuid}-${name}` (`upload/cv/route.ts:28`) — per-user prefix.
- `onboarding.confirmUpload:110` **rejects any key not starting with `cv/${ctx.user.clerkId}/`**,
  with an in-code comment explaining the exact cross-user attack it blocks. Excellent.
- The download proxy (`download/document/route.ts:31-42`) loads the application by
  `applicationId` **joined to the caller's `clerkId`**, then requires the requested `key` to
  equal that row's `cvKey` or `clKey` before `getObjectBuffer`. A user-supplied `key` cannot
  reach S3 without ownership. Correct.
- `getObjectBuffer` in `extract-profile.ts:55` receives `storageKey` from the queue payload,
  which was validated at `confirmUpload`. `generate-documents.ts` only ever *writes* keys it
  constructs (`applications/${id}/...`). No unchecked user key reaches storage.

### [SEV-P2] Server-side encryption not requested on upload; bucket public-access posture unverified
- **File:** `packages/ai/src/storage.ts:33-51` — `PutObjectCommand` sets no
  `ServerSideEncryption`; `presignUpload` likewise.
- **Attack:** if the Scaleway bucket is not encrypted-at-rest by default or is not private,
  CV PDFs and generated CV/cover-letter markdown (real PII) sit unencrypted / reachable.
- **Impact:** exposure of the most sensitive documents in the system.
- **Fix:** (1) confirm the `agorajobsdocs` bucket is **Private** ACL with public access blocked
  (Scaleway console — cannot verify from code); (2) add `ServerSideEncryption: "AES256"` to both
  `PutObjectCommand`s. Presigned TTL is 300s (`storage.ts:33,38`) — fine; note the download path
  uses a server proxy instead of presigned URLs, so presign is currently unused for reads.

---

## Data At Rest / In Transit (Task 6)

**In transit:** ✅ `DATABASE_URL` includes `sslmode=require` (both pooled and unpooled).
Neon rejects non-TLS anyway. S3 endpoint is `https://`.

### [SEV-P2] Special-category & raw PII stored in plaintext columns
- **File:** `packages/db/src/schema.ts`
- **Attack:** anyone with the DB credential (see P1 credential finding) or a Neon PITR snapshot
  reads it directly. No column-level encryption anywhere.
- **Impact / classification:**
  - `resumes.content` (jsonb, `schema.ts:382`) — **raw PII by definition**: first/last name,
    email, phone, location. The schema comment at `:311` already acknowledges this.
  - `user_profiles.visa_type` (`:68`) and `enrollment_status`, plus `daysRemainingThisYear` —
    **immigration status**. Combined with `germanLevel`/nationality-adjacent data this trends
    toward GDPR **Art. 9 special-category** territory (data revealing status of a foreign
    national). Treat as high-sensitivity.
  - `users.email` (`:38`) — PII.
  - `user_profiles.min_hourly_rate`, salary-adjacent — sensitive but not Art. 9.
- **Fix:** Neon encrypts at rest at the storage layer by default (covers the "stolen disk"
  threat). Application-level (envelope) encryption is warranted for the two highest-sensitivity
  stores if the threat model includes a leaked DB credential: encrypt `resumes.content` and the
  visa fields with a KMS-held key (Scaleway KMS / AWS KMS eu-central-1) so the plaintext never
  lives in a row a leaked connection string can read. At minimum, restrict who can read these
  columns via the restricted role + RLS above before adding crypto complexity.

---

## Backup / Recovery / Ransomware (Task 7)

### [SEV-P1] Owner credential can drop/truncate tables; recovery relies on default Neon PITR
- **File:** same root cause as the credential finding — `client.ts` + `neondb_owner`.
- **Attack:** leaked `DATABASE_URL` → `DROP TABLE applications;` or `TRUNCATE users CASCADE;`.
  Neon's default PITR window (7 days on paid, less/none on free) is the only undo, and the same
  owner role could also delete branches if the string had console scope (it doesn't — it's a SQL
  role, not an API key, which limits it to data destruction, not project deletion).
- **Impact:** full data-destruction event with a bounded recovery window.
- **Fix:** (1) the restricted-role split above removes DDL from the app/worker credentials — the
  single most effective control; (2) confirm Neon PITR retention is set to the maximum your plan
  allows and document the restore runbook; (3) consider a scheduled `pg_dump` of user tables to a
  separate, versioned, object-locked bucket for an out-of-band copy the DB credential can't reach;
  (4) rotate `neondb_owner` and store it only in CI secrets, never in the running app's env.

---

## Logging (Task 8)

### [SEV-P3] `userId` logged in deck/worker paths; no CV text, tokens, or bodies logged
- **Files:**
  - `apps/web/src/server/routers/deck.ts:266-273` and `:288-290` — `JSON.stringify({... userId: ctx.user.id ...})` on rerank timeout and every deck build.
  - `apps/workers/src/index.ts:107` — `Extracted profile for user ${userId}`.
- **Attack:** low. `userId` is an internal cuid2, not directly identifying, but it is a personal
  identifier under GDPR and correlates a person's activity across log lines; high-volume
  (`deck_built` fires every deck) means log retention accumulates a behavioural trail.
- **Impact:** minor privacy exposure in logs; no secrets/tokens/PII strings are logged (checked
  all `console.*` — the CV text, role answers, emails, and connection strings are never printed).
  `gdpr.ts:39` correctly logs **timestamps only**, no identifiers — the erasure event is clean.
- **Fix:** drop `userId` from the routine `deck_built` info log (keep it only on the error/timeout
  line if needed for support), or hash it. Ensure the log sink's retention has a defined TTL.

**Cleared:** no `console.log` prints request bodies, `roleAnswers`, resume content, CV text,
Stripe/Clerk secrets, or the DB URL. `generate-documents.ts:122` logs placeholder-violation
*problem descriptions*, not document content — safe.

---

## Priority order

1. **P1 — Restricted DB roles (remove DDL from app/worker credentials).** Single highest-value
   fix; mitigates credential-leak, ransomware, and blast-radius findings at once.
2. **P1 — Enable RLS** as defence-in-depth behind the restricted role (needs unpooled/WS driver).
3. **P2 — Stripe customer deletion on erasure**; **S3 SSE + confirm bucket private**;
   **app-level encryption for `resumes.content` + visa fields**.
4. **P3 — Art. 20 export endpoint; drop userId from routine logs; add the `sql.raw` CI guard.**

No P0: there is no exploitable injection, no cross-tenant IDOR, and no way to erase or export
another user's data in the code as written.
