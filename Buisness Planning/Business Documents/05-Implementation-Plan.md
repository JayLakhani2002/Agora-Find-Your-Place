# Project Implementation Plan
**Project:** Agora Jobs · **Document:** IMPL-001 · **Version:** 1.0  
**Status:** Draft · **Date:** 2026-06-08 · **Owner:** Founding Team  
**Source documents:** `../Buisness Planning/technical tech stack/Agora-Jobs-Implementation-Plan.md` · `../Buisness Planning/technical tech stack/IMPLEMENTATION.md`

---

## Table of Contents
1. [Overview & Sequencing Rules](#1-overview--sequencing-rules)
2. [Milestones](#2-milestones)
3. [Phase 0 — Foundation & Project Setup](#3-phase-0--foundation--project-setup)
4. [Phase 1 — Core Data & Auth](#4-phase-1--core-data--auth)
5. [Phase 2 — Job Ingestion & Search](#5-phase-2--job-ingestion--search)
6. [Phase 3 — AI Generation (Human-in-the-Loop)](#6-phase-3--ai-generation-human-in-the-loop)
7. [Phase 4 — Assisted Submission & Tracking](#7-phase-4--assisted-submission--tracking-no-server-side-submitter)
8. [Phase 5 — Mobile App](#8-phase-5--mobile-app)
9. [Phase 6 — Browser Extension](#9-phase-6--browser-extension)
10. [Phase 7 — Compliance & Security Hardening](#10-phase-7--compliance--security-hardening)
11. [Phase 8 — Observability, Billing & Launch](#11-phase-8--observability-billing--launch)
12. [Cross-Cutting Tracks](#12-cross-cutting-tracks)
13. [Risk Register](#13-risk-register)

---

## 1. Overview & Sequencing Rules

### 1.1 Hard Dependency Spine

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4
                                   ↓              ↓
                             Phase 5          Phase 7
                             Phase 6
```

Phase 6 (Extension) is the V1.5 priority because the paid Mode-2 tier depends on it. Native mobile (Phase 5) is deferred to Year 2 — V1 ships as a PWA (see Timeline Anchor §2.1 and Architecture Review F-H5). Both parallelize after Phase 3 stabilizes the API.  
Phase 7 (Compliance) tasks begin in Phase 1 — they are not a finale.

### 1.2 Non-Negotiable Sequencing Rules

| Rule | Consequence of Violation |
|------|-------------------------|
| **No server-side application submitter, ever.** Phase 4 builds *assisted* submission (Mode 1 manual / Mode 2 extension autofill, user clicks Submit) + tracking — NOT a bot that submits. | A server worker submitting applications is Mode 3, which is permanently banned (BRD BR-REV-01): EU legal exposure + account bans (F-C1) |
| The transition to `submitted` MUST only follow an explicit user action from `approved` state | Submitting unreviewed/unapproved content is the project's top legal and trust risk |
| PII redaction (3.2) MUST land before the first real LLM call — and ID numbers must be excluded from generation context by design (data minimization) | GDPR compliance failure; potential data breach |
| Phase 7 erasure and consent tasks begin in Phase 1, not at the end | Having real user data without an erasure mechanism is a GDPR violation |
| Payments do NOT go live before BSS **funding starts** (~Mar 2027) | BSS eligibility requires no economic activity before funding starts |
| All queue jobs MUST be idempotent (deterministic jobIds / dedupe keys) | BullMQ at-least-once delivery causes duplicate generations, audit rows, notifications (F-M1) |

### 1.3 Task Sizing

Tasks are sized at approximately **0.5–2 days each**. This enables independent tracking, assignment, and shipping. Each task has:
- A unique ID
- Dependencies on prior tasks
- A measurable Definition of Done (DoD)

### 1.4 Legend

`[ ]` = not started · `[→]` = in progress · `[✓]` = complete  
**Dep** = depends on task IDs · **DoD** = definition of done

---

## 2. Milestones

"Build month N" counts from the start of engineering. The BSS calendar (funding ~Mar 2027) is the binding business clock — see §2.1.

| Milestone | Phases | Outcome | Target (build month) | Calendar |
|-----------|--------|---------|------------|----------|
| **M1 — Internal Alpha** | 0–3 | Sign in, browse jobs, generate + review materials (web PWA only) | ~Month 2 | ~mid-2026 |
| **M2 — Assisted-Submission Beta** | 4 + Phase 7 core | Approved applications submitted by the user (Mode 1) with append-only audit + working erasure. **No bot submission.** | ~Month 3 | by Aug 2026 (BSS prototype) |
| **M3 — Extension (Mode 2) live** | 6 | Browser extension autofill enables the paid tier | ~Month 5 | aligns to ~BSS month 3 |
| **M4 — Public Launch + Monetization** | 7 (full), 8 | GDPR-compliant, monitored; billing ON (only after BSS funding) | post-BSS-funding | ~Q2 2027 |
| **M5 — BSS Application** | — (business) | Working prototype + team + mentor; application submitted; **no economic activity yet** | — | Oct 2026 |
| **M6 — Native Mobile App** | 5 | Expo iOS/Android | Year 2 | post-BSS |

> **M2 reframed (F-C1):** previously "Auto-Apply Beta — approved applications *auto-submit*". That described a banned Mode-3 capability. The milestone is now the user submitting via Mode 1 with full audit + erasure.

### 2.1 Timeline Anchor (build months ↔ BSS calendar)

The build clock and the funding clock are different. Engineering can run ahead; **monetization cannot precede BSS funding.**

| Calendar | Build/Business event |
|----------|---------------------|
| Now → Aug 2026 | Phases 0–4 build the working prototype (BSS needs this); keep pizza-job income |
| Aug/Sep 2026 | Thesis done → §20 permit |
| Oct 2026 | **BSS application** (no economic activity yet) |
| Jan/Feb 2027 | BSS jury pitch |
| **~Mar 2027** | **BSS funding starts**; register UG |
| ~Mar–Jun 2027 | Phase 8 monetization; extension live; **billing turns on (~BSS month 3)** |
| BSS month 5 | Grow-vs-pivot decision |
| Year 2 | Native mobile app; Hamburg; employer B2B |

---

## 3. Phase 0 — Foundation & Project Setup

**Goal:** Working monorepo, CI, and all EU infrastructure accounts. Nothing user-facing.

| ID | Task | Owner | Dep | Est. | DoD |
|----|------|-------|-----|------|-----|
| 0.1 | Create Turborepo + pnpm monorepo with apps/packages layout | Engineering | — | 0.5d | `pnpm install` resolves; `turbo build` runs |
| 0.2 | Add shared `packages/config` (tsconfig, Biome, Tailwind presets) | Engineering | 0.1 | 0.5d | Lint + typecheck pass repo-wide |
| 0.3 | Set up GitHub repo, branch protection (PRs required, CI must pass), PR template | Engineering | 0.1 | 0.5d | Main branch protected; PR required to merge |
| 0.4 | CI pipeline (GitHub Actions: install → lint → typecheck → test) with Turborepo remote cache | Engineering | 0.2 | 1d | Green CI on a sample PR; cache hit on second run |
| 0.5 | Provision EU accounts: Neon (Frankfurt), Upstash (EU), Scaleway, Vercel, Clerk (EU), AWS (Bedrock eu-central-1) | Engineering | — | 1d | All 6 accounts created; EU regions confirmed |
| 0.6 | Secrets management with Doppler; wire `.env` across dev/staging/prod | Engineering | 0.5 | 0.5d | `doppler run -- pnpm dev` injects secrets; CI uses Doppler |
| 0.7 | Request and verify AWS Bedrock access in `eu-central-1` for: **Claude Sonnet 4.x (generation), Haiku 4.5 (volume/eval), Cohere Embed Multilingual v3 (embeddings)**. Confirm exact model IDs and embedding dimension. | Engineering | 0.5 | 0.5d | Test script returns a response from each model; embedding dim recorded (set vector column to match — 1024 for Cohere v3) |

**Exit criteria:** CI green on sample PR; all EU infra accounts active; Bedrock reachable from `eu-central-1`.

---

## 4. Phase 1 — Core Data & Auth

**Goal:** Users can sign up, log in, and have a profile stored in EU Postgres.

| ID | Task | Owner | Dep | Est. | DoD |
|----|------|-------|-----|------|-----|
| 1.1 | `packages/db`: Drizzle setup + Neon EU pooled connection | Engineering | 0.5 | 0.5d | `drizzle-kit push` succeeds against Neon EU |
| 1.2 | Define full schema: users, profiles, jobs, applications, audit_log (with cascade deletes) | Engineering | 1.1 | 1d | All tables migrated; schema matches TRD §3.1 |
| 1.3 | Enable pgvector; create HNSW indexes on `jobs.embedding` and `profiles.embedding` | Engineering | 1.2 | 0.5d | `vector_cosine_ops` indexes created and confirmed |
| 1.4 | Neon branching in CI — PR previews get isolated DB branch | Engineering | 1.1, 0.4 | 1d | Every preview PR gets its own Neon branch |
| 1.5 | `packages/api`: tRPC server setup with Zod base, `protectedProcedure` middleware | Engineering | 0.2 | 0.5d | Typed `appRouter` builds; protected procedures enforce userId |
| 1.6 | `apps/web`: Next.js 15 App Router shell, Tailwind, shadcn/ui, Vercel `fra1` region | Engineering | 0.2 | 1d | Dev server renders; deployed to Vercel with fra1 pinned |
| 1.7 | Integrate Clerk auth (EU data region); protected routes; user creation on signup | Engineering | 1.6, 0.5 | 1d | Sign up / login / logout works; `users` row created on first login |
| 1.8 | User profile CRUD (tRPC procedures + DB operations) | Engineering | 1.5, 1.7 | 1d | Profile create/read/update persists to EU Postgres |
| 1.9 | Row-level access enforcement: users can only access their own data | Engineering | 1.8 | 0.5d | Cross-user access denied and tested with integration test |
| 7.1* | Data-flow map + RoPA (begin now, complete in Phase 7) | Engineering | 1.2 | 1d | Document every PII data store and its EU region |
| 7.3* | GDPR erasure design (implement delete cascade and test before any real users) | Engineering | 1.2 | 1d | Account deletion wipes all user data in all tables |

*7.1 and 7.3 are Phase 7 compliance tasks that MUST begin in Phase 1, before real user data exists.

**Exit criteria:** User registers via Clerk; profile stored in EU Postgres; cross-user access denied in tests; erasure works end-to-end.

---

## 5. Phase 2 — Job Ingestion & Search

**Goal:** Jobs flow into the system automatically and are searchable and matchable.

| ID | Task | Owner | Dep | Est. | DoD |
|----|------|-------|-----|------|-----|
| 2.1 | `apps/workers`: BullMQ + Upstash EU queue scaffold with `ingest`, `generate`, `apply` queues | Engineering | 0.5, 1.1 | 1d | Test job enqueues and processes successfully |
| 2.2 | Deploy worker container to Railway/Render EU; confirm it connects to Upstash Redis and Neon | Engineering | 2.1 | 1d | Worker runs 24/7; auto-restarts on crash; connects to both services |
| 2.3 | First scraper (prefer official API — Indeed API, Stellenticket API; Playwright fallback for JS boards) | Engineering | 2.1 | 2d | Listings fetched from at least 1 source; raw listings stored |
| 2.4 | Claude Haiku: structured extraction → normalized `jobs` schema | Engineering | 2.3, 0.7 | 1d | Raw listing → clean `jobs` row with all fields populated |
| 2.5 | Job embeddings: generate + store in pgvector on each insert | Engineering | 2.4, 1.3 | 0.5d | Every ingested job has a non-null `embedding` field |
| 2.6 | Job search: Postgres FTS + visa/Werkstudent/wage hard filters | Engineering | 2.4 | 1d | Filtered search returns legally-eligible results per user profile |
| 2.7 | Job list + detail UI (web) | Engineering | 2.6, 1.6 | 1d | Browse and view jobs end-to-end in web app |
| 2.8 | Scheduled ingestion (Inngest/cron) with deduplication on `(source, externalId)` | Engineering | 2.4 | 0.5d | New jobs auto-appear daily; re-runs produce no duplicates |

**Exit criteria:** Jobs ingest daily on a schedule; browsable and filterable in web app; zero duplicate jobs.

---

## 6. Phase 3 — AI Generation (Human-in-the-Loop)

**Goal:** Tailored CV + cover letter + pre-fills, with human review and approval before finalization.

| ID | Task | Owner | Dep | Est. | DoD |
|----|------|-------|-----|------|-----|
| 3.1 | `packages/ai`: Bedrock EU client + model routing (Sonnet generation / Haiku volume / Cohere embedding; Opus offline-only) | Engineering | 0.7 | 0.5d | All models callable from the package wrapper |
| 3.2 | **PII redaction layer** + unit tests covering all required document formats | Engineering | 3.1 | 1d | Passport/visa patterns stripped; all PII test cases pass in CI |
| 3.3 | Candidate ↔ job matching pipeline (pgvector similarity + SQL hard filters + BM25 + LLM reranker) | Engineering | 2.5, 1.8 | 2d | Ranked deck of 20–30 eligible jobs per user in < 3 seconds |
| 3.4 | User-voice capture (tone/preferences stored on `profiles.voice`; injected into generation prompts) | Engineering | 1.8 | 0.5d | Voice field stored and included in all generation context |
| 3.5 | Cover letter generation worker (queue → Sonnet → draft → store as `draft`) | Engineering | 3.1, 3.2 | 1d | Draft cover letter generated from profile + JD; stored in `applications.coverLetter` |
| 3.6 | CV tailoring generation worker (same pipeline as 3.5) | Engineering | 3.5 | 1d | Tailored CV generated in Tabellarischer Lebenslauf format |
| 3.7 | **Review & approval UI** (three-tab interface with explicit approve/reject gate) | Engineering | 3.5, 1.6 | 1.5d | User can review, edit inline, and approve — no path to `submitted` without `approved` first |
| 3.8 | Per-application variation (different structure/emphasis per job + per voice) | Engineering | 3.5 | 0.5d | Two applications to different jobs produce meaningfully different CVs |
| 3.9 | Promptfoo eval suite in CI (tone, relevance, format, PII absence) | Engineering | 3.5 | 1d | Eval suite runs in CI; failing evals block PR merge |
| 3.10 | Quality eval implementation (6-dimension, Haiku judge, auto-regeneration at score < 8.0) | Engineering | 3.5 | 1.5d | Eval runs before user sees output; auto-regenerates once if < 8.0 |

**Exit criteria:** User swipes, generates, reviews artifacts, and must approve. PII redaction tested and unavoidable. Promptfoo gates prompt changes.

---

## 7. Phase 4 — Assisted Submission & Tracking (No Server-Side Submitter)

**Goal:** Get the approved package to the user for a one-click *client-side* submission (Mode 1 now; Mode 2 in Phase 6), record every submission in an append-only audit log, and track status. **No backend worker ever submits to a third-party portal** — that would be the banned Mode 3 (F-C1, BRD BR-REV-01).

| ID | Task | Owner | Dep | Est. | DoD |
|----|------|-------|-----|------|-----|
| 4.1 | Mode 1 (Smart Review): serve approved CV/cover-letter PDFs + open the company portal in the **user's** browser | Engineering | 3.7 | 1d | User downloads PDFs and is taken to the company page to submit manually |
| 4.2 | **State-machine guard**: `applications.markSubmitted` (client-initiated) requires current `status === "approved"` + ownership re-check, server-side | Engineering | 3.7, 1.2 | 0.5d | `submitted` unreachable except from `approved` via an authenticated user action; verified by test |
| 4.3 | **Append-only audit log**: one immutable row per `approved` and per `submitted` transition (userId, applicationId, mode, portal, ts) | Engineering | 1.2 | 0.5d | Every transition has an audit row; no update/delete possible (RLS/convention) |
| 4.4 | Status → `submitted` + user-attached confirmation + notification; **idempotent** (no double rows on retry) | Engineering | 4.2 | 0.5d | User sees "Submitted"; calling markSubmitted twice is a no-op |
| 4.5 | Pipeline tracker + status machine (Applied→Viewed→Interview/Rejected/Withdrawn; No-Response→Follow-up) | Engineering | 4.3 | 1.5d | Statuses transition and display; tap shows that application's artifacts |
| 4.6 | Day-10 follow-up draft generation (idempotent on `(applicationId,"day10")`); user sends via mailto — never auto-sent | Engineering | 4.5, 3.5 | 1d | Draft appears at day 10; user-sent only |
| 4.7 | Interview-prep generation on `Interview Invited` (company brief, questions, STAR skeletons) | Engineering | 4.5, 3.5 | 1.5d | Prep package generated on status change |

> **Mode 2 (Magic Pre-fill)** — the autofill-in-the-user's-own-browser capability — is built in **Phase 6 (extension)**, not here, and still ends in the user clicking the company's own Submit. There is no server-side form filler anywhere in the system.

**Exit criteria:** User can review → approve → submit via Mode 1; every transition is logged immutably and idempotently; status tracker, follow-up, and interview prep work. No code path submits an application server-side.

---

## 8. Phase 5 — Native Mobile App *(Year 2 — deferred)*

**Goal:** Native iOS/Android parity with core web flows, reusing all shared packages.

> **Sequencing (F-H5):** V1 ships as an installable **PWA** (per v1-project-scope). The native Expo app is a **Year 2** investment (milestone M6), built after monetization is proven. The monorepo scaffolds `apps/mobile` early so shared packages stay mobile-ready, but the screens below are not on the V1 critical path. **Phase 6 (extension) is the higher near-term priority** because the paid Mode-2 tier depends on it.

| ID | Task | Owner | Dep | Est. | DoD |
|----|------|-------|-----|------|-----|
| 5.1 | `apps/mobile`: Expo + Expo Router + NativeWind shell | Engineering | 0.2 | 1d | App builds and runs on iOS + Android simulators |
| 5.2 | Clerk auth on mobile | Engineering | 5.1, 1.7 | 0.5d | Login/logout works on device with same Clerk EU instance |
| 5.3 | tRPC client + `@agora/core` shared types wired in | Engineering | 5.1, 1.5 | 0.5d | Mobile calls same tRPC API; types match web |
| 5.4 | Core screens: job deck, match score, application review + approval | Engineering | 5.3, 3.7 | 2d | Swipe deck, right-swipe flow, review + approve work on mobile |
| 5.5 | Push notifications (new matches, status updates via Expo Notifications) | Engineering | 5.3 | 1d | Push notifications delivered to device |
| 5.6 | Document capture (camera → EU object storage; PII redaction before any LLM use) | Engineering | 5.3 | 1d | Scanned document uploaded to Scaleway EU; never sent raw to LLM |
| 5.7 | EAS Build/Submit/Update pipeline | Engineering | 5.1 | 0.5d | OTA update deployable; App Store + Play Store builds working |

**Exit criteria:** Users can browse, review, and approve applications on native mobile; push and document upload work.

---

## 9. Phase 6 — Browser Extension

**Goal:** Capture jobs from job boards and trigger the generate → review flow directly.

| ID | Task | Owner | Dep | Est. | DoD |
|----|------|-------|-----|------|-----|
| 6.1 | `apps/extension`: WXT + React (Manifest V3) shell | Engineering | 0.2 | 1d | Extension loads in Chrome, Edge, and Firefox |
| 6.2 | Auth/session bridge (extension reads logged-in user from web app origin) | Engineering | 6.1, 1.7 | 1d | Extension identifies the logged-in Agora user |
| 6.3 | "Save this job" content script for LinkedIn, Indeed, and StepStone | Engineering | 6.1, 2.4 | 2d | Job captured from page and saved into Agora |
| 6.4 | **Mode 2 (Magic Pre-fill):** autofill the company form from the approved package, in the user's own browser. Contains NO submit action — the Submit click is always the user's. | Engineering | 6.2, 1.8 | 1.5d | Fields populated on portal pages; no auto-submit code path exists (verified in review) |
| 6.5 | One-click "generate + review" trigger (launches review flow, not submit) | Engineering | 6.3, 3.7 | 1d | Generation triggered from extension; user reviews in Agora; no auto-submit |

**Exit criteria:** Users capture jobs and launch the review flow from three job boards; auto-submit is impossible from the extension.

---

## 10. Phase 7 — Compliance & Security Hardening

**Goal:** GDPR-defensible, audit-ready before public launch. (Begin in Phase 1, complete before M4.)

| ID | Task | Owner | Dep | Est. | DoD |
|----|------|-------|-----|------|-----|
| 7.1 | Data-flow map + Records of Processing Activities (RoPA) | Engineering + Legal | 1.2 | 1d | Every PII store, processor, and region documented |
| 7.2 | DPAs signed with **all** sub-processors (AWS, Vercel, Neon, Clerk, Scaleway, Upstash, Stripe, PostHog, Sentry, **Langfuse, Resend, Browserbase/Apify, Doppler**); public sub-processor list published | Founding team | 0.5 | 2d | Agreements on file for every processor in ARD §6 register; public list live |
| 7.3 | Right-to-erasure cascade: DB, object storage, queue, logs, analytics, Sentry, **Langfuse**, and **backups** (within retention window) | Engineering | 1.2, 4.3 | 1.5d | Account deletion verified to remove all PII; E2E test passes |
| 7.4 | Data export (GDPR portability) | Engineering | 1.8 | 0.5d | User downloads a JSON of all their data |
| 7.5 | Envelope encryption for sensitive documents (passports, visa docs) via KMS + data-minimization audit (no ID numbers in generation context) | Engineering | 5.6 | 1d | Passports encrypted at rest with rotating KMS key; ID numbers proven absent from LLM context |
| 7.6 | Consent UX: explicit logged consent for AI processing and for assisted (Mode-2) submission | Engineering | 3.7 | 0.5d | Consent recorded in DB; no generation or assisted submission without consent |
| 7.7 | Security review + pen-test of auth, generation, and submission/state-machine paths | Engineering + External | 4.x | 3d | Findings documented, triaged, and critical issues fixed before launch |
| 7.9 | Backups/DR: Neon PITR + object-storage versioning + tested restore | Engineering | 1.1 | 0.5d | Restore procedure documented and exercised once |
| 7.8 | AI disclosure copy: honest disclosure of AI assistance in product and in generated outputs | Engineering + Marketing | 3.7 | 0.5d | Disclosure present in onboarding, application review screen, and generated document headers |

**Exit criteria:** Erasure and export work end-to-end; all DPAs signed; sensitive data encrypted; consent captured; pen-test findings addressed.

---

## 11. Phase 8 — Observability, Billing & Launch

**Goal:** The system is monitored, billable, cost-observable, and alerting — ready for public launch.

| ID | Task | Owner | Dep | Est. | DoD |
|----|------|-------|-----|------|-----|
| 8.1 | Sentry across web, mobile, workers (EU data region) | Engineering | 1.6, 2.2 | 0.5d | Errors captured across all surfaces and routed to alerts |
| 8.2 | PostHog EU: funnels (onboarding, swipe → submit), retention, feature flags | Engineering | 1.6 | 1d | Funnel and retention data visible in PostHog |
| 8.3 | Structured logging + uptime alerts (Axiom or Better Stack) | Engineering | 2.2 | 0.5d | Logs queryable; uptime alerts configured |
| 8.4 | LLM + scraping cost dashboards + budget alerts | Engineering | 3.1, 2.3 | 1d | Daily token spend and browser-minutes visible; alert fires at 80% of budget |
| 8.5 | Stripe billing + subscription tiers (three-cohort €4.99/€6.99/€9.99 experiment) — **activate only after BSS funding starts (~Mar 2027)** | Engineering | 1.7 | 1.5d | Subscription purchasable; Stripe webhook updates user plan; not enabled pre-BSS-funding |
| 8.6 | Paywall / plan gating (Mode 2 + premium gated; entitlements enforced server-side per TRD TR-31a) | Engineering | 8.5 | 1d | Free users cannot access paid features; upgrade CTA shown |
| 8.7 | Transactional email (Resend + React Email: welcome, status updates, follow-up prompts) | Engineering | 1.7 | 1d | Lifecycle emails delivered |
| 8.8 | Load/soak test the generation + tracking pipeline at target concurrency (50 concurrent generations) | Engineering | 4.x | 1d | System holds target concurrency without queue backup or errors |
| 8.9 | Production runbook + on-call/alert routing | Engineering | 8.1, 8.3 | 1d | Incident response documented; alerts route to founder |

**Exit criteria:** Monitored, billable, alerting in place; load test passes; runbook written. ✅ Public launch ready.

---

## 12. Cross-Cutting Tracks

These run continuously across all phases:

| Track | Rule |
|-------|------|
| **Testing** | Vitest (unit), Playwright (web E2E), Maestro (mobile), Promptfoo (LLM evals) — added with each feature, never deferred |
| **Security & Compliance** | Phase 7 tasks begin in Phase 1. Erasure and consent must exist before real user data arrives. |
| **Cost control** | Model routing (Haiku for volume/eval, **Sonnet** for generation; Opus offline-only), prompt caching, generation deduplication/idempotency — implemented in Phase 3; monitored from Phase 8 |
| **Design system** | `packages/ui` grows as shared components emerge; web/extension/mobile stay visually consistent |
| **Build log** | Weekly public LinkedIn + X posts documenting what was built, what was learned — starts Phase 0 |

---

## 13. Risk Register

| ID | Risk | Phase | Mitigation |
|----|------|-------|------------|
| RISK-IMPL-01 | A server-side submitter gets built (Mode 3 by the back door) — top legal risk | Phase 4 | Phase 4 is explicitly "no server-side submit"; submission is client-side only; pen-test (7.7) checks for it; code review gate |
| RISK-IMPL-01b | `submitted` reachable without prior user-approved action | Phase 4 | State-machine guard (4.2) + test; approval gate (3.7) is a Phase-3 exit criterion |
| RISK-IMPL-02 | Real user data arrives before GDPR erasure is tested | Phase 1 | 7.1 and 7.3 are explicitly Phase 1 tasks |
| RISK-IMPL-03 | Bedrock model IDs in `eu-central-1` differ from expected at build time | Phase 0 | Verify IDs in task 0.7 before writing any AI code |
| RISK-IMPL-04 | Job supply thin after legal filtering (sparse swipe deck) | Phase 2 | Additional scraping sources (task 2.3); API partnerships tracked in OQ-04 |
| RISK-IMPL-05 | Promptfoo eval failures block development velocity | Phase 3 | Evals written with features, not retrofitted; start with a narrow eval suite and expand |
| RISK-IMPL-06 | Company incorporation before BSS approval invalidates grant | Phase 8 | Payments and incorporation tracked against BSS timeline; BSS approval is a pre-condition |

---

*This implementation plan is the primary engineering roadmap for Agora Jobs V1. Phase completion requires all exit criteria to be met. Changes to task sequence or exit criteria require founding team sign-off.*
