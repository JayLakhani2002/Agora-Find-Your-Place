# Agora Jobs — Agent Fleet Stress-Test Report
**Date:** 2026-06-09 · **Scope:** all 8 agents (`../Agents/CLAUDE_AGENT*.md`) · **Suites:** `./suites/agent*.js`

---

## What this report is (and isn't)

This is a **static red-team analysis**: I went through every agent's CLAUDE.md against its 8
adversarial tests and assessed whether the spec gives the agent a clear, explicit basis to pass.
It is **not** a record of live API runs — those require your Anthropic key via `EvalHarness`
(see README). Run the harness to confirm model *adherence*; this report confirms spec *coverage*
and reports the structural issues the test-design surfaced.

**Two test types** (the distinction matters):
- **Refusal tests** — a hostile instruction to break a rule. Passing = refuse + cite the rule.
- **Execution tests** — a neutral "write X". Passing = emit *correct* stack code, not just refuse.
  These are the highest-signal to run live (a vague spec or a drifting model fails them silently).

---

## Headline findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| F-1 | **Pricing screen owned by BOTH Agent 7 and Agent 8** (Agent 8 also self-contradicted: claimed it, then said "wired to Agent 7") | High (merge conflict + ambiguous ownership) | ✅ **Fixed** |
| F-2 | `packages/db/src/queries/matching.ts` is written by Agent 5 but lives in Agent 2's package | Low (documented carve-out) | ⚠️ Noted — acceptable |
| F-3 | 4 execution tests depend on model adherence, not just spec | Info | Run live to confirm |

### F-1 — Pricing ownership conflict (fixed)
Agent 7 claimed "ALL pages except onboarding/api" (which includes pricing); Agent 8 separately
claimed `(screens)/pricing/**`. Two agents owning one file = guaranteed collision.
**Resolution:** Agent 7 owns **every** screen (one design system, one owner); Agent 8 owns billing
**logic only** and exposes `billing.*` procedures (`getPlans`, `createCheckoutSession`,
`getSubscriptionStatus`, `createPortalSession`) that the pricing screen calls. Edited:
`CLAUDE_AGENT7.md` (explicitly lists pricing), `CLAUDE_AGENT8.md` (dropped the screen, added a
"never build UI" refusal line), `suites/agent8.js` (scope-ui test now expects refusal + handoff).

### F-2 — Cross-package query helper (watch, acceptable)
Agent 5 authors `packages/db/src/queries/matching.ts` inside Agent 2's package. This is an
**explicit, documented** carve-out (Agent 5's file: "you write, Agent 2 reviews"), not a silent
overlap, so it's acceptable. If it causes friction, move matching query helpers into Agent 5's own
module and have it import only `db` + `schema` from `@agora/db`.

### F-3 — Execution tests to prioritize in live runs
These pass only if the model emits correct code (spec is explicit, but adherence isn't free):
Agent 2 `index-syntax` + `migration` · Agent 6 `jobid` · Agent 7 `newtab` · Agent 8 `apiversion` + `flag-off-call`.

---

## Coverage by agent

Every adversarial vector below maps to an explicit rule in the agent's CLAUDE.md ("common mistakes"
or a numbered rule). ✅ = spec arms the agent · ⚙ = execution test (correctness of emitted code).

### Agent 1 — Infrastructure (8 tests)
✅ scope-router (Agent 5's job) · ✅ trpc-next (fetch adapter) · ⚙ redis-opt (`maxRetriesPerRequest: null`) ·
✅ secrets · ✅ cors · ✅ region (EU) · ✅ shared-file (append-only `_app.ts`) · ✅ drift (Stripe→Agent 8)

### Agent 2 — Schema (8 tests)
✅ int-pk (cuid2) · ✅ dims (1024) · ✅ ivfflat (HNSW+cosine) · ✅ jsonb · ⚙ index-syntax (array form) ·
✅ cascade (erasure) · ✅ scope (router→Agent 4) · ⚙ migration (model + migration both)

### Agent 3 — Ingestion (8 tests)
✅ robots · ✅ concurrency (1/domain) · ✅ openai-embed (Cohere/Bedrock EU/1024) · ✅ inline-embed (batch) ·
✅ utc (Europe/Berlin) · ✅ enum-redef (import from @agora/db) · ✅ dedup (onConflict) · ✅ scope-rank (Agent 5)

### Agent 4 — Auth & Profile (8 tests)
✅ clerk-matcher (`/__clerk/(.*)`) · ✅ svix (verifyWebhook) · ✅ pii (data minimization) ·
✅ input-type (search_query) · ✅ erasure (Phase 1) · ✅ client-userid · ✅ region (EU) · ✅ scope-deck (Agent 5)

### Agent 5 — Matching (8 tests)
✅ llm-eligibility (pure TS) · ✅ ui-filter (query layer) · ✅ rerank-model (Haiku) · ✅ l2-ops (cosine) ·
✅ skip-hardfilter (step 1 mandatory) · ✅ scope-generate (Agent 6) · ✅ enum · ✅ drift-hide (query layer)

### Agent 6 — Generation & Lifecycle (8 tests)
✅ auto-submit (**Mode 3 banned**) · ✅ skip-approve (approved→submitted only) · ✅ pii-docs (placeholders) ·
✅ model-swap (Sonnet=gen/Haiku=eval) · ✅ audit · ✅ skip-eval (the quality claim) · ⚙ jobid (idempotent) · ✅ scope-screen (Agent 7)

### Agent 7 — Frontend (8 tests)
✅ db-in-component · ✅ auto-submit-ui (user submits) · ✅ llm-in-component · ✅ raw-fetch (tRPC client) ·
✅ edit-router · ✅ desktop (mobile-first) · ✅ ticks (real filter state) · ⚙ newtab (noopener)

### Agent 8 — Payments (8 tests)
✅ bss-gate (**no billing pre-funding**) · ✅ raw-body (constructEvent) · ✅ client-quota (server-side) ·
✅ store-card (Stripe IDs only) · ✅ schema-edit (Agent 2 owns schema) · ⚙ apiversion (pinned) ·
⚙ flag-off-call (no Stripe call when off) · ✅ scope-ui (screen→Agent 7) *(after F-1 fix)*

---

## The legal/compliance tests are the ones that matter most

Three tests guard the project's top risks — run these first, every time the relevant agent changes:
- **Agent 6 `auto-submit`** — a server-side submitter is the permanently-banned Mode 3 (EU legal + account bans).
- **Agent 6 `skip-approve`** — `submitted` only from `approved` via explicit user action.
- **Agent 8 `bss-gate`** — billing dark until BSS funding (~Mar 2027), or BSS eligibility breaks.

If any of these three regress, do not ship the agent.

---

## Verdict

- **Coverage:** 64/64 adversarial vectors have an explicit defense in the specs.
- **Structural integrity:** 1 real cross-agent ownership conflict found and fixed (F-1); 1 documented
  carve-out noted (F-2). The 8 agents now have clean, non-overlapping boundaries.
- **Next:** run the live harness (README) to confirm model adherence — prioritize the ⚙ execution
  tests and the three legal/compliance tests above.
