# Agora Jobs — Implementation Plan

**Last updated:** 2026-06-08
**Companion to:** Tech Stack · Architecture · Cost Estimate · Monorepo Scaffold

A phased, task-level plan to take Agora Jobs from empty repo to a production AI job-application platform. Tasks are sized to roughly **0.5–2 days each** so they can be tracked, assigned, and shipped independently.

**Legend**
`[ ]` = not started · **Owner** = role · **Dep** = depends on task IDs · **DoD** = definition of done

---

## Phase 0 — Foundation & Project Setup
*Goal: a working monorepo, CI, and EU infrastructure accounts. Nothing user-facing yet.*

| ID | Task | Dep | DoD |
|---|---|---|---|
| 0.1 | Create Turborepo + pnpm monorepo with apps/packages layout | — | `pnpm install` resolves; `turbo build` runs |
| 0.2 | Add shared `packages/config` (tsconfig, Biome, Tailwind presets) | 0.1 | Lint + typecheck pass repo-wide |
| 0.3 | Set up GitHub repo, branch protection, PR template | 0.1 | Main protected; PRs required |
| 0.4 | CI pipeline (GitHub Actions: install, lint, typecheck, test) with Turbo remote cache | 0.2 | Green CI on a sample PR |
| 0.5 | Provision EU accounts: Neon (EU), Upstash (EU), Scaleway, Vercel, Clerk, AWS (Bedrock) | — | All accounts created, EU regions confirmed |
| 0.6 | Secrets management with Doppler; wire `.env` across environments | 0.5 | Secrets injected locally + CI |
| 0.7 | Request AWS Bedrock model access (Opus + Haiku) in `eu-central-1` | 0.5 | Models callable from a test script |

**Exit criteria:** CI green, all EU infra accounts ready, Bedrock reachable.

---

## Phase 1 — Core Data & Auth
*Goal: users can sign up and log in; the data model exists.*

| ID | Task | Dep | DoD |
|---|---|---|---|
| 1.1 | `packages/db`: Drizzle setup + Neon EU connection | 0.5 | `drizzle-kit push` succeeds |
| 1.2 | Define schema: users, jobs, applications, profiles, audit_log | 1.1 | Migrations applied to EU DB |
| 1.3 | Enable pgvector; add embedding columns + indexes | 1.2 | Vector index created |
| 1.4 | Neon branching wired into PR previews (DB-per-PR) | 1.1, 0.4 | Preview PR gets isolated branch DB |
| 1.5 | `packages/api`: tRPC server + Zod base setup | 0.2 | Typed `appRouter` builds |
| 1.6 | `apps/web`: Next.js 15 app shell, Tailwind, shadcn/ui | 0.2 | Dev server renders base layout |
| 1.7 | Integrate Clerk auth (EU region) on web; protected routes | 1.6, 0.5 | Sign up / log in / log out works |
| 1.8 | User profile CRUD (tRPC + DB) | 1.5, 1.7 | Profile create/read/update persists |
| 1.9 | Row-level access rules (users see only their data) | 1.8 | Cross-user access denied in tests |

**Exit criteria:** A user can register, log in, and edit a profile stored in EU Postgres.

---

## Phase 2 — Job Ingestion & Search
*Goal: jobs flow into the system and are searchable/matchable.*

| ID | Task | Dep | DoD |
|---|---|---|---|
| 2.1 | `apps/workers`: BullMQ + Upstash EU queue scaffold | 0.5, 1.1 | A test job enqueues + processes |
| 2.2 | Deploy worker container to Railway/Render (EU) | 2.1 | Worker runs 24/7, connects to Redis |
| 2.3 | First scraper (one source, e.g. official Indeed API or StepStone) with Playwright/Browserbase | 2.1 | Listings fetched into raw store |
| 2.4 | LLM structured extraction (Claude Haiku) → normalized job schema | 2.3, 0.7 | Raw listing → clean `jobs` row |
| 2.5 | Job embeddings written to pgvector | 2.4, 1.3 | Embeddings populated on ingest |
| 2.6 | Job search: Postgres FTS + filters (visa/Werkstudent/wage) | 2.4 | Filtered search returns results |
| 2.7 | Job list + detail UI on web | 2.6, 1.6 | Browse + view jobs end-to-end |
| 2.8 | Scheduled ingestion (Inngest/cron) with dedupe | 2.4 | New jobs auto-appear daily, no dupes |

**Exit criteria:** Jobs auto-ingest on a schedule and are browsable + filterable in the web app.

---

## Phase 3 — AI Generation (human-in-the-loop)
*Goal: tailored CVs and cover letters, always reviewed before use.*

| ID | Task | Dep | DoD |
|---|---|---|---|
| 3.1 | `packages/ai`: Claude/Bedrock EU client + model routing | 0.7 | Opus/Haiku callable via wrapper |
| 3.2 | **PII redaction layer** + unit tests (runs before every LLM call) | 3.1 | Passport/visa patterns stripped; tested |
| 3.3 | Candidate↔job matching (pgvector similarity + rule filters) | 2.5, 1.8 | Ranked matches per user |
| 3.4 | User-voice capture (tone/preferences) feeding prompts | 1.8 | Voice stored + injected into context |
| 3.5 | Cover-letter generation flow (queue → Opus → draft) | 3.1, 3.2 | Draft generated + stored as `draft` |
| 3.6 | CV tailoring generation flow | 3.5 | Tailored CV draft produced |
| 3.7 | **Review & edit UI** with approve/reject gate | 3.5, 1.6 | User edits + approves before submit |
| 3.8 | Per-application variation (avoid detectable boilerplate) | 3.5 | Drafts differ meaningfully per job |
| 3.9 | Promptfoo eval suite in CI for generation quality | 3.5 | Prompt changes gated by evals |

**Exit criteria:** A user gets matched jobs, generates tailored materials, and must review/approve them. Nothing is auto-final.

---

## Phase 4 — Auto-Apply Engine
*Goal: submit approved applications automatically, with full audit trail.*

| ID | Task | Dep | DoD |
|---|---|---|---|
| 4.1 | Apply worker (Playwright) — form fill for one portal | 2.2, 3.7 | Submits a test application |
| 4.2 | **Approval guard**: only `status === approved` can submit | 4.1, 3.7 | Unapproved submit blocked in tests |
| 4.3 | **Append-only audit log** of every submission | 4.1, 1.2 | Every submit recorded immutably |
| 4.4 | Confirmation capture + status update + user notification | 4.1 | User sees submitted + confirmation |
| 4.5 | Retry/error handling + dead-letter queue | 4.1 | Failures retried, surfaced cleanly |
| 4.6 | Per-portal adapters (add 2–3 more sources) | 4.1 | Multiple portals supported |
| 4.7 | Rate limiting / account-safety throttles per source | 4.6 | Submissions throttled per policy |

**Exit criteria:** Approved applications submit automatically to multiple portals, fully logged, with safe retries.

---

## Phase 5 — Mobile App
*Goal: native iOS/Android reusing the shared core.*

| ID | Task | Dep | DoD |
|---|---|---|---|
| 5.1 | `apps/mobile`: Expo + Expo Router + NativeWind shell | 0.2 | App builds + runs on simulator |
| 5.2 | Clerk auth on mobile | 5.1, 1.7 | Login works on device |
| 5.3 | tRPC client + shared `packages/core` wired in | 5.1, 1.5 | Mobile calls same API typesafely |
| 5.4 | Core screens: jobs, matches, application review/approve | 5.3, 3.7 | Parity with key web flows |
| 5.5 | Push notifications (new matches, status updates) | 5.3 | Notifications delivered |
| 5.6 | Document capture (camera → CV/doc upload to Scaleway EU) | 5.3 | Scanned doc uploaded securely |
| 5.7 | EAS Build/Submit/Update pipeline | 5.1 | OTA updates + store builds working |

**Exit criteria:** Users can browse, review, and approve applications from native apps.

---

## Phase 6 — Browser Extension
*Goal: capture jobs and one-click apply from job boards.*

| ID | Task | Dep | DoD |
|---|---|---|---|
| 6.1 | `apps/extension`: WXT + React (MV3) shell | 0.2 | Loads in Chrome/Edge/Firefox |
| 6.2 | Auth/session bridge to Agora account | 6.1, 1.7 | Extension knows logged-in user |
| 6.3 | "Save this job" capture from LinkedIn/Indeed/StepStone | 6.1, 2.4 | Job saved into Agora from page |
| 6.4 | Autofill application forms from profile | 6.2, 1.8 | Fields populated on portal |
| 6.5 | One-click "generate + review" trigger from extension | 6.3, 3.7 | Launches review flow |

**Exit criteria:** Users capture jobs and trigger applications directly from job boards.

---

## Phase 7 — Compliance & Security Hardening
*Goal: GDPR-defensible, audit-ready. (Start early; finish before public launch.)*

| ID | Task | Dep | DoD |
|---|---|---|---|
| 7.1 | Data-flow map + RoPA (records of processing) | 1.2 | Documented, reviewed |
| 7.2 | DPAs signed with all sub-processors; public sub-processor list | 0.5 | Agreements on file |
| 7.3 | Right-to-erasure: cascade delete across DB, storage, queues, logs, analytics | 1.2, 4.3 | Account delete wipes all PII |
| 7.4 | Data export (portability) | 1.8 | User downloads their data |
| 7.5 | Envelope encryption for sensitive docs (KMS) | 5.6 | Passports encrypted at rest |
| 7.6 | Consent UX (AI processing + automated applications) | 3.7 | Explicit, logged consent |
| 7.7 | Security review / pen-test of auth + auto-apply | 4.x | Findings triaged + fixed |
| 7.8 | AI-disclosure copy (honesty about AI assistance) | 3.7 | Disclosed in product + outputs |

**Exit criteria:** Erasure/export work end-to-end, DPAs signed, sensitive data encrypted, consent captured.

---

## Phase 8 — Observability, Billing & Launch
*Goal: monitored, monetized, ready for users.*

| ID | Task | Dep | DoD |
|---|---|---|---|
| 8.1 | Sentry (web, mobile, workers — EU) | 1.6, 2.2 | Errors captured across surfaces |
| 8.2 | PostHog EU: analytics, funnels, feature flags | 1.6 | Key events tracked |
| 8.3 | Structured logging + uptime (Axiom/Better Stack) | 2.2 | Logs queryable, alerts set |
| 8.4 | LLM + scraping cost dashboards + budget alerts | 3.1, 2.3 | Usage/cost visible per day |
| 8.5 | Stripe billing + subscription tiers | 1.7 | Paid plan purchasable |
| 8.6 | Paywall / plan gating in app | 8.5 | Free vs paid limits enforced |
| 8.7 | Transactional email (Resend + React Email) | 1.7 | Lifecycle emails send |
| 8.8 | Load/soak test the automation pipeline | 4.x | Holds target concurrency |
| 8.9 | Production runbook + on-call/alerting | 8.1, 8.3 | Incident process documented |

**Exit criteria:** Monitored, billable, alerting in place — ready for public launch.

---

## Cross-Cutting Tracks (run continuously)

- **Testing:** Vitest (unit), Playwright (web E2E), Maestro (mobile E2E), Promptfoo (LLM evals). Add tests with each feature, not after.
- **Security & compliance:** Phase 7 tasks start in Phase 1 — don't defer erasure/consent to the end.
- **Cost control:** model routing (Haiku/Opus), prompt caching, generation dedupe — wire in during Phase 3, monitor from Phase 8.
- **Design system:** grow `packages/ui` as shared components emerge; keep web/extension/mobile visually consistent.

---

## Suggested Milestones

| Milestone | Phases | Outcome |
|---|---|---|
| **M1 — Internal alpha** | 0–3 | Sign in, browse jobs, generate + review materials (web only) |
| **M2 — Auto-apply beta** | 4, 7 (core) | Approved applications auto-submit with audit + erasure |
| **M3 — Multi-surface** | 5, 6 | Mobile + extension live |
| **M4 — Public launch** | 7 (full), 8 | Compliant, monitored, monetized |

---

## Critical Path & Sequencing Notes

- **Hard dependency spine:** 0 → 1 → 2 → 3 → 4. Mobile (5) and extension (6) can parallelize once Phase 3 stabilizes the API.
- **Do NOT build auto-apply (4) before the approval gate (3.7) and audit log exist** — submitting unreviewed AI content is the project's top risk.
- **PII redaction (3.2) must land before the first real LLM call on user data.**
- **Phase 7 is not a finale** — erasure (7.3), consent (7.6), and the data map (7.1) should be in place before any real user data enters the system.
