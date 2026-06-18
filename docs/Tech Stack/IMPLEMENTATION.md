# Agora Jobs — Implementation Guide

**Last updated:** 2026-06-08
**Audience:** Engineers building Agora Jobs from scratch
**Companion docs:** `Agora-Jobs-Tech-Stack.md` · `Agora-Jobs-Architecture.md` · `Agora-Jobs-Cost-Estimate.md` · `Agora-Jobs-Implementation-Plan.md`

This is the detailed, do-this-then-that guide. Each phase explains **what you're building, why, the steps, the code, and how you know it's done.** Work top to bottom — the phases form a dependency spine (0 → 1 → 2 → 3 → 4), with mobile (5) and extension (6) branching off once the API is stable.

> **Three rules that override convenience throughout this guide:**
> 1. **PII redaction runs before any LLM call** touching user data.
> 2. **Auto-apply never fires without explicit human approval** + an audit log entry.
> 3. **Everything personal stays in the EU** — pin every region to `eu-central-1` / `fra1`.

---

## Phase 0 — Foundation & Project Setup

### What you're building
The empty-but-wired skeleton: a Turborepo monorepo, CI that lints/typechecks/tests, EU infrastructure accounts, and secret management. No features yet — just a floor you can build on without rework.

### Why it matters
A clean monorepo with shared config means every app speaks the same TypeScript, shares types, and builds with one cache. Getting EU regions and Bedrock access sorted now avoids a painful migration later.

### Steps

**0.1 — Create the monorepo**
```bash
pnpm dlx create-turbo@latest agora-jobs
cd agora-jobs
corepack enable
```
Create the workspace layout and `pnpm-workspace.yaml`:
```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```
```bash
mkdir -p apps/{web,mobile,extension,workers} packages/{ui,api,db,ai,core,config}
```

**0.2 — Shared config package**
Put your base `tsconfig.json`, `biome.json`, and Tailwind preset in `packages/config` and extend them everywhere. This is what keeps 4 apps consistent.
```bash
cd packages/config && pnpm init
pnpm add -D -w @biomejs/biome typescript
pnpm biome init
```

**0.3 — GitHub repo + protection**
Create the repo, protect `main` (require PR + green CI), add a PR template. Commit only when the user asks; branch first if you're on main.

**0.4 — CI pipeline** (`.github/workflows/ci.yml`)
```yaml
name: CI
on: { pull_request: {}, push: { branches: [main] } }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint typecheck test
```
Add the Turborepo remote cache token as a repo secret so CI reuses build artifacts.

**0.5 — Provision EU accounts**
Create and confirm EU regions for: **Neon** (Frankfurt), **Upstash** (EU), **Scaleway** (object storage), **Vercel**, **Clerk** (EU data region), **AWS** (for Bedrock, `eu-central-1`). Record each region in your data-flow map (Phase 7.1 starts here).

**0.6 — Secrets with Doppler**
```bash
brew install dopplerhq/cli/doppler && doppler login
doppler setup        # link project + config
doppler run -- pnpm dev   # injects secrets locally
```
Never commit secrets; never bundle them into mobile/extension clients.

**0.7 — Bedrock model access**
In the AWS console (`eu-central-1`), request access to Claude **Opus** and **Haiku**. Verify with a throwaway script before moving on:
```ts
import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
const c = new AnthropicBedrock({ awsRegion: "eu-central-1" });
const r = await c.messages.create({
  model: "anthropic.claude-haiku-4-5-v1:0",
  max_tokens: 50,
  messages: [{ role: "user", content: "ping" }],
});
console.log(r.content);
```

### Done when
`pnpm install` resolves all workspaces, CI is green on a sample PR, every EU account exists, and the Bedrock ping returns a response.

---

## Phase 1 — Core Data & Auth

### What you're building
The data model in EU Postgres, a typesafe API layer (tRPC), the Next.js web shell, and Clerk authentication. After this phase a real person can sign up, log in, and edit a profile.

### Why it matters
Everything downstream reads/writes these tables. Getting the schema and the access boundary right now (users only touch their own rows) prevents security debt later.

### Steps

**1.1 / 1.2 — Database package + schema**
```bash
cd packages/db && pnpm init
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```
`packages/db/src/schema.ts`:
```ts
import { pgTable, uuid, text, timestamp, jsonb, vector, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fullName: text("full_name"),
  voice: jsonb("voice"),            // tone/preferences for AI generation
  visaStatus: text("visa_status"),  // for Werkstudent/visa filtering
  embedding: vector("embedding", { dimensions: 1024 }), // Cohere embed-multilingual-v3 = 1024 (NOT 1536)
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  externalId: text("external_id"),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  raw: jsonb("raw"),
  embedding: vector("embedding", { dimensions: 1024 }), // Cohere embed-multilingual-v3 = 1024 (NOT 1536)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  status: text("status").notNull().default("draft"), // draft | approved | submitted | failed
  cv: text("cv"),
  coverLetter: text("cover_letter"),
  approvedAt: timestamp("approved_at"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  action: text("action").notNull(),       // e.g. "application.submitted"
  detail: jsonb("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}); // append-only — never UPDATE/DELETE rows here
```
`drizzle.config.ts` points at `DATABASE_URL` (Neon EU). Then:
```bash
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"  # 1.3
pnpm drizzle-kit push
```

**1.3 — pgvector indexes** (after data exists, or now with empty tables)
```sql
CREATE INDEX ON jobs USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON profiles USING hnsw (embedding vector_cosine_ops);
```

**1.4 — Neon branching for PR previews**
Add a CI step that creates a Neon branch per PR and runs migrations against it, so previews never touch prod data. Use the Neon GitHub integration or `neonctl branches create`.

**1.5 — tRPC API package**
```bash
cd packages/api && pnpm init
pnpm add @trpc/server zod superjson @agora/db
```
```ts
// packages/api/src/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";

// opts.headers needed so context works in both RSC callers and fetch-adapter route handler (tRPC v11)
export const createTRPCContext = async (opts: { headers: Headers }) => ({
  userId: undefined as string | undefined,
  headers: opts.headers,
});

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create();

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { userId: ctx.userId } });
});
```

**1.6 — Web shell**
```bash
cd apps && pnpm dlx create-next-app@latest web --ts --app --tailwind --src-dir --import-alias "@/*"
pnpm dlx shadcn@latest init
```
Add `vercel.json` → `{ "regions": ["fra1"] }`.

**1.7 — Clerk auth (EU)**
Install `@clerk/nextjs`, wrap the app in `<ClerkProvider>`, add `middleware.ts` to protect routes, and set the Clerk instance to the **EU data region** in the dashboard. On first login, upsert a `users` row keyed by `clerkId`.

**1.8 / 1.9 — Profile CRUD + access rules**
Build `profile.get` / `profile.update` as `protectedProcedure`s that filter by `ctx.userId`. Write a test that user A cannot read user B's profile. If using Supabase instead of Neon, enable RLS policies for the same guarantee.

### Done when
A user registers via Clerk, a `users` row is created, and they can read/update only their own profile — proven by a cross-user denial test.

---

## Phase 2 — Job Ingestion & Search

### What you're building
A background worker that scrapes a job source, uses Claude Haiku to normalize listings, stores them with embeddings, and exposes filtered search in the web UI.

### Why it matters
Jobs are the raw material. This is your first real use of the queue + worker + LLM pipeline that auto-apply will later reuse.

### Steps

**2.1 / 2.2 — Worker + queue**
```bash
cd apps/workers && pnpm init
pnpm add bullmq ioredis playwright @agora/ai @agora/db
```
```ts
// apps/workers/src/index.ts
import { Worker, Queue } from "bullmq";
const connection = { url: process.env.REDIS_URL! }; // Upstash EU
export const ingestQueue = new Queue("ingest", { connection });

new Worker("ingest", async (job) => {
  const listings = await scrapeSource(job.data.source);
  for (const raw of listings) await normalizeAndStore(raw);
}, { connection });
```
Deploy this as a **long-running container** on Railway/Render (EU). Confirm it stays up and connects to Redis. **Do not** run it as a serverless function — scraping exceeds time limits.

**2.3 — First scraper**
Start with **one source**, preferring an official API (e.g. Indeed API) over HTML scraping. For JS-heavy boards use Playwright via a managed browser (Browserbase/Apify) so you don't run a fragile browser farm:
```ts
async function scrapeSource(source: string) {
  // official API path preferred; Playwright fallback for JS-rendered boards
  // return array of raw listing objects
}
```
Respect robots/ToS and rate-limit.

**2.4 — LLM normalization (Haiku)**
```ts
import { claude, MODELS } from "@agora/ai";
async function normalizeAndStore(raw: unknown) {
  const res = await claude.messages.create({
    model: MODELS.volume, // Haiku — cheap, high volume
    max_tokens: 1024,
    messages: [{ role: "user", content: `Extract JSON {title,company,location,...} from:\n${JSON.stringify(raw)}` }],
  });
  const parsed = JSON.parse(extractJson(res));
  // dedupe on (source, externalId) then insert into jobs
}
```

**2.5 — Embeddings → pgvector**
Generate an embedding per job and store it in `jobs.embedding` on insert, enabling semantic matching in Phase 3.

**2.6 / 2.7 — Search + UI**
Expose `jobs.search` (tRPC) using Postgres full-text search plus structured filters (visa, Werkstudent, wage thresholds). Build list + detail pages in `apps/web`.

**2.8 — Scheduling + dedupe**
Use **Inngest** (or a cron) to enqueue ingestion daily. Dedupe on `(source, externalId)` so re-runs don't create duplicates.

### Done when
Jobs ingest automatically on a schedule and are browsable + filterable in the web app, with no duplicates.

---

## Phase 3 — AI Generation (human-in-the-loop)

### What you're building
The heart of the product: match a user to jobs, generate a tailored CV + cover letter with Claude Opus, and **force a human review/approval step** before anything is final. Plus the PII redaction guard and quality evals.

### Why it matters
This is where Agora creates value — and where the biggest risk lives. German embassies and employers actively detect generic AI output. The design must **augment and personalize**, never mass-produce, and never leak passport/visa data to the model.

### Steps

**3.1 — AI package + model routing**
```bash
cd packages/ai && pnpm init
pnpm add @anthropic-ai/bedrock-sdk ai
```
```ts
// packages/ai/src/client.ts
import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
export const claude = new AnthropicBedrock({ awsRegion: "eu-central-1" });
export const MODELS = {
  quality: "anthropic.claude-opus-4-8-v1:0",   // final CV/cover letters
  volume:  "anthropic.claude-haiku-4-5-v1:0",  // parsing/classification
} as const;
```

**3.2 — PII redaction (must land before any user-data LLM call)**
```ts
// packages/ai/src/redact.ts
export function redactPII(text: string): string {
  return text
    .replace(/\b[A-Z0-9]{8,9}\b/g, "[REDACTED_ID]")
    .replace(/\b\d{2}[ ]?\d{6}[ ]?[A-Z]\b/g, "[REDACTED]");
}
```
Unit-test it with real-shaped passport/visa samples. Call it on every context string before it reaches `claude.messages.create`.

**3.3 — Matching**
Combine pgvector cosine similarity (profile embedding ⨯ job embeddings) with hard rule filters (visa eligibility, Werkstudent, minimum wage). Return a ranked list per user.

**3.4 — User-voice capture**
Store tone/preferences on `profiles.voice` and inject them into generation prompts so output sounds like the user, not a template.

**3.5 / 3.6 — Generation flows**
```ts
new Worker("generate", async (job) => {
  const { applicationId, jobDesc, profile } = job.data;
  const context = redactPII(buildContext(profile, jobDesc));   // RULE 1
  const res = await claude.messages.create({
    model: MODELS.quality, max_tokens: 2048,
    messages: [{ role: "user", content: coverLetterPrompt(context, profile.voice) }],
  });
  // store as applications.coverLetter with status = "draft"
}, { connection });
```
Add an equivalent CV-tailoring flow.

**3.7 — Review & approval UI (the gate)**
Build an editor where the user reads, edits, and explicitly approves the draft. Approving sets `status = "approved"` and `approvedAt`. **No path may set `submitted` directly from generation.**

**3.8 — Per-application variation**
Vary structure/emphasis per job (and per user voice) so outputs aren't detectably boilerplate. Avoid reusing identical paragraphs across applications.

**3.9 — Evals**
```bash
pnpm add -D -w promptfoo
```
Add a `promptfoo` suite asserting tone, relevance, and absence of leaked PII; run it in CI so prompt/model changes can't silently regress quality.

### Done when
A user sees matched jobs, generates tailored materials, and must review + approve them. Redaction is tested and unavoidable; evals gate prompt changes.

---

## Phase 4 — Auto-Apply Engine

### What you're building
A worker that submits **approved** applications to job portals via Playwright, records every submission in an append-only audit log, retries safely, and respects per-source rate limits.

### Why it matters
Automation is the payoff — and the liability. The approval guard and audit log are what make automated submission defensible.

### Steps

**4.1 — Apply worker (one portal first)**
```ts
new Worker("apply", async (job) => {
  const app = await getApplication(job.data.applicationId);
  if (app.status !== "approved") throw new Error("not approved"); // RULE 2 — 4.2
  const browser = await getManagedBrowser();                       // Browserbase EU
  // Playwright: open portal, fill form from app.cv/coverLetter + profile, submit
  await recordAudit(app.userId, "application.submitted", { applicationId: app.id }); // 4.3
  // set status = "submitted", submittedAt = now
}, { connection });
```

**4.2 — Approval guard**
Enforce `status === "approved"` at the start of the worker **and** as a DB constraint/check if possible. Test that an unapproved application cannot be submitted.

**4.3 — Append-only audit log**
Write one immutable row per submission (who, what job, when, confirmation). Never update/delete. This is your accountability record for GDPR and disputes.

**4.4 — Confirmation + notification**
Capture the portal's confirmation (number/screenshot), update status, and notify the user (email now, push in Phase 5).

**4.5 — Retries + dead-letter**
Configure BullMQ retries with backoff; route exhausted jobs to a dead-letter queue surfaced in an admin view.

**4.6 / 4.7 — More portals + safety throttles**
Add 2–3 portal adapters behind a common interface. Throttle submissions per source to protect user accounts from bans.

### Done when
Approved applications auto-submit to multiple portals, every submission is logged immutably, failures retry cleanly, and rate limits hold.

---

## Phase 5 — Mobile App

### What you're building
Native iOS/Android with Expo, reusing the shared `packages/api`, `packages/core`, and `packages/ui` so you don't rebuild business logic.

### Why it matters
Mobile is where job seekers actually live. Reuse keeps it cheap; native unlocks camera (document capture) and push.

### Steps

**5.1 — Shell**
```bash
cd apps && pnpm dlx create-expo-app@latest mobile
cd mobile && pnpm add nativewind && pnpm add -D tailwindcss
```
Use Expo Router (file-based, mirrors Next.js).

**5.2 — Auth**
Add `@clerk/clerk-expo`; reuse the same Clerk EU instance.

**5.3 — Shared API**
Wire a tRPC client pointed at your API; import `@agora/core` for shared types/logic so mobile and web stay in lockstep.

**5.4 — Core screens**
Jobs, matches, and the application review/approve flow — parity with the web gate from 3.7.

**5.5 — Push notifications**
Expo Notifications for new matches and application status updates.

**5.6 — Document capture**
Camera → upload CV/passport to Scaleway EU. Encrypt sensitive docs (ties to 7.5). Never send raw documents to the LLM without redaction.

**5.7 — EAS pipeline**
```bash
pnpm dlx eas-cli build:configure
```
Set up EAS Build/Submit and OTA Update so you can ship fixes without store review.

### Done when
Users browse, review, and approve applications natively, with push and secure document upload.

---

## Phase 6 — Browser Extension

### What you're building
A WXT (Manifest V3) extension to capture jobs from LinkedIn/Indeed/StepStone, autofill forms, and trigger the generate→review flow — reusing `packages/ui` and the tRPC client.

### Why it matters
Meets users where they already browse jobs, and is a strong acquisition wedge.

### Steps

**6.1 — Shell**
```bash
cd apps && pnpm dlx wxt@latest init extension
cd extension && pnpm add react react-dom
```

**6.2 — Auth bridge**
Share the logged-in session with the extension (token via the web app's origin); the extension must know who the user is.

**6.3 — Job capture**
Content scripts that read the current listing on supported boards and POST it into Agora (reusing the Phase 2 normalize path).

**6.4 — Autofill**
Populate portal application fields from the user's profile.

**6.5 — One-click generate + review**
A button that enqueues generation and opens the review gate — never a one-click *submit*.

### Done when
Users capture jobs and launch the review flow directly from job boards across Chrome/Edge/Firefox.

---

## Phase 7 — Compliance & Security Hardening

### What you're building
The GDPR backbone: data-flow map, signed DPAs, right-to-erasure and export, encryption for sensitive docs, consent UX, AI disclosure, and a security review.

### Why it matters
You handle CVs, passports, and visa data for EU residents. Compliance is a feature and a legal requirement — and parts of it must exist **before** real user data arrives, not at the end.

### Steps (start in Phase 1, finish before public launch)

**7.1 — Data-flow map + RoPA:** document every place PII lives and flows (built up since Phase 0.5).
**7.2 — DPAs:** sign Data Processing Agreements with AWS, Vercel, Neon, Clerk, Scaleway, Stripe, PostHog, Sentry; publish a sub-processor list.
**7.3 — Right-to-erasure:** one action that cascades deletes across Postgres (`onDelete: cascade`), object storage, queues, logs, and analytics. Test that nothing PII survives.
**7.4 — Data export:** let users download their data (portability).
**7.5 — Encryption:** envelope-encrypt passports/sensitive docs with KMS; keys rotated.
**7.6 — Consent UX:** explicit, logged consent for AI processing and automated applications.
**7.7 — Security review:** pen-test auth and the auto-apply path; triage and fix.
**7.8 — AI disclosure:** be honest in-product and in outputs that AI assisted — directly mitigates the embassy/employer detection risk.

### Done when
Erasure and export work end-to-end, DPAs are signed, sensitive data is encrypted, and consent is captured and logged.

---

## Phase 8 — Observability, Billing & Launch

### What you're building
The production layer: error tracking, product analytics, logging/alerts, cost dashboards, Stripe billing with plan gating, transactional email, load testing, and a runbook.

### Why it matters
You can't safely launch what you can't see, bill, or page on. LLM/scraping cost visibility is essential because those are your dominant variable costs.

### Steps

**8.1 — Sentry** across web, mobile, workers (EU data region).
**8.2 — PostHog EU** for funnels, retention, and feature flags.
**8.3 — Logging/uptime** with Axiom or Better Stack; set alerts.
**8.4 — Cost dashboards:** track LLM token spend and scraping browser-minutes per day with budget alerts (see Cost Estimate doc for the levers — Haiku routing, prompt caching, dedupe).
**8.5 / 8.6 — Stripe billing + plan gating:** subscription tiers; enforce free vs paid limits.
**8.7 — Transactional email:** Resend + React Email for lifecycle messages.
**8.8 — Load/soak test** the automation pipeline at target concurrency.
**8.9 — Runbook + on-call:** document incident response and alert routing.

### Done when
The system is monitored, billable, cost-observable, and alerting — ready for public launch.

---

## Cross-Cutting Tracks (run continuously, not as a phase)

- **Testing:** add Vitest (unit), Playwright (web E2E), Maestro (mobile E2E), and Promptfoo (LLM evals) **with each feature**, never after.
- **Security & compliance:** Phase 7 tasks begin in Phase 1 — erasure, consent, and the data map should exist before real user data does.
- **Cost control:** model routing, prompt caching, and generation dedupe go in during Phase 3 and are monitored from Phase 8.
- **Design system:** grow `packages/ui` as shared components emerge; keep web/extension/mobile visually consistent.

---

## Milestones

| Milestone | Phases | Outcome |
|---|---|---|
| **M1 — Internal alpha** | 0–3 | Sign in, browse jobs, generate + review materials (web) |
| **M2 — Auto-apply beta** | 4 + Phase 7 core | Approved applications auto-submit with audit + erasure |
| **M3 — Multi-surface** | 5, 6 | Mobile + extension live |
| **M4 — Public launch** | 7 full, 8 | Compliant, monitored, monetized |

---

## Critical-Path Reminders

1. **Spine:** 0 → 1 → 2 → 3 → 4. Mobile (5) and extension (6) parallelize after Phase 3.
2. **Never** build auto-apply (4) before the approval gate (3.7) and audit log exist.
3. **PII redaction (3.2)** ships before the first real LLM call on user data.
4. **Phase 7 is not a finale** — erasure, consent, and the data map land before real users.
