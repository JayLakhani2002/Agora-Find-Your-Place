# Agora Jobs — Complete Tech Stack

**Last updated:** 2026-06-08
**Author:** Engineering
**Status:** Recommended baseline (v1)

---

## 0. Context & Constraints

Agora Jobs is an **AI-powered job-search and auto-apply platform** for international job seekers targeting the German/EU market (visa/Werkstudent filtering, AI-generated CVs & cover letters, job aggregation, and automated application submission).

These four decisions drive every choice in this document:

| Decision | Choice | Implication |
|---|---|---|
| **Platforms** | Web + native mobile (iOS/Android) + browser extension | Need a shared TypeScript core and a design system reused across all three surfaces. |
| **Infrastructure** | Managed / serverless | Optimize for iteration speed and low ops; pick managed DB, queues, and compute with EU regions. |
| **AI / automation** | Core product | LLM APIs, a durable job queue, and headless-browser automation are **first-class infrastructure**, not add-ons. |
| **Compliance** | EU data residency required (GDPR-first) | All PII (CVs, passports, visa data) stays in the EU. LLM provider, DB region, file storage, and analytics must all support EU hosting + DPAs. |

> **Guiding principle:** One language (TypeScript) end-to-end, one design system, EU-region everything, and treat the AI/automation pipeline as the product's beating heart.

---

## 1. Architecture at a Glance

```
                         ┌─────────────────────────────────────────────┐
                         │                 CLIENTS                      │
                         │                                              │
   Web (Next.js)  ◄──────┤  Mobile (Expo/RN)   Browser Ext (WXT)        │
        │                └──────────────┬───────────────────┬──────────┘
        │                               │                   │
        ▼                               ▼                   ▼
   ┌────────────────────────────────────────────────────────────────┐
   │                    API LAYER (tRPC + Next.js Route Handlers)    │
   │                    Auth · Rate limiting · Validation (Zod)      │
   └───────────────┬──────────────────────────────┬─────────────────┘
                   │                               │
        ┌──────────▼─────────┐          ┌──────────▼───────────────┐
        │  Postgres (Neon)   │          │   Job Queue (BullMQ /     │
        │  EU region         │          │   Upstash QStash)         │
        │  + pgvector        │          └──────────┬───────────────┘
        └──────────┬─────────┘                     │
                   │                     ┌──────────▼───────────────┐
        ┌──────────▼─────────┐           │  WORKERS (containers)    │
        │  Object storage    │           │  · Job scrapers          │
        │  (Scaleway/S3 EU)  │           │  · AI generation         │
        └────────────────────┘           │  · Auto-apply (Playwright)│
                                         └──────────┬───────────────┘
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │  LLM: Claude via AWS Bedrock   │
                                    │  (EU region, Frankfurt)        │
                                    └───────────────────────────────┘
```

---

## 2. Language & Monorepo Foundation

| Layer | Choice | Why |
|---|---|---|
| **Language** | **TypeScript** everywhere | One language across web, mobile, extension, backend, and workers. Shared types, validation, and business logic. |
| **Monorepo** | **Turborepo** + **pnpm** workspaces | Fast cached builds, shared packages, single source of truth. Best-in-class for multi-surface TS products. |
| **Runtime** | **Node.js 22 LTS** (workers) + edge runtime where useful | Stable LTS; edge for low-latency reads. |
| **Validation** | **Zod** | Runtime + compile-time safety; shared schemas between client and server. |
| **Formatting/Lint** | **Biome** (or ESLint + Prettier) | Biome is faster and single-tool; ESLint if you need its plugin ecosystem. |

**Suggested monorepo layout:**

```
agora-jobs/
├─ apps/
│  ├─ web/            # Next.js app
│  ├─ mobile/         # Expo (React Native)
│  ├─ extension/      # WXT browser extension
│  └─ workers/        # Background jobs (scraping, AI, auto-apply)
├─ packages/
│  ├─ ui/             # Shared design system (see §5)
│  ├─ api/            # tRPC routers + Zod schemas
│  ├─ db/             # Drizzle schema + migrations
│  ├─ ai/             # LLM clients, prompts, agents
│  ├─ core/           # Shared business logic & types
│  └─ config/         # tsconfig, biome, tailwind presets
└─ turbo.json
```

---

## 3. Frontend

### 3.1 Web — **Next.js 15 (App Router) on Vercel**
- React Server Components + Server Actions for fast, SEO-friendly pages (critical for job-listing discoverability).
- **Vercel** for hosting with EU edge regions; set function regions to **Frankfurt (fra1)** to keep compute in-EU.
- **TanStack Query** for client-side server-state caching where needed.

### 3.2 Mobile — **Expo (React Native) + EAS**
- Maximum code reuse with the web app via shared `packages/`.
- **Expo Router** (file-based, mirrors Next.js mental model).
- **EAS Build/Submit/Update** for CI builds + OTA updates (ship fixes without app-store review).
- Native modules available when you need camera (document scanning for CVs/passports), push notifications, biometrics.

### 3.3 Browser Extension — **WXT + React**
- **WXT** is the modern, Vite-based extension framework (Manifest V3, HMR, cross-browser builds for Chrome/Edge/Firefox).
- Use cases: capture jobs from LinkedIn/Indeed/StepStone, one-click apply, autofill application forms.
- Shares the same `packages/ui` and `packages/api` (tRPC client) as web.

### 3.4 Styling & Components (all surfaces)
| Tool | Use |
|---|---|
| **Tailwind CSS** | Utility styling on web + extension. |
| **shadcn/ui** (Radix) | Accessible, ownable component primitives for web/extension. |
| **NativeWind** | Tailwind syntax in React Native, so mobile shares the design language. |
| **Tamagui** (optional alt) | If you want a single component lib that compiles to web **and** native. Heavier setup; choose if true write-once-render-everywhere is a priority. |

---

## 4. Backend & API

| Concern | Choice | Why |
|---|---|---|
| **API style** | **tRPC** | End-to-end typesafe RPC between TS clients and server — no codegen, no schema drift. Ideal for a TS monorepo serving web + mobile + extension. |
| **Public/partner API** | **REST via Next.js Route Handlers** (or **Hono**) + **OpenAPI** | Expose a stable REST surface for any third-party/partner integrations; tRPC stays internal. |
| **Hosting** | **Vercel** for the app/API; **separate worker service** for long jobs (see §6) | Serverless functions have execution-time limits unsuitable for scraping/automation. |
| **Background/long-running** | Dedicated containers on **Railway** / **Render** / **Fly.io** (EU region) | Auto-apply + scraping runs for minutes and needs a real browser — not serverless. |
| **Auth** | **Clerk** or **Auth.js (NextAuth) + Lucia patterns** | Clerk = fastest, handles mobile + web + sessions, MFA, EU data region available. If you need full data control/cost at scale, self-host Auth.js. |
| **Validation** | **Zod** shared schemas | Single validation layer for all clients. |
| **Email** | **Resend** (transactional) + **React Email** | DX-friendly, EU-region sending, typed templates. |

> **Auth note for compliance:** confirm your auth provider stores EU user data in-EU (Clerk offers EU data residency on Business plans). If residency must be airtight and cheap, self-hosting Auth.js against your EU Postgres is the safest.

---

## 5. Data Layer

| Concern | Choice | Why |
|---|---|---|
| **Primary DB** | **PostgreSQL** | The right default: relational integrity for users/jobs/applications, JSONB flexibility, mature EU hosting. |
| **Managed host** | **Neon** (serverless Postgres, **EU region — Frankfurt**) or **Supabase EU** | Neon: branching, scale-to-zero, serverless-friendly. Supabase: bundles auth/storage/realtime if you want a batteries-included EU stack. |
| **ORM** | **Drizzle ORM** | Lightweight, typesafe SQL-first, great migrations, edge-compatible. (Prisma is the alternative if you prefer its DX and tooling.) |
| **Vector search** | **pgvector** (in the same Postgres) | Semantic job↔candidate matching and CV embeddings without a separate vector DB. Add a dedicated vector DB (Qdrant EU) only if scale demands. |
| **Cache / rate-limit / sessions** | **Upstash Redis** (EU region) | Serverless Redis; pairs with Upstash rate-limiting. |
| **Object storage (CVs, docs)** | **Scaleway Object Storage** or **AWS S3 (eu-central-1)** | EU-resident storage for sensitive documents. Scaleway = EU-native, GDPR-friendly. |
| **Search (jobs)** | **Postgres full-text** first → **Typesense/Meilisearch (EU self-host)** if needed | Don't over-build; Postgres FTS + pgvector covers a lot before you need a search engine. |

---

## 6. The AI / Automation Pipeline (core product)

This is where Agora Jobs lives or dies. Treat it as a real distributed system.

### 6.1 LLM provider — **Claude (Anthropic) via AWS Bedrock, EU region**
- **Why Claude:** strong long-context reasoning and writing quality — exactly what's needed for tailored CVs, cover letters, and job-fit analysis.
- **Why Bedrock (EU):** running Claude through **AWS Bedrock in an EU region (e.g. Frankfurt `eu-central-1`)** keeps inference and data **inside the EU** with an AWS DPA — satisfying your data-residency requirement. (Direct Anthropic API is simpler but verify region/DPA terms against your GDPR needs; Bedrock is the safer residency story.)
- **Models:** default to the latest **Claude Opus** for high-quality generation (cover letters, nuanced matching) and **Claude Haiku** for cheap, high-volume tasks (parsing, classification, embeddings-adjacent routing). Use the most capable current models and route by task cost.
- **SDK:** `@anthropic-ai/sdk` (or the Bedrock client) wrapped in `packages/ai`.

> ⚠️ **Quality/compliance guardrail (from market research):** German embassies and employers are actively detecting AI-generated visa letters and applications. Build Agora to **augment and personalize**, not to mass-produce detectable boilerplate. Bake in: user-voice capture, human-in-the-loop review/approval before any submission, per-application variation, and clear honesty about AI assistance. This is a product-defining constraint, not just a tech detail.

### 6.2 Orchestration & prompts
| Tool | Use |
|---|---|
| **Vercel AI SDK** | Streaming responses, model abstraction, tool-calling in the app. |
| **Custom agent loop** in `packages/ai` | For multi-step agents (match → draft → tailor → review). Keep it simple; avoid heavyweight frameworks until you need them. |
| **Prompt/version management** | Store prompts in-repo, versioned; log inputs/outputs to your eval store. |
| **Evals** | **Promptfoo** (or Braintrust) | Regression-test prompt changes so quality doesn't silently degrade. |

### 6.3 Job queue & workers
| Concern | Choice | Why |
|---|---|---|
| **Queue** | **BullMQ** (on Upstash/Redis EU) or **Upstash QStash** | Durable, retryable background jobs for scraping, generation, and applying. QStash if you want fully serverless HTTP-based queueing. |
| **Workflow orchestration (optional, recommended as you scale)** | **Inngest** or **Trigger.dev** | Durable multi-step workflows with retries, scheduling, and observability — perfect for "scrape → match → draft → notify → apply" pipelines. EU regions available. |
| **Workers runtime** | Long-running **containers** (Railway/Render/Fly, EU) | Needed for headless-browser sessions that exceed serverless limits. |

### 6.4 Scraping & auto-apply (the automation engine)
| Concern | Choice | Why |
|---|---|---|
| **Browser automation** | **Playwright** | Best-in-class headless automation for filling/submitting application forms and scraping JS-heavy boards. |
| **Anti-bot / scale scraping** | **Apify** actors and/or **Browserbase** managed browsers | Managed, scalable headless browsers with proxy/stealth handling — avoids running a fragile browser farm yourself. |
| **Structured extraction** | Playwright + LLM extraction (Claude Haiku) | Parse listings into a normalized schema. |
| **Compliance & ethics** | Respect ToS/robots, rate-limit, prefer official APIs (e.g., Indeed API) where available; keep a human approval step before submitting applications. | Reduces legal/account-ban risk and aligns with the "augment, not spam" principle. |

---

## 7. Infrastructure, DevOps & Observability

| Concern | Choice | Why |
|---|---|---|
| **App hosting** | **Vercel** (functions pinned to EU `fra1`) | Best Next.js DX, preview deploys, edge. |
| **Worker hosting** | **Railway** / **Render** / **Fly.io** (EU region) | Containers for queues + browser automation. |
| **IaC (as it grows)** | **SST** or **Terraform/OpenTofu** | Codify infra once you outgrow dashboards. |
| **CI/CD** | **GitHub Actions** + **Turborepo remote cache** + **EAS** for mobile | Fast, cached pipelines per app. |
| **Secrets** | **Doppler** or Vercel/provider secret stores | Centralized, environment-scoped. |
| **Error tracking** | **Sentry** (web, mobile, workers; EU data region) | Cross-platform error + performance monitoring. |
| **Product analytics** | **PostHog** (**EU Cloud** or self-host) | Product analytics, feature flags, session replay, A/B tests — GDPR-friendly, EU-hosted. One tool covers a lot. |
| **Logging/metrics** | **Axiom** or **Better Stack** (EU) | Structured logs + uptime. |
| **Payments** | **Stripe** (Billing + subscriptions) | Standard for SaaS; handles EU VAT/SCA. Consider **Paddle** as merchant-of-record if you want VAT/tax fully offloaded. |

---

## 8. Security & GDPR Compliance (first-class)

Given you handle CVs, passports, and visa data, compliance is a feature, not paperwork.

- **Data residency:** Postgres (Neon/Supabase EU-Frankfurt), object storage (Scaleway/S3 eu-central-1), Redis (Upstash EU), LLM (Bedrock EU), analytics (PostHog EU), errors (Sentry EU). Maintain a data-flow map.
- **Encryption:** TLS everywhere; encryption at rest (managed by providers); encrypt especially sensitive documents (passports) with envelope encryption (KMS).
- **PII minimization:** Don't send raw passport/visa numbers to LLMs. Redact/tokenize before inference. Keep an allowlist of fields that may leave the EU (ideally: none).
- **DPAs:** Sign Data Processing Agreements with every sub-processor (AWS, Vercel, Neon, Stripe, etc.). Keep a **Records of Processing Activities (RoPA)** and a public sub-processor list.
- **User rights:** Build export + delete (right to erasure) from day one; cascade deletes across DB, storage, queues, logs, and analytics.
- **Consent & transparency:** Clear consent for AI processing and automated applications; disclose AI assistance (ties into the embassy-detection risk).
- **AuthZ:** Role-based access; row-level security in Postgres (Supabase RLS or Drizzle policies) so users can only touch their own data.
- **Auditing:** Append-only audit log of every automated application submitted on a user's behalf.
- **Secrets/keys:** Rotate regularly; never in client bundles (extension/mobile included).

---

## 9. Testing & Quality

| Layer | Tool |
|---|---|
| **Unit/integration** | **Vitest** |
| **E2E (web)** | **Playwright** |
| **E2E (mobile)** | **Maestro** |
| **Component** | **Storybook** (shared `packages/ui`) |
| **API contract** | tRPC types + Zod (compile-time) |
| **LLM evals** | **Promptfoo** (regression-test prompt/model changes) |
| **Type safety** | `tsc --noEmit` in CI across the monorepo |

---

## 10. Recommended Stack — Quick Reference

| Category | Primary pick | Strong alternative |
|---|---|---|
| Language | TypeScript | — |
| Monorepo | Turborepo + pnpm | Nx |
| Web | Next.js 15 (Vercel, EU) | Remix |
| Mobile | Expo / React Native + EAS | Flutter (if leaving TS) |
| Extension | WXT + React | Plasmo |
| Styling | Tailwind + shadcn/ui + NativeWind | Tamagui (write-once) |
| API | tRPC (+ REST via Hono) | GraphQL (urql) |
| Auth | Clerk (EU) | Auth.js self-hosted |
| Database | Postgres on Neon (EU) | Supabase (EU) |
| ORM | Drizzle | Prisma |
| Vector | pgvector | Qdrant (EU) |
| Cache/Queue | Upstash Redis + BullMQ | QStash / Inngest |
| Workflows | Inngest / Trigger.dev | Temporal |
| LLM | Claude via AWS Bedrock (EU) | Claude direct API / Mistral (EU) |
| AI orchestration | Vercel AI SDK + custom agents | LangGraph |
| Scraping/automation | Playwright + Browserbase/Apify | Puppeteer self-hosted |
| Object storage | Scaleway / S3 eu-central-1 | Cloudflare R2 (EU) |
| Workers hosting | Railway / Render / Fly (EU) | AWS ECS (eu-central-1) |
| Payments | Stripe | Paddle (MoR) |
| Analytics | PostHog (EU) | Mixpanel EU |
| Errors | Sentry (EU) | — |
| Email | Resend + React Email | Postmark (EU) |
| CI/CD | GitHub Actions + Turbo cache + EAS | — |
| Testing | Vitest + Playwright + Maestro | — |
| LLM evals | Promptfoo | Braintrust |

---

## 11. Suggested Build Order (MVP → Scale)

1. **Foundation:** Turborepo + pnpm, shared `config`/`ui`/`db`/`core`, Next.js web app, Neon EU Postgres + Drizzle, Clerk auth.
2. **Core data + search:** Job ingestion schema, Postgres FTS + pgvector matching, basic candidate profile/CV upload (Scaleway EU storage).
3. **AI generation:** `packages/ai` with Claude via Bedrock EU; CV/cover-letter generation with human-in-the-loop review; PII redaction layer.
4. **Automation engine:** BullMQ + worker containers; Playwright/Browserbase scrapers; auto-apply with mandatory user approval + audit log.
5. **Mobile + extension:** Expo app and WXT extension reusing shared packages.
6. **Compliance hardening:** RoPA, DPAs, export/delete flows, RLS, consent UX.
7. **Observability + monetization:** PostHog EU, Sentry EU, Stripe billing; Promptfoo evals in CI.
8. **Scale:** Add Inngest/Trigger.dev workflows, dedicated vector DB or search engine only if metrics justify it.

---

## 12. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| AI-generated applications detected/rejected (embassies, employers) | Augment-not-automate design; user-voice capture; per-application variation; human review; honest AI disclosure. |
| GDPR/data-residency violation with sensitive docs | EU-only providers; PII redaction before LLM; envelope encryption; DPAs + RoPA; export/delete from day one. |
| Scraper fragility / account bans | Prefer official APIs; managed browsers (Browserbase/Apify); rate-limit; rotate; respect ToS. |
| Serverless time limits break automation | Run browser/automation on long-lived EU containers, not serverless functions. |
| LLM quality regressions | Promptfoo evals gating prompt/model changes in CI. |
| Vendor lock-in | TypeScript + standards (Postgres, S3 API, OpenAI/Anthropic-compatible interfaces) keep most components portable. |

---

*This is a recommended baseline. Revisit provider/region choices against current GDPR guidance and each vendor's latest EU data-residency terms before signing DPAs.*
