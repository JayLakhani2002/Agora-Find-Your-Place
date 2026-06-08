# Technical Requirements Document (TRD)
**Project:** Agora Jobs · **Document:** TRD-001 · **Version:** 1.0  
**Status:** Draft · **Date:** 2026-06-08 · **Owner:** Engineering  
**Source documents:** `../Buisness Planning/technical tech stack/IMPLEMENTATION.md` · `../Buisness Planning/technical tech stack/Agora-Jobs-Monorepo-Scaffold.md` · `../Buisness Planning/technical tech stack/Agora-Jobs-Tech-Stack.md`

---

## Table of Contents
1. [Technology Stack Decisions](#1-technology-stack-decisions)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Data Model & Schema](#3-data-model--schema)
4. [API Surface](#4-api-surface)
5. [AI Pipeline Technical Requirements](#5-ai-pipeline-technical-requirements)
6. [Worker Infrastructure Requirements](#6-worker-infrastructure-requirements)
7. [Security & Compliance Requirements](#7-security--compliance-requirements)
8. [Testing Requirements](#8-testing-requirements)
9. [Non-Functional Technical Requirements](#9-non-functional-technical-requirements)
10. [Build & Deployment Requirements](#10-build--deployment-requirements)
11. [Environment & Configuration](#11-environment--configuration)
12. [Implementation Phase Summary](#12-implementation-phase-summary)
13. [Traceability Appendix](#13-traceability-appendix)

---

## 1. Technology Stack Decisions

### 1.1 Approved Stack — Quick Reference

| Category | Primary Selection | Rationale |
|----------|------------------|-----------|
| Language | TypeScript (Node.js 22 LTS) | One language end-to-end; shared types |
| Monorepo | Turborepo + pnpm workspaces | Fast cached builds; multi-surface TS |
| Web | Next.js 15 (App Router), Vercel `fra1` | RSC + SEO; EU region |
| Mobile | Expo (React Native) + EAS | Code reuse; native camera/push |
| Extension | WXT + React (Manifest V3) | Modern extension framework; HMR |
| Styling | Tailwind CSS + shadcn/ui + NativeWind | Shared design language |
| API | tRPC (internal) + Hono REST (partner) | End-to-end typesafe; no codegen |
| Auth | Clerk (EU data region — **Business tier**) | Mobile + web; httpOnly cookies. EU residency requires Business plan (AC-07); self-hosted Auth.js is the fallback — open decision OAQ-02 |
| Database | PostgreSQL on Neon (EU Frankfurt) | Relational + JSONB + pgvector |
| ORM | Drizzle ORM | Typesafe; SQL-first; edge-compatible |
| Vector search | pgvector (in Postgres) | No separate DB in V1 |
| Cache / Queue | Upstash Redis (EU) + BullMQ | Serverless Redis; durable queue |
| LLM (generation) | Claude **Sonnet 4.x** via AWS Bedrock (eu-central-1) | EU inference; meets cost/latency NFRs (Opus does not — F-H1) |
| LLM (volume/eval) | Claude Haiku 4.5 via Bedrock | Normalization, classification, eval judge, reranker |
| Embeddings | Cohere Embed Multilingual v3 via Bedrock (eu-central-1) | EU-resident, bilingual DE/EN, 1024-dim |
| Browser automation | Playwright + Browserbase/Apify EU | Managed headless; no browser farm |
| Object storage | Scaleway EU / AWS S3 eu-central-1 | EU-native; GDPR-friendly |
| Email | Resend + React Email | EU-region; typed templates |
| Error tracking | Sentry (EU region) | Cross-platform; EU data |
| Analytics | PostHog (EU Cloud) | GDPR-friendly; EU hosted |
| LLM tracing | Langfuse | Per-call cost, latency, quality |
| CI/CD | GitHub Actions + Turbo remote cache | Cached monorepo pipeline |
| Testing | Vitest + Playwright + Maestro + Promptfoo | Unit/E2E/mobile/LLM |
| Payments | Stripe | Subscriptions + SEPA + EU VAT |

### 1.2 Rejected Alternatives (documented for traceability)

| Considered | Rejected in favour of | Reason |
|-----------|----------------------|--------|
| Direct Anthropic API | AWS Bedrock | Bedrock provides explicit EU data residency; direct API EU DPA terms less clear |
| Prisma ORM | Drizzle ORM | Drizzle is lighter, SQL-first, edge-compatible; Prisma heavier with edge limitations |
| Supabase | Neon + Drizzle | Neon gives finer control; Supabase bundles auth which we replace with Clerk |
| GraphQL | tRPC | tRPC provides same type safety with less boilerplate in a TS monorepo |
| Python FastAPI | TypeScript / tRPC | TS-everywhere reduces language context switching; all packages shareable |

---

## 2. Monorepo Structure

### 2.1 Required Directory Layout

```
agora-jobs/
├─ apps/
│  ├─ web/            # Next.js 15 App Router (PWA)
│  ├─ mobile/         # Expo (React Native) + Expo Router
│  ├─ extension/      # WXT (Manifest V3) + React
│  └─ workers/        # BullMQ workers (scraping/ingestion, generation, tracking — NO submit)
├─ packages/
│  ├─ ui/             # Shared design system (shadcn/ui, NativeWind, Tailwind)
│  ├─ api/            # tRPC routers + Zod schemas
│  ├─ db/             # Drizzle schema + migrations + Neon client
│  ├─ ai/             # Claude/Bedrock client, PII redaction, prompts, evals
│  ├─ core/           # Shared types, business logic, legal rule engine
│  └─ config/         # Shared tsconfig, biome.json, tailwind preset
├─ pnpm-workspace.yaml
└─ turbo.json
```

**TR-01:** All apps MUST import shared packages via workspace references (`@agora/ui`, `@agora/api`, `@agora/db`, `@agora/ai`, `@agora/core`). No direct copy-paste of shared logic between apps.

**TR-02:** The `turbo.json` pipeline MUST define tasks: `build`, `dev`, `lint`, `test`, `typecheck` with correct dependency declarations so Turborepo can cache and parallelize correctly.

### 2.2 Package Responsibilities

| Package | Owns | Does NOT own |
|---------|------|-------------|
| `packages/db` | Drizzle schema, migrations, Neon client, type exports | Business logic, API routes |
| `packages/api` | tRPC routers, Zod input schemas, procedure definitions | Database queries (calls `packages/db`) |
| `packages/ai` | Bedrock client, model routing, PII redaction, prompts, quality eval | Job queue management |
| `packages/core` | Legal eligibility rules, shared TypeScript types, constants | Rendering, API layer |
| `packages/ui` | Shared components, design tokens, Storybook | App-specific layouts |

---

## 3. Data Model & Schema

### 3.1 Core Tables (Drizzle / PostgreSQL)

```typescript
// packages/db/src/schema.ts

export const users = pgTable("users", {
  id:        uuid("id").primaryKey().defaultRandom(),
  clerkId:   text("clerk_id").notNull().unique(),
  email:     text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fullName:    text("full_name"),
  voice:       jsonb("voice"),           // tone/preferences for AI generation
  visaStatus:  text("visa_status"),      // §16b | §20a | EU | §18c | near_graduation
  workDaysRemaining: integer("work_days_remaining"),  // 140-day rule tracker
  weeklyHoursMax: integer("weekly_hours_max"),
  germanLevel: text("german_level"),     // A1|A2|B1|B2|C1|C2
  embedding:   vector("embedding", { dimensions: 1024 }),  // Cohere embed-multilingual-v3 = 1024 (NOT 1536)
  raw:         jsonb("raw"),             // structured CV data — see TR-13a: ID numbers are NOT stored here
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id:          uuid("id").primaryKey().defaultRandom(),
  source:      text("source").notNull(),        // "stellenticket" | "berlin_startup_jobs" | ...
  externalId:  text("external_id"),
  title:       text("title").notNull(),
  company:     text("company").notNull(),
  location:    text("location"),
  hourlyRate:  numeric("hourly_rate"),
  weeklyHours: integer("weekly_hours"),
  germanLevelRequired: text("german_level_required"),
  contractType: text("contract_type"),          // werkstudent | minijob | full_time
  language:    text("language"),                // de | en
  raw:         jsonb("raw"),
  embedding:   vector("embedding", { dimensions: 1024 }),  // must match EMBED_MODEL output dim
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  jobId:        uuid("job_id").references(() => jobs.id).notNull(),
  status:       text("status").notNull().default("draft"),
  // status machine: draft | approved | submitted | failed | rejected | interview | offer | withdrawn
  cv:           text("cv"),
  coverLetter:  text("cover_letter"),
  preFills:     jsonb("pre_fills"),
  evalScore:    numeric("eval_score"),
  evalDetails:  jsonb("eval_details"),          // per-dimension scores
  approvedAt:   timestamp("approved_at"),
  submittedAt:  timestamp("submitted_at"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export const auditLog = pgTable("audit_log", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull(),
  action:    text("action").notNull(),           // "application.approved" | "application.submitted"
  detail:    jsonb("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // APPEND-ONLY: no UPDATE or DELETE operations permitted
});
```

**TR-03:** pgvector extension MUST be enabled on the Postgres instance before any migration runs: `CREATE EXTENSION IF NOT EXISTS vector;`

**TR-04:** HNSW indexes MUST be created on both `jobs.embedding` and `profiles.embedding`:
```sql
CREATE INDEX ON jobs USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON profiles USING hnsw (embedding vector_cosine_ops);
```

**TR-05:** All tables with `userId` foreign keys MUST use `onDelete: "cascade"` to support GDPR right-to-erasure.

**TR-06:** The `audit_log` table MUST NOT have any `UPDATE` or `DELETE` operations — enforced both by application convention and, where possible, by Postgres row-level security policy.

### 3.2 Per-Country Config Schema

**TR-07:** Job categories, legal rules, ATS vendors, and CV format conventions SHALL be stored in a configuration schema (not hardcoded) to enable country expansion as a configuration change:

```typescript
// packages/core/src/country-config.ts
interface CountryConfig {
  countryCode: string;           // "DE" | "NL" | "FR"
  visaRules: VisaRule[];         // per visa type: maxHoursPerWeek, maxDaysPerYear
  atsVendors: string[];          // ["Softgarden", "Personio", "d.vinci"]
  cvFormat: CVFormatSpec;        // page limits, date format, required sections
  jobSources: JobSourceConfig[]; // scraping targets + API config
  languageModel: LanguageConfig; // generation language defaults
}
```

---

## 4. API Surface

### 4.1 Internal API — tRPC

All internal API communication between clients (web, mobile, extension) and the server SHALL use tRPC procedures:

```typescript
// packages/api/src/router.ts (representative structure)
export const appRouter = router({
  auth: router({
    me: protectedProcedure.query(...),
  }),
  profile: router({
    get: protectedProcedure.query(...),
    update: protectedProcedure.input(ProfileUpdateSchema).mutation(...),
  }),
  jobs: router({
    deck: protectedProcedure.query(...),          // daily swipe deck
    detail: protectedProcedure.input(z.object({ id: z.string() })).query(...),
  }),
  applications: router({
    generate: protectedProcedure.input(GenerateSchema).mutation(...),
    approve: protectedProcedure.input(z.object({ id: z.string() })).mutation(...),
    list: protectedProcedure.query(...),
  }),
});
```

**TR-08:** All `protectedProcedure` implementations MUST verify `ctx.userId` and scope all database queries to that user — no user may access another user's data.

**TR-09:** Input validation MUST use Zod schemas defined in `packages/api` and shared to clients for type inference.

### 4.2 External REST API (Partner Integrations)

**TR-10:** A stable REST surface SHALL be exposed via Hono (or Next.js Route Handlers) for any third-party integrations (job board APIs, partnership ingestion endpoints). This surface SHALL have OpenAPI documentation generated from Zod schemas.

---

## 5. AI Pipeline Technical Requirements

### 5.1 Bedrock Client Configuration

```typescript
// packages/ai/src/client.ts
import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
export const claude = new AnthropicBedrock({ awsRegion: "eu-central-1" });

export const MODELS = {
  // Per-application generation (CV + cover letter + pre-fills).
  // Sonnet — NOT Opus — to meet the < €0.10/app cost and < 60s latency targets.
  generation: "anthropic.claude-sonnet-4-x-v1:0",
  // High-volume / cheap tasks: normalization, classification, quality-eval judge, reranker.
  volume:     "anthropic.claude-haiku-4-5-v1:0",
  // Offline quality benchmarking ONLY — never called in the user-facing hot path.
  benchmark:  "anthropic.claude-opus-4-8-v1:0",
} as const;

// Embeddings — EU-resident bilingual model via Bedrock. 1024 dims (Cohere v3).
export const EMBED_MODEL = "cohere.embed-multilingual-v3";  // 1024-dim output
```

**TR-11:** The Bedrock client MUST be configured with `awsRegion: "eu-central-1"`. Any other region is a GDPR compliance failure.

**TR-11a:** **Generation MUST use Sonnet, not Opus.** Opus 4.8 in the per-application hot path is incompatible with NFR cost (< €0.10/app) and latency (< 60s) targets — Opus output pricing alone (~$75/Mtok) drives a single CV+letter generation to ~€0.25–0.35. Opus is permitted only for offline quality benchmarking (`MODELS.benchmark`). *(See Architecture Review F-H1.)*

**TR-11b:** Embeddings MUST be generated by an EU-resident bilingual model (default `cohere.embed-multilingual-v3`, 1024 dims). The `vector(...)` column dimension MUST equal the model's output dimension. If Cohere v3 is unavailable in `eu-central-1`, choose an alternative EU-resident model and update both `EMBED_MODEL` and the schema dimension together. *(See F-C4.)*

**TR-12:** Model IDs MUST be confirmed against the Bedrock console in `eu-central-1` at setup time — the IDs above are placeholders subject to AWS versioning and MUST be verified before any AI code is written (OAQ-01).

### 5.2 PII Redaction

**TR-13a — Data minimization is the PRIMARY control (defense in depth).** Passport numbers, visa reference numbers, and national ID numbers are NOT required to generate a CV or cover letter. They MUST therefore:
1. Never be persisted as free text in `profiles.raw` or any generation-bound field (store only what eligibility needs: visa *class*, days-remaining *count*, weekly-hours *cap* — all derived, non-identifying values);
2. Never be included in the profile *projection* the generation worker assembles as LLM context.

This makes redaction a second line of defense, not the only one. *(See Architecture Review F-H4 — relying on regex alone is unsafe.)*

**TR-13:** As defense in depth, a PII redaction function MUST run on every context string before any LLM call. **The regex below is illustrative and deliberately conservative — note it must NOT be the primary control:** a naive `[A-Z0-9]{8,9}` pattern both over-redacts legitimate CV content (e.g. "POSTGRES", "FRONTEND" are 8 uppercase chars) and under-redacts real identifiers in other formats. Redaction MUST be field-aware (operate on known free-text fields, never blanket-scrub structured skill/company tokens) and validated against real samples before beta.

```typescript
// packages/ai/src/redact.ts
// DEFENSE-IN-DEPTH ONLY. Primary control is TR-13a (data minimization).
export function redactPII(text: string): string {
  return text
    // Anchored, validated patterns only — do NOT use broad [A-Z0-9]{8,9}.
    .replace(/\b[A-PR-WY][1-9]\d{6}\b/g, "[REDACTED_PASSPORT]")  // Indian passport: letter + 7 digits
    .replace(/\b\d{2}\s?\d{6}\s?[A-Z]\b/g, "[REDACTED_PERMIT]"); // DE residence-permit-style ref
  // Extend ONLY with patterns validated against real, consented samples.
}
```

**TR-14:** PII redaction unit tests MUST cover: German passport format, Indian passport format, German residence permit format, Fiktionsbescheinigung reference numbers, IBAN — **and MUST include negative tests proving legitimate CV tokens (POSTGRES, JAVASCRIPT, FastAPI, company names in caps) are NOT redacted.** Tests run in CI.

**TR-15:** The generation worker MUST (a) assemble context only from the minimized profile projection (TR-13a), and (b) call `redactPII()` on that assembled context before calling `claude.messages.create`. Both steps are enforced by code review and an integration test that asserts no raw ID pattern reaches the Bedrock call.

### 5.3 Generation Quality Eval

**TR-16:** The quality eval judge SHALL use Claude Haiku 4.5 (not Opus) to minimize eval cost while maintaining accuracy.

**TR-17:** The eval MUST score all 6 dimensions (ATS parseability, keyword coverage, factual consistency, format compliance, tone match, language quality) and return both individual scores and a weighted overall score.

**TR-18:** If the overall score is < 8.0, the worker MUST auto-regenerate once. If still < 8.0, the materials SHALL be shown to the user with the score breakdown and a manual regenerate option.

**TR-19:** All eval scores and token usage MUST be written to the `eval_records` table (or `applications.evalDetails`) for quality monitoring and future model comparison.

### 5.4 Prompt Management

**TR-20:** All prompts SHALL be stored in version-controlled files under `packages/ai/src/prompts/`. No prompts hardcoded in worker code.

**TR-21:** Promptfoo SHALL be configured to run regression tests on all prompts in CI. A failing eval gates the PR merge.

---

## 6. Worker Infrastructure Requirements

### 6.1 Worker Process

**TR-22:** Workers SHALL be implemented as long-running Node.js processes using BullMQ:

```typescript
// apps/workers/src/index.ts (starter pattern)
import { Worker, Queue } from "bullmq";
const connection = { url: process.env.REDIS_URL! }; // Upstash EU

export const ingestQueue   = new Queue("ingest",   { connection }); // scrape + normalize jobs
export const generateQueue = new Queue("generate", { connection }); // CV/cover-letter generation + eval
export const trackQueue    = new Queue("track",    { connection }); // status polling, day-10 follow-up draft, interview-prep gen
// NOTE: there is no "apply"/submit queue — submission is client-side (see §6.2, F-C1).
```

**TR-23:** Worker containers SHALL be deployed to Railway, Render, or Fly.io in EU regions. Container must remain running (no serverless invocation).

**TR-24:** Each queue SHALL have retry configuration with exponential backoff (minimum 3 attempts) and a dead-letter queue for exhausted jobs.

**TR-24a:** Every queued job SHALL be idempotent. Use deterministic `jobId`s and dedupe keys so BullMQ's at-least-once delivery cannot cause duplicate side effects: generation deduped on `(applicationId, profileVersion, jobVersion)`; ingestion deduped on `(source, externalId)` (TR-29); follow-up drafts deduped on `(applicationId, "day10")`. *(See Architecture Review F-M1.)*

### 6.2 Submission Recording — No Server-Side Submitter

> **Critical (F-C1).** There is no server-side worker that submits applications to third-party portals. That would be Mode 3, which is permanently banned (BR-REV-01). Submission is a client-side user action: Mode 1 (manual) or Mode 2 (extension autofill, user clicks the company's Submit). The backend only *gates the transition to `approved`*, *serves the approved package to the client*, and *records* the submission the client reports.

**TR-25:** The state machine MUST enforce that `submitted` can only be set from `approved`, and only via an authenticated client-initiated mutation (`applications.markSubmitted`). The mutation MUST re-verify ownership and current status server-side:

```typescript
// packages/api — applications.markSubmitted (client-initiated, NOT a queue worker)
markSubmitted: protectedProcedure
  .input(z.object({ id: z.string(), mode: z.enum(["mode1", "mode2"]) }))
  .mutation(async ({ ctx, input }) => {
    const app = await getOwnedApplication(ctx.userId, input.id);   // ownership check
    if (app.status !== "approved") {
      throw new TRPCError({ code: "PRECONDITION_FAILED",
        message: `Cannot mark submitted: ${app.id} is ${app.status}, not approved` });
    }
    await writeAuditLog({ userId: ctx.userId, applicationId: app.id,
      action: "application.submitted", detail: { mode: input.mode } }); // append-only
    return setStatus(app.id, "submitted", { submittedAt: new Date() });
  }),
```

**TR-26:** No BullMQ queue or worker may open a browser session against a third-party application portal or POST an application form. Server-side Playwright is restricted to job ingestion (TR-27). The Mode-2 autofill runs exclusively in the extension, in the user's own browser session, and contains no auto-submit code path.

**TR-26a:** The `markSubmitted` mutation MUST be idempotent — calling it twice for the same application MUST NOT write a second `submitted` audit row or duplicate-notify. *(See F-M1.)*

### 6.3 Scraping

**TR-27:** Scrapers MUST use managed browser infrastructure (Browserbase or Apify EU) — no self-managed Playwright browser farm.

**TR-28:** Scrapers MUST respect `robots.txt` and rate-limit to ≤1 request per 5 seconds per domain.

**TR-29:** Job deduplication MUST occur on `(source, externalId)` before any database write — no duplicate jobs inserted on re-scrape.

---

## 7. Security & Compliance Requirements

### 7.1 Authentication & Authorization

**TR-30:** All API routes serving user data MUST use `protectedProcedure` that verifies the Clerk session and extracts `userId`.

**TR-31:** Postgres row-level security policies MUST be configured so that even a compromised application-level query cannot return another user's data.

**TR-31a:** Plan entitlements MUST be enforced server-side, not in the client. The `applications.generate` procedure MUST check, against the user's plan and usage counters: (a) Mode-2/premium gating (paid only); (b) the regeneration limit (5/hour, AR-54); and (c) any free-tier anti-abuse generation cap **if one is adopted** (value TBD — see PRD FR-22a / Architecture Review OD-2; the "5/month" figure in earlier drafts is a placeholder, not a settled requirement, and the free tier may be uncapped for growth). The client may show remaining quota, but the server is the authority.

### 7.2 File Upload Security

**TR-32:** File upload endpoint MUST reject non-PDF and non-DOCX files (MIME type and magic byte validation).

**TR-33:** Uploaded files MUST be parsed server-side in a sandboxed subprocess. Never served directly from the app domain.

**TR-34:** CV files MUST be stored in EU object storage (Scaleway / S3 eu-central-1) and served exclusively via time-limited signed URLs.

### 7.3 GDPR Erasure

**TR-35:** Account deletion MUST cascade across: all Postgres tables (via `onDelete: cascade` FK), Scaleway/S3 object storage (all files for that userId), pgvector embeddings, Redis cache entries, Sentry events, and PostHog user records.

**TR-36:** GDPR erasure MUST be tested as a full end-to-end test before any real user data enters the system.

**TR-36a:** Backups and disaster recovery MUST be configured: Neon point-in-time recovery (PITR) on production; object-storage versioning on document buckets; a restore procedure documented and tested at least once before public launch. Erasure (TR-35) MUST also purge data from backups within the documented backup-retention window, and the RoPA MUST state that window. *(See Architecture Review F-M7.)*

### 7.4 Secrets Management

**TR-37:** All secrets SHALL be managed via Doppler (or equivalent). No secrets committed to the repository. No secrets bundled into mobile or extension clients.

**TR-38:** Secrets SHALL be environment-scoped: `dev`, `staging`, `production`. Production secrets accessible only in production deployment context.

---

## 8. Testing Requirements

| Layer | Tool | Requirement |
|-------|------|-------------|
| Unit tests | Vitest | All pure business logic functions in `packages/core` and `packages/ai` have unit coverage. PII redaction has explicit test cases for each document format. |
| Integration tests | Vitest + real Neon branch | tRPC procedures tested against a real test database branch. Cross-user access denial tested explicitly. |
| Web E2E | Playwright | Core user journeys tested: onboarding completion, right-swipe → generate → approve → Mode 1 submit, pipeline tracker status update. |
| Mobile E2E | Maestro | Same core journeys as web E2E, on iOS and Android simulators. |
| LLM eval | Promptfoo | All generation prompts have eval suites: tone, relevance, format compliance, PII absence. Runs in CI; failing eval blocks merge. |
| Type safety | `tsc --noEmit` | Runs across entire monorepo in CI on every PR. |
| Security | Manual pen-test | Auth, generation, and submission/state-machine paths pen-tested before public launch (Phase 7); explicit check that no server-side submitter exists (F-C1). |

**TR-39:** Tests MUST be added with each feature, not deferred to after launch.

**TR-40:** The PII redaction test suite MUST include at least the following patterns: German passport (format C3X7Z9Y), Indian passport (format A1234567), German residence permit reference, Fiktionsbescheinigung reference, IBAN.

---

## 9. Non-Functional Technical Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| TR-NFR-01 | Generation latency (full 3-artifact set) | < 60 seconds |
| TR-NFR-02 | Swipe deck generation latency | < 3 seconds |
| TR-NFR-03 | API response time (p95) | < 500ms for non-generation endpoints |
| TR-NFR-04 | LLM cost per application | < €0.10 on the happy path (Sonnet generation + Haiku eval, profile context cached); < €0.20 including one auto-regeneration. Achievable with Sonnet; NOT achievable with Opus (F-H1). Track per-call in Langfuse against this budget. |
| TR-NFR-05 | Eval score availability | Eval score visible within 5 seconds of generation completion |
| TR-NFR-06 | Worker job throughput | Handle peak of 50 concurrent generation jobs without queue backup |
| TR-NFR-07 | File upload acceptance | PDF/DOCX ≤ 5MB accepted; other formats or larger files rejected with clear error |
| TR-NFR-08 | Uptime SLA | 99.5% monthly (web + API) |

---

## 10. Build & Deployment Requirements

### 10.1 CI Pipeline

**TR-41:** The GitHub Actions CI pipeline MUST run on every PR and every push to `main`:
```yaml
steps:
  - pnpm install --frozen-lockfile
  - pnpm turbo lint
  - pnpm turbo typecheck
  - pnpm turbo test
  - pnpm promptfoo eval  # LLM regression tests
```

**TR-42:** Turborepo remote cache MUST be configured to speed up CI build times.

**TR-43:** No PR may be merged to `main` with a failing CI check. Branch protection is required.

### 10.2 Deployment

**TR-44:** The web app SHALL deploy automatically to Vercel on merge to `main`, with Vercel function regions set to `fra1`.

**TR-45:** PR previews SHALL deploy automatically with a unique URL and an isolated Neon database branch.

**TR-46:** The mobile app SHALL use EAS Build for App Store / Play Store builds and EAS Update for OTA hotfixes.

---

## 11. Environment & Configuration

### 11.1 Required Environment Variables

```bash
# Database
DATABASE_URL=            # Neon EU pooled connection string

# Queue
REDIS_URL=               # Upstash EU Redis URL

# LLM (AWS Bedrock)
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Auth
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Object Storage
SCALEWAY_ACCESS_KEY=
SCALEWAY_SECRET_KEY=
SCALEWAY_BUCKET=
SCALEWAY_ENDPOINT=

# Observability
SENTRY_DSN=
POSTHOG_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=
```

**TR-47:** All environment variables MUST be validated at application startup using Zod schema validation. Missing required variables MUST throw on startup, not fail silently at runtime.

---

## 12. Implementation Phase Summary

| Phase | Key Technical Deliverables | Critical TR IDs |
|-------|---------------------------|-----------------|
| Phase 0 — Foundation | Turborepo setup, CI pipeline, EU accounts, Bedrock access | TR-01, TR-02, TR-41 to TR-43 |
| Phase 1 — Core Data & Auth | Drizzle schema, pgvector, Neon branching, Clerk auth, tRPC base | TR-03 to TR-09, TR-30, TR-31 |
| Phase 2 — Job Ingestion | Worker + BullMQ, scraper (1 source), Haiku normalization, pgvector embeddings | TR-22 to TR-29 |
| Phase 3 — AI Generation | Bedrock client, PII redaction, generation workers, review UI, approval gate, Promptfoo evals | TR-11 to TR-21, TR-39, TR-40 |
| Phase 4 — Assisted Submission & Tracking | Client-side `markSubmitted` (Mode 1/2) with server approval gate, append-only audit log, status tracker, follow-up drafting. **No server-side portal submission.** | TR-25, TR-26, TR-26a |
| Phase 5 — Mobile | Expo shell, Clerk mobile, tRPC client, document capture, EAS pipeline | TR-46 |
| Phase 6 — Extension | WXT shell, auth bridge, job capture, autofill | — |
| Phase 7 — Compliance | GDPR erasure, DPAs, consent UX, encryption, pen-test | TR-35, TR-36, TR-37 |
| Phase 8 — Observability & Launch | Sentry, PostHog, Langfuse, cost dashboards, Stripe billing | TR-47 |

---

## 13. Traceability Appendix

| TR ID | ARD Requirement | PRD / BRD Requirement | Source |
|-------|----------------|----------------------|--------|
| TR-03, TR-04 | AR-28, AR-29 | — | `IMPLEMENTATION.md` Phase 1 |
| TR-11, TR-12 | AR-33 | — | `Agora-Jobs-Tech-Stack.md` §6.1 |
| TR-13 to TR-15 | AR-06, AR-52 | FR-16, BR-11 | `IMPLEMENTATION.md` Phase 3.2 |
| TR-16 to TR-19 | AR-08 | FR-18, FR-19 | `IMPLEMENTATION.md` Phase 3.9 |
| TR-25, TR-26 | AR-09, AR-10 | FR-22, BR-05 | `IMPLEMENTATION.md` Phase 4.2 |
| TR-35, TR-36 | AR-55 | BR-10 | `Agora-Jobs-Tech-Stack.md` §8 |

---

*This document specifies what the engineering team builds and how. Deviations from any TR requirement must be documented with rationale and signed off by the founding team.*
