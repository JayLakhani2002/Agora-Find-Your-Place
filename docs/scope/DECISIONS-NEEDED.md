# Decisions Needed From Jay

**Created:** 2026-08-06 · **Goal 13 deliverable**

---

## DECIDED — 2026-08-06 (Jay)

| Q | Decision | Consequence |
|---|---|---|
| **Q1 Positioning** | **A — Demote, don't delete.** Global all-professions product by default; legal-eligibility engine becomes a conditional capability that activates when a user's situation makes it relevant. | Website copy rewrite (40+ refs). Backend `allowedVisaTypes` / `@agora/legal` **kept and preserved**. Bedrock use-case must be resubmitted with the new positioning. |
| **Q2 Pricing** | **A — Credits, pay-as-you-go.** | `packages/billing` rewrite: replace Free/Pro €9-per-month subscription with per-action credits. Credit price and pack sizes remain **TBD** — do not hardcode PROJECT-SCOPE's €19/€39/€79 until confirmed. |
| **Q5 Sequence** | **A — Fix the outage first**, then positioning, then features. | In progress. |
| **Q8 Git** | **A — Logical batches, then push.** | In progress. |

**Still open and blocking:** Q3 (needs your AWS console — see §Q3 update below), Q4 (depends on Q3), Q6 (Goal 18 scope), Q7 (GDPR export), Q9 (docs archival), plus everything in §4.

---

How to use this: invoke this file and we run it as an MCQ session, one question at a time, with my recommendation flagged on each. Nothing here is rhetorical — every question blocks real work, and the "Blocks" line says exactly what.

Existing question sets are **not duplicated here**. They remain authoritative in place:
- `docs/Database/INPUTS-NEEDED-FROM-JAY.md` — DB write-path test, Bedrock model IDs, dev branch, geographic scope, visa-filter liability
- `docs/Security/INPUTS-NEEDED-FROM-JAY.md` — RLS staging, KMS key, Stripe erasure vs §147 AO, Clerk session lifetime, AWS key rotation

§4 below cross-references the ones that have become urgent.

---

## Q1 — Positioning: what happens to the Germany/visa engine? ⭐ HIGHEST LEVERAGE

Goal 6 says remove the student/Germany framing. But that framing is the moat: 40+ site references, and working backend (`allowedVisaTypes` SQL filter, `@agora/legal`, visa regression tests). Competitors cannot copy it quickly.

- **A. Demote, don't delete** ✅ **RECOMMENDED** — global all-professions product by default; legal-eligibility engine becomes a capability that activates when a user's situation makes it relevant. Keeps the asset, loses the Berlin-only image.
- **B. Delete entirely** — fastest path to a clean global look; discards a real differentiator and orphans working code.
- **C. Keep Germany-first** — strongest wedge in one market; directly contradicts Goal 6.
- **D. Two surfaces** — global marketing site + region-aware app. Most work, cleanest story.

**Blocks:** Goals 3, 4, 6, the Goal 15 timeline, and the Bedrock use-case resubmission (§3.6 of the audit).

---

## Q2 — Which pricing model is real?

Three sources disagree, and the shipped code implements the one the docs say was replaced.

- **A. Credits, pay-as-you-go** ✅ **RECOMMENDED** — matches CLAUDE.md's stated decision, and per-action pricing tracks per-action model cost. Requires rewriting `packages/billing`.
- **B. €9/mo subscription** — already built and tested; zero work. Contradicts two documents.
- **C. Hybrid** — free allowance + credit top-ups. Most flexible, most billing complexity.

If A: are PROJECT-SCOPE's €19/100 · €39/250 · €79/600 final, or still TBD as CLAUDE.md claims?

**Blocks:** billing rewrite, pricing page, the website's Offer section.

---

## Q3 — Bedrock model access — ✅ ROOT CAUSE FOUND 2026-08-06

**Resolved by direct probe against the live account. No diagnostics needed from you — but one console action is.**

Invoking `eu.anthropic.claude-haiku-4-5-20251001-v1:0` in eu-central-1 as `AgoraBedrockWorker` returns:

> `ResourceNotFoundException: Model use case details have not been submitted for this account. Fill out the Anthropic use case details form before using the model.`

**The original brief was right: the website genuinely is the Bedrock gate.** The Anthropic use-case form is reviewed against your company site. `infrastructure/bedrock-use-case.json` holds prepared form text that was never successfully submitted or was never approved.

Two latent failures behind it were found and **already fixed** (2026-08-06):
1. `.env.example` shipped bare `anthropic.*` ids. Bedrock rejects these outright — 4.5-class models are inference-profile-only. Corrected to the `eu.` prefix.
2. `resolveModelId` accepted bare ids silently, so the failure only ever surfaced as a 500 on a real user's first generation. It now throws at resolve time naming the corrected id (`packages/ai/src/bedrock/claude.ts`, 4 regression tests).

**The one remaining action is yours:**
- **A. Resubmit the Anthropic use-case form** in the Bedrock console (eu-central-1) ✅ **RECOMMENDED** — but do it *after* the Q1 positioning rewrite lands, so the reviewed site matches the submitted text. Submitting the current student-in-Germany text against a soon-to-be-global site invites a mismatch rejection.
- **B. Submit immediately with existing text** — faster, but locks in the old positioning and risks review against a site that then changes.

**Note:** the IAM policy is sound — it already carries the `inference-profile/eu.anthropic.claude-*` ARN plus foundation-model ARNs across all six EU regions. Only the diagnostic action `bedrock:ListInferenceProfiles` is ungranted, which the app does not need.

**Blocks:** Goals 8 and 11. Now sequenced behind Q1.

---

## Q4 — Model routing tiers (Goal 8)

`packages/ai/src/bedrock/claude.ts:13` types models as `"sonnet" | "haiku"` only. Your constraints — not Fable for résumés (too expensive), not Haiku for résumés/cover letters (not capable enough) — cannot currently be expressed.

Proposed routing, pending Q3:

| Service | Model | Why |
|---|---|---|
| CV / résumé generation | Opus tier | Your constraint; quality-critical, low volume |
| Cover letter | Opus tier | Same |
| Sidebar chat (normal) | Haiku | High volume, latency-sensitive |
| Sidebar chat (deep analysis) | Sonnet | Balance |
| Deck rerank | Haiku | Already built this way; 30 calls/request |
| Interview coach (Goal 18) | Sonnet | Real-time latency ceiling |
| Classification / eval | Haiku | Volume |

- **A. Adopt as above** ✅ **RECOMMENDED**
- **B. Adjust** — tell me which rows and I'll re-cost it.

**Note:** CLAUDE.md names Opus 4.8 / Sonnet 4.6 / Haiku 4.5; the brief names Fable 5 / Opus 5; `.env.example` pins `claude-sonnet-4-6` and `claude-haiku-4-5`. Q3's diagnostics settle which IDs actually exist in your region — I will not hardcode a guess.

---

## Q5 — Order of work

- **A. Fix the outage first, then positioning, then features** ✅ **RECOMMENDED** — restores the core product, then unblocks the website fork, then builds new surface.
- **B. Website first** — matches the original brief; leaves generation broken meanwhile.
- **C. Parallel** — website and outage together. Feasible; splits attention.

---

## Q6 — Scope reality check on Goal 18

The live two-way video interview coach (real-time video, semantic answer grading, screen share) is a product in its own right, not a feature. Realistically several months and its own infra.

- **A. Defer; ship async mock interviews first** ✅ **RECOMMENDED** — text/voice practice with semantic grading captures most learning value in a fraction of the build, and de-risks the live version.
- **B. Build the live version now** — strongest marketing moment, largest cost, blocks everything else.
- **C. Demo-only prototype** — for BSS/investors, not production.

---

## Q7 — GDPR export (Art. 20)

Erasure exists; export does not. Goal 5's parity claim and EU compliance both need it.

- **A. Build it now** ✅ **RECOMMENDED** — small, self-contained, removes a real compliance gap.
- **B. Defer to pre-launch.**

---

## Q8 — Push the repo?

172 uncommitted files, 4 unpushed commits, one machine.

- **A. Commit in logical batches and push now** ✅ **RECOMMENDED**
- **B. One large checkpoint commit** — faster, worse history.
- **C. Leave it.** — not advisable.

---

## Q9 — Which docs get archived?

Most of `docs/` dates to June 2–17 and contradicts current work. `README.md` is empty.

- **A. Archive stale dirs to `docs/archive/`, leave the 5 current docs** ✅ **RECOMMENDED**
- **B. Delete outright** — git history retains them.
- **C. Leave as-is.**

---

## §4 — Escalated from the existing INPUTS-NEEDED files

Urgent now, decided in their home files:

1. **Visa filter liability** (Database §5.4) — 929 of 931 jobs have `allowed_visa_types IS NULL`, currently shown to everyone. Fail-open vs fail-closed is a legal posture question, and Q1 may change it entirely.
2. **RLS staging** (Security D) — needs three Neon roles created. ⚠️ Do not apply migration 0007 until `withUserContext` is wired; it is fail-closed and will break every user-scoped query.
3. **KMS key** (Security E) — encryption ships flag-off until a key exists in eu-central-1.
4. **Dev database branch** (Database §5.2) — only production Neon exists today. Tests currently have nowhere safe to run.
5. **AWS key rotation** (Security H) — long-lived `AKIA…` static key in use.
