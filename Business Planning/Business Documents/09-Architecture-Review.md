# Architecture Review & Finding Log
**Project:** Agora Jobs · **Document:** REV-001 · **Version:** 1.0  
**Status:** Complete · **Date:** 2026-06-08 · **Reviewer:** Senior Solution Architect (independent review)  
**Scope:** All eight business documents (01–08), pressure-tested against the source planning material in `../`.

---

## Table of Contents
1. [How This Review Was Done](#1-how-this-review-was-done)
2. [Overall Verdict](#2-overall-verdict)
3. [Finding Summary (all severities)](#3-finding-summary-all-severities)
4. [Critical Findings](#4-critical-findings)
5. [High Findings](#5-high-findings)
6. [Medium Findings](#6-medium-findings)
7. [Low Findings](#7-low-findings)
8. [Open Decisions for the Founders](#8-open-decisions-for-the-founders)
9. [What I Did NOT Change (and why)](#9-what-i-did-not-change-and-why)
10. [Sign-off Checklist](#10-sign-off-checklist)

---

## 1. How This Review Was Done

I read all eight drafted documents (01–08) and the underlying source notes (`v1-project-scope.md`, `werkstudent-match-story-walkthrough.md`, `Agora-Jobs-Tech-Stack.md`, `Agora-Jobs-Cost-Estimate.md`, `competitor-analysis.md`, `agora-brand-marketing-playbook.md`, `employer-side-scope.md`, `werkstudent-founder-roadmap.md`). I checked each document for:

- **Internal consistency** — does a doc contradict itself?
- **Cross-document consistency** — do the eight docs agree on figures, dates, scope, stack?
- **Source fidelity** — do the docs match the binding source decisions (and where the sources disagree, is the right one chosen)?
- **Architectural soundness** — would the architecture actually deliver the product without violating its own constraints?
- **Cost/latency realism** — do the NFR targets survive contact with the chosen technology?
- **Legal/compliance integrity** — does the GDPR-first, no-Mode-3 posture hold throughout?
- **Completeness** — what required requirements are missing?

The posture was **independent challenge**: where a decision was weak, I argued against it and changed it, even when that overturned something already written. Severity legend: **Critical** (must fix before relying on the doc — correctness or legal), **High** (materially wrong or load-bearing), **Medium** (real gap, lower blast radius), **Low** (polish).

Every change was applied **in place** in documents 01–08; this memo is the audit trail.

---

## 2. Overall Verdict

The suite was **structurally strong but contained four defects that made it unsafe to rely on as written** — one of which (a server-side application submitter) directly contradicted the project's load-bearing legal decision, and three of which were factual/figure errors in the fundability story (BSS amounts, revenue timeline, cost model).

After this revision, the suite is internally consistent and defensible. The single most important fix: **the architecture no longer describes a bot that submits applications.** That alone was worth the review — it was a latent contradiction that would have either misled an engineer into building the one thing the product forbids, or undermined the document's credibility with a technical reader or grant reviewer.

The most valuable *remaining* action is on the founders, not the documents: **six open decisions** (§8) need answers — chiefly Clerk-vs-Auth.js and the free-tier shape — because they change both cost and implementation.

---

## 3. Finding Summary (all severities)

| ID | Severity | Finding (one line) | Status |
|----|----------|--------------------|--------|
| F-C1 | Critical | Architecture had a server-side "auto-apply" worker that *submits* — that is the permanently-banned Mode 3 | ✅ Fixed |
| F-C2 | Critical | BSS figures wrong (€1,500+€300 / €21,600) and revenue ramp started before BSS funding | ✅ Fixed |
| F-C3 | Critical | Financial Model's Year-1 revenue (~€1,576) contradicted the BRD/source (€3,281–€14,737) | ✅ Fixed |
| F-C4 | Critical | Embedding model unspecified; vector dim 1536 ≠ Cohere v3 (1024); EU residency unaddressed | ✅ Fixed |
| F-H1 | High | Opus 4.8 for generation breaks the <€0.10/app and <60s targets | ✅ Fixed → Sonnet |
| F-H2 | High | Clerk EU residency needs Business tier; Stage-1 cost underbudgeted it | ✅ Fixed + OD-1 |
| F-H3 | High | GDPR sub-processor register incomplete (missing Langfuse, Resend, Browserbase/Apify) | ✅ Fixed |
| F-H4 | High | PII redaction was regex-only — over-redacts ("POSTGRES") and under-redacts real IDs | ✅ Fixed (data-min primary) |
| F-H5 | High | PWA-vs-native + phase/milestone timeline contradictions | ✅ Fixed |
| F-H6 | High | Employer requirements at MUST priority despite being a month 13–18 feature | ✅ Fixed → FUTURE |
| F-H7 | High | "Month N" never anchored to the real BSS calendar; multiple timing contradictions | ✅ Fixed (Timeline Anchor) |
| F-M1 | Medium | No idempotency requirement for queue workers (retry → duplicate side effects) | ✅ Fixed |
| F-M2 | Medium | Free-tier "5/month" quota was invented, unenforced, and contradicted source "Mode 1 always free" | ✅ Fixed + OD-2 |
| F-M3 | Medium | Object-storage drift (R2 in walkthrough vs Scaleway/S3 in stack) | ✅ Standardized + OD-3 |
| F-M4 | Medium | Two eval layers (runtime Haiku gate vs Promptfoo CI) conflated | ✅ Clarified |
| F-M5 | Medium | Infra cost claim "€50/mo" vs itemized "€120–350" | ✅ Reconciled |
| F-M6 | Medium | Legal figure inconsistency: 140-day (product) vs 120-day (founder roadmap) | ✅ Flagged for legal sign-off |
| F-M7 | Medium | No backups/DR requirement (Neon PITR, storage versioning) | ✅ Fixed |
| F-M8 | Medium | Pricing inconsistency (€4.99 vs €5.99 vs experiment cohorts) | ✅ Standardized |
| F-L1 | Low | UI internationalization not specified | ⚠️ Recommended (not applied) |
| F-L2 | Low | Accessibility (a11y) not mentioned | ⚠️ Recommended (not applied) |
| F-L3 | Low | "€9k MRR Year 2" stated as average, not exit rate | ✅ Fixed |

---

## 4. Critical Findings

### F-C1 — A server-side application submitter contradicts the permanent Mode-3 ban
**Where:** ARD AR-DF-04, the system-context diagram, the worker list; TRD §6.2 "Apply Worker"; Implementation Plan Phase 4 "Auto-Apply Engine".

**The problem.** The product documents (BRD BR-REV-01, PRD §9, and both source scope docs) state that Mode 3 — automated submission without the user — is *permanently* out of scope, for EU-legal and account-ban reasons. Yet the architecture described a Playwright worker that, once an application is `approved`, "opens portal → fills form → **submits**" and the Implementation Plan's Phase 4 was literally titled "Auto-Apply Engine" with the exit criterion "approved applications **auto-submit** to 3+ portals." That *is* Mode 3. The "human approval gate" framing did not save it: approving content and then having a server bot submit it is still automated submission.

**Why it matters.** This is the project's stated #1 legal risk, baked into the architecture. An engineer following the TRD/Implementation Plan would have built exactly the capability the product forbids — and a sharp grant reviewer or investor's technical advisor would have caught the contradiction and questioned the team's rigor.

**Resolution (applied).** Submission is now unambiguously **client-side**: Mode 1 (user downloads and submits manually) and Mode 2 (the browser *extension* autofills in the user's own browser; the user clicks the company's own Submit). Server-side Playwright is restricted to **job ingestion**. The backend only (a) gates the `approved → submitted` transition via a client-initiated `markSubmitted` mutation, and (b) writes the append-only audit row. ARD AR-09/AR-10/AR-11/AR-11a, TRD TR-25/TR-26/TR-26a, and Implementation Plan Phase 4 ("Assisted Submission & Tracking") were rewritten accordingly; milestone M2 was renamed.

---

### F-C2 — BSS funding figures wrong and revenue starts before the grant
**Where:** Financial Model §1.2, §7.1–§7.3, §9; BRD BO-05, A-05, BR-REV-02.

**The problem.** The Financial Model stated BSS as "€1,500/month + €300/co-founder, €21,600 total over 12 months." The founder roadmap is explicit: BSS is **€2,500 per founder per month** (€5,000 for two, €7,500 for three), 6–12 months, funding starting **~March 2027**. Separately, the revenue model began billing at "Month 5," which — on any reading where the project starts in 2026 — falls *before* BSS funding, violating the binding rule that there be **no economic activity before the grant is funded**.

**Why it matters.** This is a funding document. Understating the grant by ~3× and showing revenue that the eligibility rules prohibit are exactly the errors that sink a BSS application's credibility and mislead the founders' own runway planning.

**Resolution (applied).** §7.1 corrected to €2,500/founder/month (up to €60,000 for two founders over 12 months) with the correct conditions (professor mentor from a consortium university, since UE Berlin is not in it). A **Timeline Anchor** (§1.2) maps every financial event to the real calendar; "Year 1/Year 2" now explicitly mean *monetization* years (billing live ~Q2 2027). Runway re-framed (BSS is personal living stipend; company infra is the only real burn). BRD BO-05/A-05/BR-REV-02 and the risk figures aligned.

---

### F-C3 — Two of our own documents disagreed on revenue
**Where:** Financial Model §3 vs BRD §7.3 (and the source walkthrough §10).

**The problem.** The BRD used the canonical projections (Y1 €3,281 / €5,304 / €14,737; Y2 €31,130 / €58,050 / €147,761). The Financial Model independently invented a *different* ramp ending at ~€1,576 for Year 1 — and even listed that same €1,576 under both "Conservative" and "Expected," which is internally broken.

**Why it matters.** A reader comparing the two documents sees the project contradict itself on its headline numbers. Trust evaporates.

**Resolution (applied).** Financial Model §3 now carries the **single canonical projection** (MRR snapshots + annual totals) identical to the BRD and source, with a reconciliation note. There is now one revenue truth across the suite.

---

### F-C4 — Embedding model unspecified; vector dimension wrong; EU residency unaddressed
**Where:** TRD schema (`vector(... 1536)`), ARD AI/Data layers.

**The problem.** Matching depends on embeddings, but no document named the embedding model or where it runs. The schema hard-coded **1536 dimensions** (an OpenAI-family size), while the source intended **Cohere embed-multilingual-v3**, which is **1024** dimensions. And under a hard EU-residency constraint, the *embedding* call must also stay in the EU — which was never stated.

**Why it matters.** A 1536-vs-1024 mismatch is a build-breaker (the column won't accept the vectors). An embedding call to a US endpoint is a GDPR breach as surely as an LLM call would be.

**Resolution (applied).** Standardized on **Cohere Embed Multilingual v3 via AWS Bedrock `eu-central-1` (1024-dim)** (ARD AR-35a, TRD `EMBED_MODEL` + schema → 1024). Added OAQ-01 to verify availability in `eu-central-1` at build time, with an explicit instruction to change model and dimension *together* if it is unavailable (OD-4).

---

## 5. High Findings

### F-H1 — Opus 4.8 for generation breaks the cost and latency NFRs
Generation was specified as **Claude Opus 4.8** while the NFRs demand **< €0.10/application** and **< 60s**. Opus output pricing (~$75/Mtok) puts a single CV+cover-letter generation at **~€0.25–0.35** — over 3× the budget — and Opus is the slowest model. The Financial Model even listed "Opus generation ~$0.04–0.08," which is impossibly low for Opus. The source walkthrough actually specified **Sonnet** for generation; the drafts had silently "upgraded" to Opus and broken the economics.
**Resolution (applied):** Sonnet 4.x for generation, Haiku for volume/eval, **Opus offline-benchmarking only** (ARD AR-34, TRD `MODELS` + TR-11a, Financial §4.2 recomputed to ~€0.055–0.095 happy path, PRD NFR-01/NFR-09, Implementation Plan 0.7 + cost-control track).

### F-H2 — Clerk EU residency is a Business-tier feature
EU data residency on Clerk requires the **Business** plan (~$100+/mo + per-MAU), not Free/Pro — but Stage-1 costs budgeted Clerk at "$0–25." Either budget Clerk Business or self-host Auth.js (the documented fallback).
**Resolution (applied):** ARD AC-07 + OAQ-02; TRD stack note; Financial §5.1 raised the fixed subtotal and showed the Auth.js alternative (~$95–355/mo). Final choice is **OD-1**.

### F-H3 — GDPR sub-processor register was incomplete
The register listed 9 processors and omitted **Langfuse** (stores prompt/output payloads = redacted CV content), **Resend** (email + names), and **Browserbase/Apify** (processes scraped job data). An incomplete RoPA is itself a compliance finding.
**Resolution (applied):** ARD §6 register completed (13 processors), Langfuse flagged EU-host/self-host, AR-57 requires DPAs with *every* processor; Implementation Plan 7.2 updated.

### F-H4 — PII redaction was regex-only and unsafe in both directions
The pattern `[A-Z0-9]{8,9}` would redact legitimate CV tokens (**POSTGRES**, **FRONTEND** are 8 uppercase chars) while missing real identifiers in other formats. Relying on it as the primary control is unsafe.
**Resolution (applied):** Reframed so **data minimization is the primary control** — passport/visa/ID numbers are never stored as free text and never enter the generation context; the eligibility engine consumes derived values only. Regex is now explicit defense-in-depth, with anchored patterns and **negative tests** proving legitimate tokens survive (ARD AR-36a, AR-06; TRD TR-13a/TR-13/TR-14/TR-15).

### F-H5 — PWA-vs-native and milestone-timeline contradictions
V1 is a **PWA** per the scope, but the Implementation Plan put a native Expo app at "Month 5" while the PRD/scope said native is "Year 2." The paid tier actually depends on the **extension** (Mode 2), not a native app.
**Resolution (applied):** V1 = PWA; native app = Year 2 (milestone M6, Phase 5 marked deferred); **extension prioritized** as the V1.5 build. Implementation Plan §1.1, §2, Phase 5/6 updated.

### F-H6 — Employer requirements were MUST despite being 18 months out
BR-12…BR-17 carried **MUST** priority, which in a requirements document signals a V1 commitment — but the employer product is Phase 5 (month 13–18).
**Resolution (applied):** Reclassified to **FUTURE (Phase 5)** with an explanatory note (BRD §6); traceability preserved.

### F-H7 — Relative "Month N" was never anchored; timing contradicted itself
"Month 4," "Month 6," "month 18" appeared everywhere with no defined start, and the sources themselves disagreed (BSS at "month 4–5" vs "months 7–9"; payments "month 4" vs BSS-gated).
**Resolution (applied):** A single **Timeline Anchor** (Financial §1.2, Implementation Plan §2.1) maps build-months to the BSS calendar (application Oct 2026 → funding ~Mar 2027 → billing ~BSS month 3). All dependent figures re-pointed to it.

---

## 6. Medium Findings

| ID | Finding & Resolution |
|----|----------------------|
| F-M1 | **Idempotency** absent for BullMQ (at-least-once) workers → retries could double-generate, double-audit, double-notify. Added ARD AR-43a, TRD TR-24a/TR-26a, Implementation Plan sequencing rule + tasks 4.4/4.6. |
| F-M2 | The **free-tier "5 applications/month"** was invented in the cost draft, had no enforcement, and contradicted the source's "Mode 1 always free." Reframed: free/paid boundary is Mode 1 (free, generous) vs Mode 2 + premium (paid); any free cap is anti-abuse only, server-enforced, value TBD (PRD FR-22a, TRD TR-31a, Financial §2.1). Final shape is **OD-2**. |
| F-M3 | **Object storage drift** — walkthrough said Cloudflare R2, stack said Scaleway/S3. Standardized on **Scaleway/S3 eu-central-1** (R2 noted as alternative). Final pick is **OD-3**. |
| F-M4 | **Two eval layers conflated.** Clarified: (a) runtime quality gate (Haiku judge, per application) vs (b) Promptfoo CI regression (per prompt change). ARD AR-38, TRD §5.3/§8. |
| F-M5 | **Infra cost** "€50/mo" (walkthrough) vs "€120–350" (cost estimate). Reconciled on the itemized figure; €50 marked an unachievable floor (Financial §5.1). |
| F-M6 | **Legal figure** 140-day (product) vs 120-day (founder roadmap). Product keeps 140/280 (current law) but it now requires **immigration-lawyer sign-off** before launch — the moat depends on it (BRD A-07/OQ-05, ARD OAQ-05). |
| F-M7 | **Backups/DR** unspecified. Added Neon PITR + object-storage versioning + tested restore, with erasure reaching backups (ARD AR-58, TRD TR-36a, Implementation Plan 7.9). |
| F-M8 | **Pricing** €4.99 vs €5.99 vs experiment. Standardized: three-cohort €4.99/€6.99/€9.99 experiment; **€5.99 planning midpoint** (Financial §2.1, BRD, GTM). |

---

## 7. Low Findings

| ID | Finding | Status |
|----|---------|--------|
| F-L1 | **UI i18n** not specified — the app serves non-German, often limited-German users; the *interface* language strategy (not just document output) should be stated. | ⚠️ Recommended — not yet applied; add an NFR if you want it in scope for V1. |
| F-L2 | **Accessibility (a11y)** not mentioned for a consumer app. | ⚠️ Recommended — add a WCAG-AA target NFR if desired. |
| F-L3 | "**~€9k MRR Year 2**" was phrased as an average; it is an **exit rate**. | ✅ Fixed (BRD BO-04, Financial §3). |

I left F-L1/F-L2 unapplied because they introduce *new V1 scope* — that is your call, not a correctness fix. Flag them in if you want them.

---

## 8. Open Decisions for the Founders

These are genuine either/or choices that change cost or implementation. I applied a conservative default in-doc where needed, but you should decide:

| ID | Decision | Options | My recommendation |
|----|----------|---------|-------------------|
| **OD-1** | Auth provider for EU residency | (a) Clerk **Business** (~$100+/mo, fastest) · (b) self-host **Auth.js** on EU Postgres (~$0 + eng. time) | Start on **Clerk Business** for speed; revisit Auth.js at scale. But if grant cash is tight pre-funding, Auth.js avoids a fixed bill. Resolve before Phase 1. |
| **OD-2** | Free-tier shape | (a) **uncapped** generous free (max growth, higher LLM cost) · (b) generous + **anti-abuse soft cap** (e.g. N/month) | (b) with a *high* cap (protect against abuse without dulling the growth lever Sorce proved). Pick N from beta cost data. |
| **OD-3** | Object storage | Scaleway · AWS S3 eu-central-1 · Cloudflare R2 (no egress) | **Scaleway or S3** (cleanest EU jurisdiction). R2 is fine if egress cost matters; verify EU jurisdiction lock. |
| **OD-4** | Embedding model if Cohere v3 not in `eu-central-1` | Alternative EU-resident bilingual model | Verify in Phase 0; if absent, pick the best EU bilingual model available and set the vector dim to match (do not default to 1536). |
| **OD-5** | Keep Opus for a premium "deep" generation tier? | (a) Opus offline-only (current) · (b) optional Opus-backed premium generation at higher price | (a) for V1 — keep the hot path on Sonnet. Revisit only if users will pay a premium that covers Opus economics. |
| **OD-6** | Standard Pro price | €4.99 / €5.99 / €6.99 (decided by the cohort experiment) | Let the experiment decide on conversion × retention; **€5.99** is the planning midpoint until then. |

---

## 9. What I Did NOT Change (and why)

- **The core product thesis, personas, feature set, and competitive positioning** — these were sound and well-evidenced; I only hardened consistency around them.
- **The TypeScript/Bedrock "recommended baseline" stack** — I kept it over the walkthrough's older Python/FastAPI/Sonnet-via-LiteLLM/Cohere/R2 stack, because the tech-stack doc is the later, explicitly-labelled baseline and the rest of the architecture assumes it. (I did adopt the walkthrough's correct *generation-model* and *embedding-model* choices, which the baseline had gotten wrong.)
- **The 6-dimension eval methodology and the "beat ChatGPT on German ATS" moat** — strong and publishable; left intact.
- **F-L1/F-L2 (i18n, a11y)** — these add V1 scope rather than fix an error; your decision.
- **The §8 sensitivity table's illustrative user counts** in the Financial Model — directional only; not load-bearing now that §3 carries the canonical numbers.

---

## 10. Sign-off Checklist

Before treating this suite as the authoritative baseline, confirm:

- [ ] **OD-1 decided** (Clerk Business vs Auth.js) — unblocks Phase 1 and the cost model.
- [ ] **OD-2 decided** (free-tier cap or not, and the value).
- [ ] **OD-3/OD-4 decided** (storage; embedding fallback) at Phase 0.
- [ ] **OAQ-01 verified** — Sonnet, Haiku, and Cohere v3 model IDs + embedding dimension confirmed in `eu-central-1`.
- [ ] **OQ-05 / legal sign-off** — confirm 140-day (vs 120) with an immigration lawyer; the moat depends on it.
- [ ] **BSS numbers** in the Financial Model re-checked against the current science-startups.berlin batch terms (amounts and duration change).
- [ ] **No server-side submitter** is enshrined as a code-review gate and a pen-test item (F-C1 must not creep back in).
- [ ] **DPAs** initiated with all 13 sub-processors before any real user data.
- [ ] Founders agree the **revenue projections (§3)** are the single canonical set cited everywhere.

---

*This review is advisory and was performed against the documents and source notes as they stood on 2026-06-08. Re-run a lighter version of it whenever the stack, the funding terms, or the legal rules change — those are the three areas where this suite will drift first.*
