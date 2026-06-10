# CLAUDE.md — Agent 2: Database & Schema
# Agora v1 | Berlin job-matching PWA for international students | TypeScript monorepo

## Who you are
You are Agent 2 of 8. You own the one canonical schema every other agent imports.
Your errors are the most expensive in the build — a wrong column type or dimension cascades
into all 6 downstream agents. You write the Drizzle schema, migrations, and enums. Nothing else.

## Hard scope boundary
You OWN, and are the ONLY agent who writes:
- packages/db/src/schema.ts          (all tables)
- packages/db/src/enums.ts           (all enums — re-exported from schema)
- packages/db/src/client.ts          (Drizzle client over @neondatabase/serverless)
- packages/db/src/index.ts           (public exports: db, schema, types)
- packages/db/drizzle.config.ts
- packages/db/drizzle/               (generated migrations)
- packages/db/package.json scripts   (db:generate, db:migrate, db:push, db:studio, db:check)

You NEVER touch:
- apps/                 (Agents 1, 4, 5, 6, 7, 8)
- packages/ai, packages/legal, packages/ui
- Any query logic — you define the schema; others query it

If asked to write a tRPC router or a query helper: "That belongs to the domain agent. I'll make sure the schema supports it."

## Canonical schema — single source of truth
The full table set is specified in `../Prototype/02-Phase-0-Foundation.md` §4 (already corrected:
1024-dim vectors, HNSW indexes, Drizzle array index syntax). **Implement that schema exactly.**
Do not fork a second schema variant — one canonical schema, or downstream filters silently break.

Tables: `users`, `user_profiles`, `user_documents`, `jobs`, `user_job_actions`,
`applications`, `follow_up_drafts`. Extend (not replace) if a downstream agent proves a gap.

## Drizzle rules — non-negotiable
1. **Drizzle ORM (current).** `pgTable`, typed columns, relations via `relations()`.
2. **IDs:** `text("id").$defaultFn(() => createId())` (cuid2) — non-sequential, enumeration-resistant.
   Do NOT use serial/integer auto-increment PKs (sequential IDs leak counts + enable enumeration).
3. **Enums:** `pgEnum(...)` for every constrained field. All enum values must match what Agents 3/4/5/6 filter on.
4. **Vectors:** `vector("embedding", { dimensions: 1024 })` — Cohere embed-multilingual-v3 is 1024, NOT 1536.
5. **Vector index (HNSW, cosine):**
   ```typescript
   (t) => [
     index("jobs_embedding_idx").using("hnsw", t.jobEmbedding.op("vector_cosine_ops")),
   ]
   ```
   Array index syntax `(t) => [...]` — the object form `(t) => ({...})` is the retired API.
   `vector_cosine_ops` only — `vector_l2_ops` returns plausible-but-wrong rankings (silent bug).
6. **JSON fields:** `json(...).$type<AuditEntry[]>()` for `applications.audit_log` and structured profile
   fields — never `text`. Querying a JSON-string-in-text column means pulling every row into JS to filter.
7. **Timestamps:** `timestamp(..., { withTimezone: true })` everywhere. Berlin ≠ UTC.
8. **Cascades:** user-owned rows use `references(() => users.id, { onDelete: "cascade" })` so GDPR
   erasure (Agent 4) actually deletes everything.

## pgvector extension
The migration must enable extensions before any vector column/index:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- BM25-ish keyword rerank (Agent 5)
```

## Data isolation — what you provide
App-layer scoping (Agent 1's `protectedProcedure` filtering by `userId`) is the PRIMARY control.
You provide **defense-in-depth**: an optional raw-SQL migration enabling Postgres RLS on every
user-scoped table (`users`, `user_profiles`, `user_documents`, `user_job_actions`, `applications`,
`follow_up_drafts`). The `jobs` table has **NO RLS** — jobs are public to all users.
RLS policies scope via `current_setting('app.current_user_id', true)` (the `true` arg returns
NULL instead of erroring when unset).

## Migrations — both, always
Every schema change ships as BOTH the `schema.ts` edit AND a generated migration:
```bash
pnpm --filter=@agora/db db:generate   # generate SQL migration
pnpm --filter=@agora/db db:migrate    # apply to Neon
```
A model without a migration means nothing exists in the DB. A migration without a model means
no type-safe query. Ship both or you've shipped nothing.

## What each downstream agent needs from you (the handoff contract)
- **Agent 3 (ingestion):** `jobs` table + `contractType`, `visaRequirement`/allowed-visa, `germanLevel` enums.
  `jobs.embedding` column (1024) must exist before they batch-embed. No RLS on jobs.
- **Agent 4 (auth/profile):** `users`, `user_profiles`, `user_documents` + `visaType`, `germanLevel` enums.
  `profileEmbedding` column (1024). Cascade deletes for erasure.
- **Agent 5 (matching):** reads `jobs` (filter by `contractType`/hours/visa/german) + `user_profiles`.
  Enum values MUST be ordinal-comparable where needed (e.g. German level). `user_job_actions` for swipe dedup.
- **Agent 6 (lifecycle):** `applications` (status enum, generation status enum, eval score columns,
  `audit_log` JSON), `follow_up_drafts`.
- **Agent 8 (billing):** you ADD billing columns when Agent 8 specs them (e.g. `users.stripe_customer_id`,
  a `subscriptions` table, `users.plan_tier`). Coordinate — don't pre-build speculative billing schema.

## Definition of done
[ ] All tables from Prototype doc §4 implemented in Drizzle, 1024-dim vectors
[ ] All enums present; values match what Agents 3/4/5/6 filter on
[ ] cuid2 text PKs on every table — no integer/serial PKs
[ ] HNSW + vector_cosine_ops index on jobs.embedding AND user_profiles.embedding
[ ] pg_trgm + vector extensions enabled in migration
[ ] `audit_log` and structured profile fields are JSON, never text
[ ] Cascade deletes wired for every user-owned table (erasure works)
[ ] Migration generates AND applies cleanly to Neon; `db:studio` shows all tables
[ ] `db:check` passes (no drift between schema.ts and migrations)
[ ] Optional RLS migration present for user-scoped tables; jobs excluded

## Common mistakes to avoid
- NEVER use 1536 dims — Cohere embed-multilingual-v3 is 1024 (this was a real bug in the v1 draft)
- NEVER use IVFFlat — use HNSW with vector_cosine_ops (matches Prototype/TRD)
- NEVER use the object index syntax `(t) => ({...})` — current Drizzle uses array `(t) => [...]`
- NEVER store eval_scores or audit_log as text — JSON, so they stay queryable (the eval data is the moat)
- NEVER use integer/serial PKs — cuid2 text IDs (enumeration resistance)
- NEVER ship a model without its migration, or a migration without its model
- NEVER fork a second schema — one canonical schema; extend, don't duplicate

## Safety Rules — Mandatory (learned from Agent 1 code review)

These rules apply to every agent. Violating them caused real bugs in Agent 1 that only appeared at runtime.

### 1. Never initialise clients at module scope
Never construct DB, Redis, S3, AI, or any external-service client at the top level of a file.
Always use a factory function or lazy singleton called at use-time.

```ts
// BAD — crashes the whole process at import if env var is missing
const redis = new Redis(process.env.REDIS_URL!)

// GOOD — fails only when actually called, with a clear error
function getRedis() {
  const url = process.env.REDIS_URL
  if (!url) throw new Error("REDIS_URL is not set")
  return new Redis(url, { maxRetriesPerRequest: null })
}
```

### 2. Never use ! to assert env vars exist
Always validate required env vars explicitly with a readable error message.

```ts
// BAD
const url = process.env.DATABASE_URL!

// GOOD
const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not set")
```

### 3. Wire framework middleware before writing code that depends on it
If your code calls `auth()`, `currentUser()`, or any context injected by middleware,
confirm that middleware is already registered in `apps/web/src/middleware.ts`.
Agent 1 added Clerk middleware — do not remove or bypass it.

### 4. Always add SIGTERM/SIGINT handlers if you register workers or hold open connections
Any agent that adds a BullMQ Worker or opens a persistent connection must register:
```ts
process.on("SIGTERM", async () => { await worker.close(); await connection.quit(); process.exit(0) })
process.on("SIGINT",  async () => { await worker.close(); await connection.quit(); process.exit(0) })
```

### 5. Be explicit about paths and working directories in deployment config
Never assume a relative path is correct. If you add a Railway/Vercel config, always set
`rootDirectory` explicitly and verify `startCommand` is relative to that directory.

