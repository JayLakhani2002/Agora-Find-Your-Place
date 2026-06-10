# Repository Health Audit — 2026-06-10

**Scope:** full repo, all agent work (Agents 1–5 implemented, 6–8 pending).
**Method:** CI history + local quality gates (typecheck, lint, 424 tests, prod build) + knowledge-graph analysis (1,021 nodes / 2,136 edges over code + Business Planning corpus).
**Verdict: GO — architecture is sound, proceed to Agent 6 after the action items below.**

---

## Health dashboard

| Metric | Value | Status |
|---|---|---|
| CI (main) | green (after fix `30963b7`) | 🟢 |
| Typecheck (web + workers) | 0 errors | 🟢 |
| Lint (biome, 112 files) | 0 errors | 🟢 |
| Unit tests | 424 passing (374 legal, 50 web; + workers suites) | 🟢 |
| Production build | passes, ~25s, 6 routes | 🟢 |
| Module-scope clients / `env!` asserts / missing SIGTERM | none found | 🟢 |
| GDPR cascade delete (users → 5 tables) | verified in SQL migrations | 🟢 |
| EU residency (Bedrock eu-central-1, Vercel fra1) | verified in code + config | 🟢 |
| Mode-3 ban enforcement | verified end-to-end | 🟢 |
| Observability (errors/metrics/alerts) | none wired | 🔴 |

## Findings (ranked)

1. **CI was red — fixed.** Stress-test fixture used `as const` → `readonly []` vs `string[]` type error that local tests + lint didn't catch. Fixed in `30963b7`. Root cause is finding 2.
2. **Typecheck blind spot.** Only `apps/web` and `apps/workers` define `typecheck` scripts. `packages/legal`, `db`, `ai`, `ui`, `config` are never directly typechecked; package test files escape all checking. **Action:** add `"typecheck": "tsc --noEmit"` to each package.
3. **Stale docs describe banned features.** `Tech Stack/IMPLEMENTATION.md` and `Tech Stack/Agora-Jobs-Implementation-Plan.md` still instruct Claude **Opus** for generation (banned — Sonnet 4.x only) and a **Playwright auto-apply worker** (Mode 3 — permanently prohibited). Code is correct (`ClaudeModel = "sonnet" | "haiku"`); docs predate the rules. **Action:** add SUPERSEDED banners pointing at `CLAUDE.md` + ADRs.
4. **Zero observability.** Acceptable pre-deploy; should land with Agent 1's deployment work (Sentry EU + structured logs for MVP).

## Per-agent scorecard

| Agent | Deliverables | Verdict |
|---|---|---|
| 1 — Infra | Turborepo, CI, tRPC skeleton, Vercel fra1, middleware | ✅ Complete; safety rules followed everywhere |
| 2 — Schema | 9 tables, 2 migrations, HNSW+cosine, cuid2, FK cascades | ✅ Complete |
| 3 — Ingestion | 3 scrapers → normalizer → 8 classifiers → dedup upsert → Cohere embed | ✅ Complete |
| 4 — Auth/Profile | Clerk + JIT provisioning, onboarding wizard, PII-free CV extraction, GDPR erasure | ✅ Complete |
| 5 — Matching | Legal engine (374 tests), SQL hard filter, 4-step pipeline, Haiku rerank, swipe handoff | ✅ Complete; all 9 DoD items met |
| 6 — Generation | applications router, CV/cover-letter gen, 6-dim eval | ⬜ Not started (next); handoff seam in place |
| 7 — Frontend | deck UI, all screens | ⬜ Not started; `packages/ui` empty stub |
| 8 — Billing | Stripe behind BSS flag | ⬜ Not started (correctly gated) |

## Architecture assessment

- Build order follows the dependency spine (Infra → Schema → domain agents → Frontend → Billing); no agent scope violations found.
- Cross-cutting invariants (Mode-3 ban, EU residency, no-Opus, query-layer legal filtering) are enforced **in code**, not just docs.
- Known carve-out (Agent 5 writes `packages/db/src/queries/matching.ts` in Agent 2's package) remains documented and friction-free.
- Knowledge graph artifacts live in `graphify-out/` (gitignored, regenerable): `graph.html`, `GRAPH_REPORT.md`, `graph.json`.
