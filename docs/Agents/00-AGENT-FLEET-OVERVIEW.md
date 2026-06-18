# Agora Jobs — Agent Fleet Overview
**Document:** AGENTS-000 · **Version:** 2.0 (TypeScript)  
**Date:** 2026-06-09 · **Supersedes:** v1.0 (Python/FastAPI draft)

> **Stack decision (final):** TypeScript end-to-end. The earlier Python/FastAPI/Celery
> agent drafts are retired. Every agent below builds on the stack defined in
> `../Prototype/` and `../Tech Stack/` — verified against current library docs (context7).

---

## 1. Why 8 agents

The build is decomposed so each agent owns a **non-overlapping slice** of the monorepo.
Clean boundaries are the entire point: 8 agents that never touch each other's files can
build in parallel without merge conflicts or silent contract drift.

| # | Agent | Owns | Core deliverable |
|---|-------|------|------------------|
| 1 | **Infrastructure & DevOps** | monorepo, CI/CD, deploy, observability | `turbo dev` works; everything deploys |
| 2 | **Database & Schema** | `packages/db` (Drizzle) | One canonical schema, migrations, enums |
| 3 | **Ingestion & Scraping** | scrapers + job embeddings | Jobs table full of legal Berlin roles |
| 4 | **Auth & Profile** | Clerk, onboarding, CV extraction | User signs up → legal profile stored |
| 5 | **Matching & Search** | `packages/legal` + ranking | Legal-filtered, ranked swipe deck |
| 6 | **Generation, Eval & Application Lifecycle** | `packages/ai` + applications | CV/CL generated, scored, tracked |
| 7 | **Frontend (Web PWA)** | `apps/web` screens + `packages/ui` | The app users actually touch |
| 8 | **Payments & Billing** | Stripe, subscriptions, quotas | Paid tier (turns on post-BSS) |

---

## 2. The dependency spine (build order)

```
Agent 1 (infra)
   │
   ▼
Agent 2 (schema)  ──────────────► every other agent imports from here
   │
   ├──► Agent 3 (ingestion) ──┐
   ├──► Agent 4 (auth/profile)┤
   │                          ├──► Agent 5 (matching) ──► Agent 6 (generation/lifecycle)
   │                          │                                    │
   │                          │                                    ▼
   └──────────────────────────┴──────────────────────────► Agent 7 (frontend)
                                                                   │
                                                                   ▼
                                                            Agent 8 (billing — last, post-BSS)
```

**Hard rule:** Agent 2 must finish the schema before Agents 3–8 write any query.
If you build on a schema that later changes, you rework everything downstream.

**Billing is last and gated.** Agent 8's output stays behind a feature flag (`BILLING_ENABLED=false`)
until BSS funding starts (~Mar 2027). Building it early is fine; *enabling* it early breaks BSS eligibility.

---

## 3. Monorepo ownership map (no file has two owners)

```
agora-jobs/
├─ turbo.json ............................. Agent 1
├─ pnpm-workspace.yaml .................... Agent 1
├─ biome.json ............................. Agent 1
├─ .github/workflows/ ..................... Agent 1
├─ apps/
│  ├─ web/
│  │  ├─ src/middleware.ts ................ Agent 4 (Clerk)
│  │  ├─ src/app/api/trpc/[trpc]/route.ts . Agent 1 (skeleton)
│  │  ├─ src/app/api/webhooks/clerk/ ...... Agent 4
│  │  ├─ src/app/api/webhooks/stripe/ ..... Agent 8
│  │  ├─ src/app/(screens)/ ............... Agent 7 (ALL screens)
│  │  ├─ src/components/ .................. Agent 7
│  │  ├─ src/server/trpc.ts ............... Agent 1 (init + base procedures)
│  │  └─ src/server/routers/
│  │     ├─ _app.ts ....................... Agent 1 (skeleton; each agent registers)
│  │     ├─ onboarding.ts | profile.ts .... Agent 4
│  │     ├─ deck.ts | jobs.ts ............. Agent 5
│  │     ├─ applications.ts ............... Agent 6
│  │     └─ billing.ts .................... Agent 8
│  └─ workers/
│     ├─ src/index.ts ..................... Agent 1 (bootstrap; each agent registers worker)
│     ├─ src/queues.ts .................... Agent 1 (queue instances; each agent adds its own)
│     └─ src/jobs/
│        ├─ scrape-*.ts | embed-jobs.ts ... Agent 3
│        ├─ extract-profile.ts ............ Agent 4
│        └─ generate-*.ts | followup.ts ... Agent 6
├─ packages/
│  ├─ config/ ............................. Agent 1 (tsconfig, shared lint)
│  ├─ db/ ................................. Agent 2 (schema + migrations — IMPORT ONLY for others)
│  ├─ legal/ .............................. Agent 5 (pure-TS constraint engine)
│  ├─ ai/
│  │  ├─ src/embedding/ ................... Agent 3 (Cohere via Bedrock)
│  │  ├─ src/prompts/ | eval.ts | gen.ts .. Agent 6
│  │  └─ src/storage.ts (S3 helpers) ...... Agent 1 (shared; others import)
│  └─ ui/ ................................. Agent 7 (shadcn/ui base components)
```

**Shared-file protocol** (the 3 files multiple agents register into):
`_app.ts`, `queues.ts`, `index.ts`. Agent 1 creates the skeleton with clear `// Agent N: register here`
markers. Each agent ADDS its line — never rewrites the file. Same pattern the old Celery
beat_schedule used. If two agents edit the same line, that's a coordination bug — escalate, don't guess.

---

## 4. Shared conventions (every agent obeys these)

These are the contracts that keep 8 agents consistent. Verified against current library docs.

### 4.1 Stack versions (no deviation)
- **Runtime:** Node.js 22 LTS · **Package manager:** pnpm 9 · **Monorepo:** Turborepo
- **Web:** Next.js 15 (App Router) · React 19 · Tailwind + shadcn/ui · Framer Motion
- **API:** tRPC v11 · Zod · **ORM:** Drizzle · **Queue:** BullMQ + ioredis
- **Lint/format:** Biome · **Validation:** Zod (shared client↔server schemas)

### 4.2 Auth & data isolation (PRIMARY control)
- Auth is **Clerk** (EU data-residency tenant). The session `userId` is the only trust anchor.
- **Every** user-scoped query MUST filter by the `userId` resolved in tRPC `protectedProcedure`.
  Never trust a `userId` passed from the client.
- Postgres RLS is **defense-in-depth** (Agent 2, optional migration) — not a substitute for app-layer scoping.

### 4.3 tRPC (v11 — App Router)
- Context: `initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create()`
- Route handler uses `fetchRequestHandler` from `@trpc/server/adapters/fetch`.
- **`@trpc/next` is NOT used** — that's the retired Pages Router adapter.

### 4.4 Queue (BullMQ)
- One `ioredis` connection, `maxRetriesPerRequest: null` (required by BullMQ).
- **Every job MUST be idempotent**: deterministic `jobId` (e.g. `gen_${applicationId}`).
- Caution: `removeOnComplete` + custom `jobId` interact — a removed job no longer dedupes.
  For dedupe-critical jobs, keep a short retention window, not `removeOnComplete: true`.

### 4.5 AI / embeddings (EU residency is non-negotiable)
- **LLM:** Claude via **AWS Bedrock `eu-central-1` (Frankfurt)**. Sonnet 4.x = hot path,
  Haiku 4.5 = volume/eval. **Opus is ruled out.** Model IDs come from env vars — never hardcode.
- **Embeddings:** Cohere `embed-multilingual-v3` via Bedrock, **1024 dimensions** (NOT 1536).
  `input_type: "search_document"` for jobs, `"search_query"` for profile lookups.
- **No US endpoints, ever.** An embedding call to a US region is as much a GDPR breach as an LLM call.

### 4.6 Vector search (Drizzle + pgvector)
- Column: `vector("embedding", { dimensions: 1024 })`
- Index: HNSW — `.using("hnsw", t.embedding.op("vector_cosine_ops"))` (array index syntax `(t) => [...]`)
- Similarity: `cosineDistance` from `drizzle-orm`. Cosine ops only — `vector_l2_ops` silently returns wrong rankings.

### 4.7 Submission model (legal hard rule)
- **No server-side application submitter, ever (Mode 3 is permanently banned).**
- `submitted` status only ever follows an explicit user action from `approved`. Enforced server-side.

---

## 5. Definition of done — fleet level

The fleet is done when the full loop runs on EU infra:
**sign up → onboard → legal-filtered deck → generate CV/CL → score → approve → submit → track → follow-up.**
Plus: GDPR erasure works, billing is built behind a flag, and `turbo typecheck` passes across all packages.

---

## 6. Per-agent files

| File | Agent |
|------|-------|
| `CLAUDE_AGENT1.md` | Infrastructure & DevOps |
| `CLAUDE_AGENT2.md` | Database & Schema |
| `CLAUDE_AGENT3.md` | Ingestion & Scraping |
| `CLAUDE_AGENT4.md` | Auth & Profile |
| `CLAUDE_AGENT5.md` | Matching & Search |
| `CLAUDE_AGENT6.md` | Generation, Eval & Application Lifecycle |
| `CLAUDE_AGENT7.md` | Frontend (Web PWA) |
| `CLAUDE_AGENT8.md` | Payments & Billing |
