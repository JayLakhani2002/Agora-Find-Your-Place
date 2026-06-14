# Agora Jobs — Project Instructions

## Project Overview
Agora Jobs is a job-matching platform targeting the EU market, built as a TypeScript Turborepo monorepo with GDPR-first design. See `Business Planning/` for full documentation.

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
- **8-agent decomposition** — see `Business Planning/Agents/` for each agent's spec
- **Mode 3 permanently prohibited** — no server-side automated job submission on behalf of users (GDPR constraint)
- **EU-only data residency** — all infra must stay in EU regions
- **Model routing** — Opus 4.8 for CV + cover-letter generation; Sonnet 4.6 for Ari's advanced tasks (interview prep, profile analysis); Haiku 4.5 for Ari's normal chat and high-volume eval/classification. Model IDs from env, never hardcoded. (Opus 4.8 is $5/$25 per Mtok input/output — affordable for generation; the earlier "no Opus" rule assumed the old ~$75/Mtok Opus output price.)
- **Submission model**: users always click "Apply" themselves; agents draft, never submit
- **Pricing model**: credit-based is the **primary, chosen model** (per-action credits — CV, cover letter, and Ari tasks each consume credits). **Pay-as-you-go: you only pay for what you use, and credits don't expire** — no subscription, no billing clock; top up via one-time packs. Credit price (€/credit), pack sizes, and the Free allowance are **TBD — not finalized**. Live model: `Business Planning/Investor Package/Agora-Credit-Calculator.xlsx`.

## Key Constraints
- GDPR cascade delete must be implemented on all user-linked tables
- Vector indexes use HNSW (not IVFFlat) for pgvector
- Clerk webhooks use `@clerk/nextjs` current API (not deprecated helpers)
- BSS funding gate controls premium feature rollout via feature flags

## File Layout
```
Business Planning/
  Agents/           # 8 agent specs + stress-test report
  Prototype/        # MVP overview, phase plans, BSS demo strategy
  Tech Stack/       # Stack decisions and library patterns
  Eval-Suites/      # 64 adversarial tests across all 8 agents
  Business Documents/  # PRD, pitch deck, financial model, etc.
```

# Skills
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.
