# Agora Jobs — Project Instructions

## Project Overview
Agora Jobs is a job-matching platform targeting the EU market, built as a TypeScript Turborepo monorepo with GDPR-first design. See `docs/` for full documentation.

## Tech Stack
- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: tRPC v11, Hono
- **Database**: PostgreSQL (Neon) + Drizzle ORM, pgvector for embeddings
- **Auth**: Clerk
- **Payments**: Stripe
- **Scraping**: Crawlee
- **Embeddings**: Cohere
- **Deployment**: EU-only data residency

## context7 — Always Use for Library Docs

**RULE: Before writing code that uses any library, framework, SDK, or API, resolve it via context7 first.**

This applies to (non-exhaustive):
- Next.js, React, tRPC, Hono
- Drizzle ORM, Neon, pgvector
- Clerk (auth, webhooks)
- Stripe (checkout, webhooks, subscriptions)
- Crawlee (scraping, rate limiting)
- Cohere (embeddings)
- Tailwind CSS, shadcn/ui
- Turborepo, pnpm

### How to use context7
1. Resolve the library ID: `mcp__context7__resolve-library-id` with the library name
2. Fetch relevant docs: `mcp__context7__query-docs` with the resolved ID and a focused topic

Never rely on training-data knowledge for library APIs — versions change and patterns drift.

## Architecture Decisions
- **8-agent decomposition** — see `docs/Agents/` for each agent's spec
- **Mode 3 REPEALED (Jay, 2026-08-04)** — server-side automated job submission with per-application user approval (Tsenta-class agent) is now the product strategy; see `docs/scope/PROJECT-SCOPE.md` §3.3. NOT YET BUILT: the shipped product remains review-first until the application-worker phase lands, and auto-submission launches only after a German legal review (UWG/ToS/GDPR — see TSENTA-KEY-FINDINGS §10). Marketing may describe auto-apply only as clearly-labeled roadmap, never as an existing feature.
- **EU-only data residency** — all infra must stay in EU regions
- **Positioning (Jay, 2026-08-06)** — Agora is a **global, all-professions** job platform: trades, hospitality, logistics, retail, tech, management, sales. The legal-eligibility engine (`allowedVisaTypes` filtering, `@agora/legal`, visa ticks) is **kept and preserved** but **demoted from headline moat to conditional capability** — it activates when a user's situation makes it relevant, and is never the site's primary frame. Do not reintroduce student/Werkstudent/§16b/Berlin-first framing as the default surface. See `docs/scope/DECISIONS-NEEDED.md` Q1.
- **Bedrock access is gated on the Anthropic use-case form** (confirmed 2026-08-06), which is reviewed against the live website — this is why the website blocks AI. Model ids MUST be `eu.`-prefixed inference profiles; bare `anthropic.*` ids are rejected by Bedrock and now throw at resolve time.
- **Model routing** — Opus 4.8 for CV + cover-letter generation; Sonnet 4.6 for Ari's advanced tasks (interview prep, profile analysis); Haiku 4.5 for Ari's normal chat and high-volume eval/classification. Model IDs from env, never hardcoded. (Opus 4.8 is $5/$25 per Mtok input/output — affordable for generation; the earlier "no Opus" rule assumed the old ~$75/Mtok Opus output price.)
- **Submission model**: today, users always click "Apply" themselves — agents draft, never submit. Target model after the application-worker phase: agent submits with per-application approval (or user-enabled auto-approve), with a full receipt per submission.
- **Pricing model**: credit-based is the **primary, chosen model** (per-action credits — CV, cover letter, and Ari tasks each consume credits). **Pay-as-you-go: you only pay for what you use, and credits don't expire** — no subscription, no billing clock; top up via one-time packs. Credit price (€/credit), pack sizes, and the Free allowance are **TBD — not finalized**. Live model: `docs/Investor Package/Agora-Credit-Calculator.xlsx`.
  - **Reconfirmed by Jay 2026-08-06.** ⚠️ `packages/billing` still ships the **superseded** Free/Pro €9-per-month subscription (`stripe.ts` `PLANS`) — it predates this decision and must be rewritten to credits. `docs/scope/PROJECT-SCOPE.md:199`'s "decided" €19/100 · €39/250 · €79/600 is **not** confirmed; treat pack pricing as TBD and do not hardcode it.

## Key Constraints
- GDPR cascade delete must be implemented on all user-linked tables
- Vector indexes use HNSW (not IVFFlat) for pgvector
- Clerk webhooks use `@clerk/nextjs` current API (not deprecated helpers)
- BSS funding gate controls premium feature rollout via feature flags

## File Layout
```
apps/
  web/              # Main Next.js app (job seeker product)
  website/          # Marketing/landing site + CLAUDE.md for website context
  workers/          # Background scraping workers
packages/
  ai/               # AI/embedding utilities
  billing/          # Stripe integration
  db/               # Drizzle ORM schema + migrations
  ui/               # Shared shadcn/ui components
  config/           # Shared TS/lint config
  legal/            # GDPR utilities
docs/
  Agents/           # 8 agent specs + stress-test report
  Prototype/        # MVP overview, phase plans, BSS demo strategy
  Tech Stack/       # Stack decisions and library patterns
  Eval-Suites/      # 64 adversarial tests across all 8 agents
  Business Documents/  # PRD, pitch deck, financial model, etc.
  Investor Package/ # Business plan, financial projections, pitch deck
  Product Design/   # Screen flow document
  CV Optimization Research/  # ATS rules, psychology, CV structure
  Job Data/         # ALL job-source docs: APIs, legal posture, plan, source registry
  Branding & Marketing/  # Brand playbook
  Competitor Data/  # Competitor analysis
  Founder Visa & Funding Guidelines/  # BSS, visa roadmap
  Agora Context Guidelines/  # Walkthrough, scope overview
assets/
  brand/            # Ari mascot, logos
  screenshots/      # App screenshots
  landing-concepts/ # Landing page design mockups
  design-system/    # Design tokens and specs
infrastructure/
  railway.toml
  vercel.json
```

# Skills
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.
