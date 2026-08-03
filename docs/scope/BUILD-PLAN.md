# Build Plan — Agora Jobs

**Purpose of this document:** the single place that says "what do we build, in what order, who/what does it, and how do we know it's not making things up." Source of truth for scope is [PROJECT-SCOPE.md](PROJECT-SCOPE.md). Ignore any root-level docs about "credential recognition" / "Brücke" — that's a different, unbuilt idea that got mixed into this repo; it is not part of this plan.

**Status of the existing code (audited 2026-08-04):** this repo already has real, working code — not scaffolding. Keep it. Specifically:
- `apps/web` — resume builder, CV generation, applications tracker, onboarding, Stripe pricing, with tests.
- `packages/db` — real schema + migrations (users, jobs, applications, resumes, subscriptions).
- `apps/workers` — real scrapers for BA Jobsuche + Arbeitnow already running.
- Missing/needs work: Greenhouse/Ashby/Recruitee scraping exists only as a throwaway prototype script, never wired into the real app. That's real next work, not a redo.
- 63 files have uncommitted local changes as of this audit — commit or review those before any repo cleanup happens.

---

## 1. The order a company actually builds this in, and why

Software teams don't build screen-by-screen in isolation — data and backend come before UI because the UI has nothing to show without them. The order below is standard practice for this kind of product (data-driven, AI-assisted, subscription SaaS):

1. **Data layer first** — job scraping/ingestion + database. Nothing else works without jobs to show.
2. **Backend/API second** — the logic that reads that data, matches jobs to a user, and later drives applications.
3. **Auth + core frontend screens third** — once there's real data to display, build the screens against it (not against fake/mock data that has to be redone later).
4. **AI features fourth** — résumé tailoring, cover letters, scoring — these need the data layer and a user profile to work against.
5. **Payments last, before launch** — Stripe/credits; wire it once the product actually delivers value worth paying for.
6. **Security, monitoring, deployment — run alongside every phase, not bolted on at the end.**

This matches what's already in the repo: DB schema and scrapers exist (Phase 1 done), web app screens exist (Phase 3 partially done), AI/billing packages exist but are thin (Phase 4/5 not done). So we're not starting at zero — we're mostly finishing Phase 1, then doing Phase 4 and 5 properly.

---

## 2. Phases, in order

### Phase 0 — Repo hygiene (days, not weeks)
- Commit or discard the 63 pending changes (your call, but do this before anything else).
- Archive (don't delete) the credential-recognition docs into `docs/archive/` so they stop confusing future work, without losing them.
- This BUILD-PLAN.md and PROJECT-SCOPE.md become the only scope references anyone (human or AI) reads.

### Phase 1 — Job data pipeline (finish what's started)
- BA Jobsuche + Arbeitnow scrapers: already running — verify they're populating `packages/db` with real, current Berlin postings (count them — this answers "do we have enough jobs").
- Port the Greenhouse/Ashby/Recruitee prototype (`docs/DataMining Info/job-explorer/`) into `apps/workers` as real scheduled jobs, not a one-off script.
- Add Adzuna/Jooble/Talent.com as backfill (self-serve API keys, low effort).
- **Exit test:** query the database, get a real number of live Berlin jobs across student → senior roles. That number is the actual "are we launch-ready on volume" answer — not a guess.

### Phase 2 — Backend / matching logic
- Job-to-résumé match scoring (percentage + plain-language reason).
- tRPC routers for jobs, applications, deck (some already exist in `apps/web/src/server/routers` — extend, don't rewrite).
- This is where the "why did this job match me" explanation logic lives.

### Phase 3 — Frontend screens (auth → payment), in order
Build in the order a user actually walks through the product, each screen against real backend data:
1. Auth (sign up / login / verify)
2. Onboarding (résumé upload, profile, work-authorization status)
3. Job feed / swipe deck (already scaffolded — `SwipeDeck.tsx`, `JobCard.tsx`)
4. Job detail + match explanation
5. Résumé/cover-letter tailoring + the score panel + diff view (the trust core — see PROJECT-SCOPE.md §3.2)
6. Application queue + "needs you" queue
7. Applications tracker / pipeline view (already scaffolded)
8. Dashboard (already scaffolded)
9. Settings / profile
10. Payment / checkout (Stripe — `packages/billing` exists, thin — build out last, once everything above works end to end for a free-tier user)

### Phase 4 — AI features
- Résumé/cover-letter generation (tailored per job) — `packages/ai` exists, thin.
- Score panel (ATS parsability, job match, content quality, structure) — new work, per PROJECT-SCOPE.md §3.2.
- Interview coaching (face-to-face simulation, question prediction) — new, separate module; do this after core apply-flow works, not before (per PROJECT-SCOPE.md's phase order, this is a Phase 3-equivalent retention feature, not launch-blocking).

### Phase 5 — Payments + launch hardening
- Stripe checkout, credit system, subscription tiers.
- Security pass (see Section 4 below).
- Deploy to staging, then production.

---

## 3. Roles/skills this actually needs (and how to think about "agents")

A real company building this would have these functions. You don't need to hire all of them — one person (you, with AI help) can cover several — but naming them clarifies what kind of work each phase needs:

| Role | What they do here | Which phase |
|---|---|---|
| **Data engineer** | Scrapers, job normalization, dedup, the database schema | Phase 1 |
| **Backend engineer** | Matching logic, tRPC APIs, application-submission logic | Phase 2 |
| **Frontend engineer** | The screens, in the order in Section 2 | Phase 3 |
| **AI engineer** | Résumé tailoring, scoring, interview coach | Phase 4 |
| **Payments/billing engineer** | Stripe integration, credit accounting | Phase 5 |
| **Security reviewer** | Checks every phase for leaked secrets, injection risks, auth holes | Every phase |
| **QA/tester** | Walks every screen end to end before it's called "done" | Every phase |

**On the "manager + Fable 5 + Opus 5 + exit at 70% tokens" idea specifically:** those exact mechanics don't exist as real safety controls (there's no token-percentage kill-switch, and model choice alone doesn't prevent mistakes). What *does* work, and what I'd actually set up when we start building in Claude Code:
- **A coordinator that plans and assigns work** to specialized subagents (backend, frontend, data, security) — this is a real, working feature here (the `Agent` tool with different subagent types).
- **A verification step after each subagent's work** — a second agent (or the same coordinator) re-checks the claim/code against the actual files before marking it done, instead of trusting the first answer. This is the real fix for the hallucination worry.
- **A token/cost budget per phase** you set explicitly, and I stop and check with you before blowing past it — this is a real, working guardrail (unlike the 70% idea, which isn't a mechanism that exists).

When we're ready to actually start building in this session, I'll set this up for real and explain each piece as it's used — no jargon assumed.

---

## 4. Security posture (baked in from day one, not bolted on)

- **Secrets never in git.** Already true — verified no leaked keys in this repo's history. Rule going forward: all keys live in `.env.local` (gitignored) or the cloud provider's secret manager, never in a commit. I'll check this before every commit that touches config.
- **`.env.example` files** document what a key *is*, never its real value — already the pattern here, keep it.
- Auth, payment, and any endpoint touching personal data get a security pass before launch (input validation, rate limiting, no SQL/prompt injection paths).
- GDPR posture (already decided in PROJECT-SCOPE.md §8.3): EU hosting, export/delete, zero training on user data.

---

## 5. Rough timeline

Timelines below assume one person + AI-assisted development, part-time-to-full-time — not a funded team sprint. Treat these as planning order, not committed dates; each phase's actual length depends on how much time you can put in per week.

| Phase | What "done" looks like | Rough effort |
|---|---|---|
| 0. Repo hygiene | Old work committed, docs archived, this plan is the reference | 1–2 days |
| 1. Job data pipeline | Real job count in the DB, Greenhouse/Ashby/Recruitee live, backfill APIs connected | 1–2 weeks |
| 2. Backend/matching | Match scoring + explanation working against real jobs | 1–2 weeks |
| 3. Frontend screens | Auth → tracker walkable end to end with real data (no payment yet) | 3–5 weeks |
| 4. AI features | Tailoring + score panel + diff view working, interview coach stubbed or built | 2–4 weeks |
| 5. Payments + hardening | Stripe checkout live, security pass done, deployed to production | 1–2 weeks |

Total: roughly **2–3.5 months** at a steady solo-plus-AI pace, assuming no major scope changes. This is a plan to re-check against reality every couple of weeks, not a fixed deadline.

---

## 6. What I need from you, and when

I'll ask for these as we hit each phase — you don't need to prepare anything now:
- **Phase 0:** a yes/no on committing vs. discarding the 63 pending file changes.
- **Phase 1:** confirmation of which cloud/hosting account to point the scrapers and DB at (you mentioned you already have accounts — I'll ask which ones when we get there).
- **Phase 3:** your call on visual design direction for screens (I'll show options, not guess).
- **Phase 5:** your Stripe account details (test mode first, always).
- **Any point:** if I'm about to do something hard to reverse (delete files, push to a shared branch, spend real money on a paid API), I stop and ask first — that's a standing rule, not phase-specific.

---

## 7. Next immediate action

Everything above is planning. The next concrete step, when you're ready, is Phase 0: decide what to do with the 63 uncommitted files in the "Agora Jobs" repo. Say the word and we'll look at them together (I'll summarize what changed, you decide keep/discard) — that unblocks everything else.
