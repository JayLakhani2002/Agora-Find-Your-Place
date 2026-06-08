# Architecture Requirements Document (ARD)
**Project:** Agora Jobs · **Document:** ARD-001 · **Version:** 1.0  
**Status:** Draft · **Date:** 2026-06-08 · **Owner:** Engineering / Founding Team  
**Source documents:** `../Buisness Planning/technical tech stack/Agora-Jobs-Tech-Stack.md` · `../Buisness Planning/technical tech stack/Agora-Jobs-Architecture.md`

---

## Table of Contents
1. [Architecture Goals & Principles](#1-architecture-goals--principles)
2. [Architecture Constraints](#2-architecture-constraints)
3. [System Context Diagram](#3-system-context-diagram)
4. [Key Data Flows](#4-key-data-flows)
5. [Layer-by-Layer Architecture Requirements](#5-layer-by-layer-architecture-requirements)
6. [Trust & Data Residency Boundaries](#6-trust--data-residency-boundaries)
7. [Environments](#7-environments)
8. [Architecture Risk Register](#8-architecture-risk-register)
9. [Open Architecture Questions](#9-open-architecture-questions)
10. [Traceability Appendix](#10-traceability-appendix)

---

## 1. Architecture Goals & Principles

| ID | Principle | Rationale |
|----|-----------|-----------|
| AP-01 | **TypeScript end-to-end** | One language across web, mobile, extension, backend, and workers. Shared types, validation, and business logic prevent schema drift and reduce context-switching. |
| AP-02 | **EU data residency first** | All PII (CVs, passports, visa data) stays within EU regions. Every infrastructure provider must support EU hosting and be willing to sign a DPA. |
| AP-03 | **AI/LLM pipeline as first-class infrastructure** | Claude via AWS Bedrock, BullMQ job queue, and Playwright automation are the product's beating heart — not afterthoughts. Design the architecture around them, not around a traditional CRUD app. |
| AP-04 | **Managed/serverless by default** | Optimize for iteration speed and low ops overhead. Prefer managed databases, queues, and compute with EU regions. Only self-host when a managed option is unavailable in EU at acceptable cost. |
| AP-05 | **Multi-surface, single core** | Web, mobile, and browser extension are all clients to the same tRPC API. The design system and shared packages are never duplicated per surface. |
| AP-06 | **Per-country config schema from day one** | Germany is V1, but the schema is designed so EU country expansion (Netherlands, France, Spain) is a configuration change, not a code rewrite. |
| AP-07 | **Augment and personalize, never mass-produce** | The architecture must enforce: (1) PII redaction before every LLM call, (2) human approval before any submission, (3) per-application variation. These are structural, not optional. |

---

## 2. Architecture Constraints

| ID | Constraint | Implication |
|----|-----------|-------------|
| AC-01 | All inference and data must remain within EU regions | AWS Bedrock must be configured to `eu-central-1` (Frankfurt). No Anthropic direct API in V1 unless EU DPA is confirmed. |
| AC-02 | Worker tasks (job-listing scraping, AI generation) exceed serverless execution limits | Workers MUST run as long-lived containers on Railway/Render/Fly (EU), never as serverless functions. (Note: no worker submits applications — AR-09.) |
| AC-03 | PII redaction is a non-negotiable pre-condition for any LLM call on user data | PII redaction function must be called on all context strings before they reach `claude.messages.create`. Architecturally enforced, not policy-only. |
| AC-04 | Human approval gate is non-negotiable for any application submission | No code path may set `status = submitted` without a prior `status = approved` set by a user action. Enforced at worker level and as a DB constraint. |
| AC-05 | Audit log is append-only | The `audit_log` table MUST be append-only. No `UPDATE` or `DELETE` operations are permitted on this table. |
| AC-06 | EU company expansion requires no code changes | Country-specific configuration (visa rules, ATS vendors, CV formats, job sources, language model config) lives in a config schema, not in application code. |
| AC-07 | EU data residency is a paid-tier feature for some vendors | Clerk EU data residency is available only on the **Business** plan (≈ $100+/mo + per-MAU), not Free/Pro. The Stage-1 cost model MUST budget Clerk Business, OR the project MUST self-host Auth.js against EU Postgres (the documented fallback). This is an open decision — see Architecture Review F-H2. Do NOT assume EU residency on Clerk Free/Pro. |

---

## 3. System Context Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENTS                                      │
│                                                                               │
│   ┌────────────┐      ┌──────────────────┐      ┌─────────────────────────┐  │
│   │  Web App   │      │   Mobile App     │      │   Browser Extension     │  │
│   │ Next.js 15 │      │  Expo / RN       │      │   WXT + React (MV3)     │  │
│   │ (PWA)      │      │  (iOS/Android)   │      │   (Chrome/Edge/Firefox) │  │
│   └─────┬──────┘      └────────┬─────────┘      └───────────┬─────────────┘  │
│         │   shared packages/ui · packages/api (tRPC) · packages/core          │
└─────────┼────────────────────┼──────────────────────────────┼────────────────┘
          │                    │                              │
          └──────────┬─────────┴──────────────┬───────────────┘
                     │ HTTPS (tRPC + REST)     │
                     ▼                         ▼
        ┌────────────────────────────────────────────────────────┐
        │                  API LAYER  (EU · fra1)                 │
        │   Next.js Route Handlers · tRPC routers · Hono REST     │
        │   Auth (Clerk EU) · Zod validation · Rate limit         │
        └───────┬───────────────────────────────────┬────────────┘
                │ reads/writes                       │ enqueue
                ▼                                    ▼
   ┌────────────────────────┐            ┌──────────────────────────┐
   │  PERSISTENCE (EU)      │            │   JOB QUEUE (EU)         │
   │  • Postgres (Neon EU)  │            │   BullMQ on Upstash EU   │
   │    + pgvector          │◄───────────┤   / Inngest workflows    │
   │  • Object storage      │  results   └───────────┬──────────────┘
   │    (Scaleway/S3 EU)    │                        │ dispatch
   │  • Redis (Upstash EU)  │                        ▼
   └────────────────────────┘          ┌──────────────────────────────┐
                                       │   WORKERS (EU containers)    │
                                       │   Railway / Render / Fly     │
                                       │                              │
                                       │  ┌────────────────────────┐  │
                                       │  │ Scraper (Playwright +  │  │
                                       │  │ Browserbase/Apify)     │  │
                                       │  │ INGESTION ONLY         │  │
                                       │  ├────────────────────────┤  │
                                       │  │ AI generation          │  │
                                       │  │ (packages/ai)          │  │
                                       │  ├────────────────────────┤  │
                                       │  │ Submission tracking +  │  │
                                       │  │ Mode-2 orchestration   │  │
                                       │  │ (NO server-side submit)│  │
                                       │  └───────────┬────────────┘  │
                                       └──────────────┼───────────────┘
                                                      │ inference (PII-redacted)
                                                      ▼
                                       ┌──────────────────────────────┐
                                       │  LLM — Claude via AWS Bedrock │
                                       │  EU region (eu-central-1)     │
                                       │  Sonnet 4.x (generation) ·    │
                                       │  Haiku 4.5 (eval/volume) ·    │
                                       │  Opus 4.8 (offline bench only)│
                                       │  Cohere embed-ml-v3 (vectors) │
                                       └──────────────────────────────┘

Final application SUBMISSION is performed CLIENT-SIDE by the user
(Mode 1: manual download + submit · Mode 2: browser-extension autofill,
user clicks the company's own Submit). No server worker ever submits.

Cross-cutting (all EU): Sentry · PostHog EU · Axiom · Langfuse EU · Doppler · Stripe · Resend
```

---

## 4. Key Data Flows

### AR-DF-01 — Job Ingestion (Scheduled)

```
Cron/Inngest → enqueue scrape jobs → Worker (Playwright/Browserbase EU)
   → raw listings → Claude Haiku (structured extraction + normalization)
   → normalize → Postgres jobs table + embeddings → pgvector index
```

**Requirements:**
- AR-01: Scraping MUST respect robots.txt and rate-limit to ≤1 request/5 seconds per domain
- AR-02: Job deduplication MUST occur on `(source, externalId)` before insertion
- AR-03: Embeddings MUST be generated on insert and stored in `pgvector` for matching

### AR-DF-02 — Candidate ↔ Job Matching

```
User profile + embedding (pgvector)  ⨯  job embeddings
   → cosine similarity + SQL hard filters (visa/hours/German level/contract)
   → BM25 keyword re-rank
   → LLM reranker (Claude Haiku)
   → ranked deck → user API response
```

**Requirements:**
- AR-04: Matching pipeline MUST complete in < 3 seconds end-to-end
- AR-05: SQL hard filters MUST execute before any vector computation (legal constraints are absolute)

### AR-DF-03 — AI Application Generation (Human-in-the-Loop)

```
User selects job → enqueue generate job
   → Worker assembles context (profile, JD, user voice, role-specific answers)
   → PII REDACTION layer (strip passport/visa numbers, ID patterns)
   → Claude Sonnet 4.x → draft CV + cover letter + pre-fills
   → Quality eval (Claude Haiku — 6 dimensions)
   → If score < 8.0 → auto-regenerate once
   → store draft → USER REVIEWS & EDITS → approves (sets status = "approved")
```

**Requirements:**
- AR-06: PII redaction MUST execute on ALL context strings before the Bedrock API call
- AR-07: The generation flow MUST NOT set `status = submitted` — only `status = draft` or `status = approved`
- AR-08: Quality eval MUST run after generation and before the user sees any artifact

### AR-DF-04 — Assisted Submission (Client-Side) & Submission Tracking

> **Critical design constraint (legal).** Mode 3 — a server-side bot that submits applications on the user's behalf — is permanently out of scope (BRD BR-REV-01). The platform NEVER submits an application from a server worker. Submission is always an explicit, client-side user action. This flow describes how the approved package reaches the user's own browser and how the submission is recorded — it does NOT describe a server-side form-submitter.

```
Approved application (status = "approved")
   → Mode 1 (Smart Review, free):
        API serves the approved PDFs + opens the company portal in the
        USER'S browser → user downloads and submits manually
   → Mode 2 (Magic Pre-fill, paid, V1.5):
        Browser EXTENSION running in the USER'S OWN browser session
        autofills the company form → USER reviews → USER clicks the
        company's own Submit button
   → Client reports completion → API writes AUDIT LOG row (append-only)
   → set status = "submitted", submittedAt = now
   → user may attach portal confirmation
```

**Requirements:**
- AR-09: No server-side worker or code path may submit an application to a third-party portal. Server-side Playwright is restricted to job INGESTION (AR-DF-01) only. (Replaces the prior server-side "apply worker".)
- AR-10: An append-only audit log row MUST be written for every state transition to `approved` and `submitted`, including timestamp, userId, applicationId, mode (1 or 2), and portal. The `submitted` transition is initiated by an authenticated client action, not by a backend job.
- AR-11: The audit log table is append-only — no update or delete operations permitted.
- AR-11a: The Mode-2 extension MUST NOT contain any auto-submit capability. It autofills fields only; the final Submit click is always the user's. This is enforced in the extension code and verified in review.

---

## 5. Layer-by-Layer Architecture Requirements

### 5.1 Monorepo & Language

| ID | Requirement |
|----|-------------|
| AR-12 | The codebase SHALL use TypeScript across all apps and packages |
| AR-13 | The monorepo SHALL use Turborepo + pnpm workspaces |
| AR-14 | Shared business logic, types, and validation schemas SHALL live in packages (`packages/core`, `packages/api`, `packages/db`, `packages/ai`) and be imported by all surfaces |
| AR-15 | Runtime validation SHALL use Zod with shared schemas between client and server |

### 5.2 Frontend Layer

| ID | Requirement |
|----|-------------|
| AR-16 | The web application SHALL be built with Next.js 15 (App Router) and deployed on Vercel with function regions pinned to Frankfurt (`fra1`) |
| AR-17 | The mobile application SHALL be built with Expo (React Native) using Expo Router |
| AR-18 | The browser extension SHALL be built with WXT (Manifest V3) supporting Chrome, Edge, and Firefox |
| AR-19 | All surfaces SHALL share the same `packages/ui` design system (Tailwind CSS + shadcn/ui for web, NativeWind for mobile) |

### 5.3 API Layer

| ID | Requirement |
|----|-------------|
| AR-20 | Internal API communication between all clients and the server SHALL use tRPC (type-safe RPC, no code generation, no schema drift) |
| AR-21 | A stable REST surface via Next.js Route Handlers or Hono SHALL be exposed for partner/third-party integrations |
| AR-22 | All API routes serving authenticated users SHALL enforce user-scoped access — users may only read/write their own data |

### 5.4 Authentication

| ID | Requirement |
|----|-------------|
| AR-23 | Authentication SHALL be provided by Clerk with the EU data region configured |
| AR-24 | Auth tokens SHALL use httpOnly cookies (never localStorage or sessionStorage) |
| AR-25 | All protected tRPC procedures SHALL verify the authenticated user context before any database operation |

### 5.5 Data Layer

| ID | Requirement |
|----|-------------|
| AR-26 | The primary database SHALL be PostgreSQL hosted on Neon in the EU (Frankfurt) region |
| AR-27 | The ORM SHALL be Drizzle ORM with type-safe schema definitions and migration management |
| AR-28 | Vector similarity search SHALL use pgvector in the same Postgres instance (no separate vector database in V1) |
| AR-29 | pgvector indexes SHALL use HNSW for `vector_cosine_ops` on both `jobs.embedding` and `profiles.embedding` |
| AR-30 | Object storage for CVs and generated PDFs SHALL use Scaleway Object Storage or AWS S3 `eu-central-1`; files SHALL be served via signed URLs only |
| AR-31 | Cache, rate limiting, and session data SHALL use Upstash Redis in the EU region |
| AR-32 | Every PR preview deployment SHALL use a Neon database branch (isolated from production data) |

### 5.6 AI / LLM Pipeline

| ID | Requirement |
|----|-------------|
| AR-33 | All LLM and embedding inference SHALL use AWS Bedrock in `eu-central-1` to satisfy EU data residency. Model availability in `eu-central-1` MUST be verified at build time (OAQ-01). |
| AR-34 | **Claude Sonnet 4.x SHALL be the default model for per-application generation (CV, cover letter, pre-fills).** Opus 4.8 is NOT used in the hot path — it is too costly/slow to meet NFR cost (< €0.10/app) and latency (< 60s) targets. Opus is reserved for offline quality benchmarking only. *(Rationale: see Architecture Review F-H1. The generation model is a cost-load-bearing decision.)* |
| AR-35 | Claude Haiku 4.5 SHALL be used for high-volume, cost-sensitive tasks (job normalization, classification, quality-eval judging, LLM reranking) |
| AR-35a | Text embeddings (for `jobs.embedding` and `profiles.embedding`) SHALL be generated by an EU-resident bilingual (DE/EN) model. Default: **Cohere Embed Multilingual v3 via AWS Bedrock `eu-central-1` (1024 dimensions)**. The vector column dimension MUST match the chosen model (1024 for Cohere v3 — NOT 1536). |
| AR-36 | The AI package (`packages/ai`) SHALL wrap the Bedrock SDK and expose model routing (generation / volume / embedding) to all workers |
| AR-36a | **Data minimization is the primary PII control; redaction is secondary.** Passport/visa/ID numbers SHALL NOT be stored as free text and SHALL NOT be included in the profile projection used to assemble generation context. The eligibility engine consumes derived values (visa class, days-remaining count, hours cap) — never raw identifiers. Regex redaction (AR-06) is a defense-in-depth second layer, not the primary safeguard. *(See Architecture Review F-H4.)* |
| AR-37 | Prompt caching SHALL be enabled for user profile context to reduce per-generation token cost |
| AR-38 | All prompt changes SHALL be gated by Promptfoo regression tests in CI. Note the two distinct eval layers: (a) the **runtime quality gate** — Haiku judge scoring 6 dimensions per generated application; (b) **CI regression evals** — Promptfoo, gating prompt/model changes. They are separate systems with separate purposes. |
| AR-39 | LLM and embedding call costs SHALL be tracked per user and per call in Langfuse (EU-hosted or self-hosted in EU; prompt/output payloads may contain redacted CV content and therefore must remain in the EU boundary). |

### 5.7 Worker Infrastructure

| ID | Requirement |
|----|-------------|
| AR-40 | Workers (job-listing scraping/ingestion, AI generation, submission-tracking) SHALL run as long-lived containers in EU regions on Railway, Render, or Fly.io. No worker performs third-party application submission (AR-09). |
| AR-41 | Workers SHALL NOT be implemented as serverless functions — scraping and generation tasks exceed serverless time limits |
| AR-42 | The job queue SHALL use BullMQ backed by Upstash Redis EU |
| AR-43 | All queued jobs SHALL have retry logic with exponential backoff; exhausted jobs SHALL route to a dead-letter queue |
| AR-43a | All queued jobs SHALL be idempotent — keyed so that a retried or duplicated job (BullMQ at-least-once delivery) cannot produce duplicate side effects (duplicate generations, duplicate audit rows, duplicate notifications). Generation results SHALL be deduplicated/cached on `(applicationId, profileVersion, jobVersion)`. *(See Architecture Review F-M1.)* |
| AR-44 | Managed browser infrastructure (Browserbase or Apify EU) SHALL be used for Playwright **ingestion** sessions — no self-managed browser farm. Managed-browser sub-processors that handle job data are in the EU DPA register (§6). |

### 5.8 Observability

| ID | Requirement |
|----|-------------|
| AR-45 | Error tracking SHALL use Sentry with EU data region configured across web, mobile, and workers |
| AR-46 | Product analytics SHALL use PostHog EU Cloud (or self-hosted EU) |
| AR-47 | Structured logs and uptime monitoring SHALL use Axiom or Better Stack (EU) |
| AR-48 | LLM tracing (per-call cost, latency, quality scores) SHALL use Langfuse |
| AR-49 | A cost dashboard tracking daily LLM token spend and scraping browser-minutes SHALL be operational before public launch |

### 5.9 Security & Compliance

| ID | Requirement |
|----|-------------|
| AR-50 | All user-facing IDs SHALL use UUIDs (no sequential integers) to prevent enumeration attacks |
| AR-51 | Postgres row-level security SHALL scope every query to the authenticated user at the database level |
| AR-52 | File uploads SHALL be restricted to PDF and DOCX only; maximum 5MB; parsed server-side in a sandboxed subprocess; never served from the app domain |
| AR-53 | All external content injected into LLM prompts (job descriptions) SHALL be wrapped in XML tags with explicit `<untrusted-content>` system instructions |
| AR-54 | Per-user LLM regeneration rate limit SHALL be enforced: maximum 5 regenerations/hour |
| AR-55 | A GDPR right-to-erasure flow SHALL cascade deletes across Postgres, Scaleway/S3, pgvector, Redis, and Sentry events on account deletion |
| AR-56 | Sensitive documents (passports) SHALL be envelope-encrypted at rest using KMS |
| AR-57 | Data Processing Agreements (DPAs) SHALL be signed with **every** sub-processor in the §6 register (AWS, Vercel, Neon, Clerk, Scaleway, Upstash, Stripe, PostHog, Sentry, Langfuse, Resend, Browserbase/Apify, Doppler) before any real user data is processed |
| AR-58 | Backups and disaster recovery SHALL be configured: Neon point-in-time recovery (PITR) enabled on production; object-storage versioning enabled for CV/document buckets; a documented restore procedure tested at least once before public launch. Erasure (AR-55) MUST also purge backups within the contractual backup-retention window, documented in the RoPA. *(See Architecture Review F-M7.)* |

---

## 6. Trust & Data Residency Boundaries

```
┌─ EU DATA BOUNDARY ──────────────────────────────────────────────────────┐
│  All PII, CVs, documents, embeddings, logs, analytics, and inference    │
│  remain inside EU regions. Every sub-processor operates under DPA.      │
│                                                                          │
│   Neon (EU Frankfurt) · Scaleway (EU) · Upstash (EU) ·                  │
│   Bedrock (eu-central-1) · PostHog (EU) · Sentry (EU) · Clerk (EU)     │
│                                                                          │
│   ▲ PII REDACTION executes BEFORE any data crosses into the LLM.        │
│   ▲ Passport/visa numbers never leave this boundary.                     │
│   ▲ Generated documents are stored in-EU and served via signed URLs.    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Sub-processor Register (to be maintained and published):**

| Sub-processor | Purpose | Region | DPA Status |
|--------------|---------|--------|------------|
| AWS (Bedrock) | LLM + embedding inference | eu-central-1 | Required before launch |
| Vercel | Web hosting | fra1 | Required before launch |
| Neon | Primary database | EU Frankfurt | Required before launch |
| Clerk | Authentication | EU (**Business tier** required for EU data residency — see AC-07) | Required before launch |
| Scaleway / AWS S3 | Object storage | EU | Required before launch |
| Upstash | Redis / Queue | EU | Required before launch |
| Stripe | Payments | EU | Required before launch (activated only at monetization, post-BSS) |
| PostHog | Analytics | EU | Required before launch |
| Sentry | Error tracking | EU | Required before launch |
| **Langfuse** | LLM tracing (stores prompt/output payloads incl. redacted CV content) | EU Cloud or self-hosted EU | Required before launch — **was missing from prior register** |
| **Resend** | Transactional email (processes user email + names) | EU region | Required before launch — **was missing from prior register** |
| **Browserbase / Apify** | Managed browser for job ingestion (processes scraped job data) | EU | Required before launch — **was missing from prior register** |
| Doppler | Secrets management (no end-user PII, but processor relationship) | — | DPA on file |

> **Completeness note (F-H3):** The original register listed 9 processors and omitted Langfuse, Resend, and Browserbase/Apify — all of which process personal data. A GDPR RoPA that omits a processor is a finding in itself; the register above is the corrected, complete set. Re-audit on every new vendor.

---

## 7. Environments

| Environment | Web | Database | Workers | LLM |
|-------------|-----|----------|---------|-----|
| **Local dev** | Next.js dev server | Neon branch or local PG | Local worker process | Bedrock dev key (eu-central-1) |
| **PR preview** | Vercel preview URL | Neon branch per PR | Not running | Bedrock low-quota |
| **Production** | Vercel (fra1) | Neon prod (EU) | Railway/ECS (EU) | Bedrock prod (EU) |

**Neon branching:** Every PR MUST have its own isolated Neon database branch. Preview environments MUST NOT share or access production data.

---

## 8. Architecture Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| RISK-AR-01 | AI-generated applications detected by German employers or embassies | Medium | High | Augment-not-automate design; user voice capture; per-application variation; human review gate; honest AI disclosure |
| RISK-AR-02 | GDPR/data-residency violation with sensitive documents | Low | Critical | EU-only providers; PII redaction before LLM; envelope encryption; DPAs signed; erasure tested before beta |
| RISK-AR-03 | Scraper fragility / job board account bans | Medium | Medium | Prefer official APIs; managed browsers (Browserbase/Apify); rate limit; respect ToS; rotate |
| RISK-AR-04 | Serverless time limits break automation | Low | High | Workers run on long-lived EU containers (Railway/Render); never serverless |
| RISK-AR-05 | LLM quality regression after prompt/model change | Medium | Medium | Promptfoo evals gate all prompt and model changes in CI |
| RISK-AR-06 | Vendor lock-in | Low | Medium | TypeScript + standard protocols (Postgres wire, S3-compatible API, OpenAI/Anthropic-compatible interfaces) keep most components portable |
| RISK-AR-07 | pgvector performance degradation at scale | Low | Medium | HNSW indexes on embedding columns; add dedicated vector DB (Qdrant EU) only if metrics justify it |
| RISK-AR-08 | LLM cost runaway (per-user abuse or prompt inefficiency) | Medium | Medium | Per-user token limits; regeneration rate limit (5/hr); Langfuse spend alerts; Haiku routing for eval tasks |

---

## 9. Open Architecture Questions

| ID | Question | Owner | Due |
|----|---------|-------|-----|
| OAQ-01 | Confirm exact Bedrock model IDs available in `eu-central-1` at build time — **including the Cohere Embed Multilingual v3 embedding model (AR-35a)**. If Cohere v3 is not available in `eu-central-1`, select an alternative EU-resident bilingual embedding model and set the vector dimension accordingly. | Engineering | Phase 0 |
| OAQ-02 | **Decision required (F-H2):** Clerk Business tier (EU residency, ~$100+/mo + per-MAU) vs. self-hosted Auth.js against EU Postgres. Resolve before Phase 1 because it changes both the auth implementation and the Stage-1 cost model. | Founding team | Phase 0 |
| OAQ-03 | Railway vs. Render vs. Fly for worker containers — choose based on EU region support and pricing at time of build | Engineering | Phase 2 |
| OAQ-04 | Inngest vs. Trigger.dev vs. QStash for workflow orchestration — evaluate when Phase 4 (assisted submission / tracking) begins | Engineering | Phase 4 |
| OAQ-05 | Confirm the canonical statutory figure for the non-EU student work-day allowance (product models **140 days / 280 half-days**; the founder roadmap notes 120). Requires immigration-lawyer confirmation — the legal moat depends on this being correct. | Founding team + lawyer | Phase 1 |

---

## 10. Traceability Appendix

| AR ID | PRD / BRD Requirement | Source Document |
|-------|----------------------|-----------------|
| AR-01 to AR-03 | FR-04 (matching pipeline) | `Agora-Jobs-Architecture.md` §2A |
| AR-06, AR-07 | BR-11, FR-16 | `Agora-Jobs-Tech-Stack.md` §8, `Agora-Jobs-Architecture.md` §2C |
| AR-09 to AR-11 | BR-05, FR-22 | `Agora-Jobs-Architecture.md` §2D |
| AR-26 to AR-32 | BR-11 | `Agora-Jobs-Tech-Stack.md` §5 |
| AR-33 to AR-39 | FR-12, FR-17 | `Agora-Jobs-Tech-Stack.md` §6 |
| AR-50 to AR-57 | BR-10, BR-11 | `Agora-Jobs-Tech-Stack.md` §8 |

---

*This document defines the architecture within which Agora Jobs is built. Engineering decisions that deviate from an AR requirement require founding team review and documentation of the rationale.*
