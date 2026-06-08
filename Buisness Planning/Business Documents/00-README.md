# Agora Jobs — Business Document Suite
**Version:** 1.1 · **Date:** 2026-06-08 · **Status:** Draft (senior-architect reviewed)  
**Maintained by:** Founding Team

> **v1.1 revision:** All eight documents were pressure-tested in a senior-solution-architect review and revised in place. Every change is logged with rationale in **`09-Architecture-Review.md`** (read that first if you want to know what changed and why). Key corrections: no server-side application submitter (it would be the banned Mode 3); Sonnet — not Opus — for generation (cost/latency); corrected BSS figures (€2,500/founder/mo) and revenue timeline anchored to the BSS calendar; embedding model + dimension fixed; completed GDPR sub-processor register.

---

## What This Folder Is

This folder contains the formal business documentation suite for **Agora Jobs** — a mobile-first AI job platform for international students in Germany. These documents are synthesized from the source planning material in `../Buisness Planning/` and formatted to enterprise standards for use with co-founders, grant applications (BSS, EXIST), investors, and engineers.

The source documents in `../Buisness Planning/` are the working notes and remain untouched. This folder is the formalized, cross-referenced, shareable output.

---

## Document Register

| # | File | Title | Purpose | Key IDs |
|---|------|-------|---------|---------|
| 01 | `01-BRD-Business-Requirements.md` | Business Requirements Document | Defines the business problem, objectives, market, stakeholder requirements, revenue model, and constraints | BR-01 to BR-17, BR-REV-01 to BR-REV-04 |
| 02 | `02-PRD-Product-Requirements.md` | Product Requirements Document | Defines all product features, user personas, acceptance criteria, functional and non-functional requirements, and V1/V1.5/V2 phasing | FR-01 to FR-32, NFR-01 to NFR-09, AC-01 to AC-08 |
| 03 | `03-ARD-Architecture-Requirements.md` | Architecture Requirements Document | Defines architecture principles, constraints, system context, data flows, layer-by-layer requirements, EU data boundary, and architecture risks | AR-01 to AR-57, AR-DF-01 to AR-DF-04, AP-01 to AP-07 |
| 04 | `04-TRD-Technical-Requirements.md` | Technical Requirements Document | Defines technical requirements derived from the architecture, including full schema, API surface, AI pipeline, security, testing matrix, and environment variables | TR-01 to TR-38, NFR-T-01 to NFR-T-08 |
| 05 | `05-Implementation-Plan.md` | Project Implementation Plan | Phased task-level build plan (Phases 0–8) with task IDs, dependencies, definitions of done, milestone gates M1–M4, and per-phase risk notes | Task IDs 0.1–8.9, Milestones M1–M5 |
| 06 | `06-Financial-Model.md` | Financial Model & Cost Estimate | Infrastructure cost by stage, revenue projections (3 scenarios × 3 years), unit economics, LTV/CAC, BSS funding ladder, and runway analysis | RISK-FIN-01 to RISK-FIN-07 |
| 07 | `07-Market-Competitive-Analysis.md` | Market & Competitive Analysis | Market opportunity sizing, 7 competitor profiles, feature comparison matrix, Agora's differentiators and moat, feature gap prioritization, and positioning | RISK-MKT-01 to RISK-MKT-07 |
| 08 | `08-Go-To-Market-Plan.md` | Go-To-Market & Marketing Plan | Brand identity, Ari brand ambassador, positioning and messaging, 4 GTM phases, channel strategy, messaging bank, KPIs, and 30-day launch checklist | RISK-GTM-01 to RISK-GTM-07 |
| 09 | `09-Architecture-Review.md` | Architecture Review & Finding Log | Independent senior-architect review of all 8 docs: severity-rated findings (Critical/High/Medium/Low), the argument behind each, what was changed in place, open decisions for the founders, and a sign-off checklist | F-C1 to F-L3, OD-1 to OD-n |

---

## Cross-Document Traceability

Requirements trace from business through to technical implementation:

```
BRD (BR-xx)
  └── PRD (FR-xx, NFR-xx)
        └── ARD (AR-xx, AP-xx)
              └── TRD (TR-xx)
                    └── Implementation Plan (task IDs)
```

**Financial Model** ↔ **BRD** (revenue model, BSS constraints)  
**Market Analysis** ↔ **BRD** (market opportunity, competitive context)  
**GTM Plan** ↔ **PRD** (free tier, Mode 1/Mode 2), **BRD** (revenue model, BSS timing)

---

## Source Document Map

| Business Doc | Primary Source Files |
|-------------|---------------------|
| BRD | `v1-project-scope.md`, `employer-side-scope.md`, `competitor-analysis.md` |
| PRD | `v1-project-scope.md`, `werkstudent-match-story-walkthrough.md`, `employer-side-scope.md` |
| ARD | `Agora-Jobs-Tech-Stack.md`, `Agora-Jobs-Architecture.md` |
| TRD | `IMPLEMENTATION.md`, `Agora-Jobs-Monorepo-Scaffold.md`, `Agora-Jobs-Tech-Stack.md` |
| Implementation Plan | `Agora-Jobs-Implementation-Plan.md`, `IMPLEMENTATION.md` |
| Financial Model | `Agora-Jobs-Cost-Estimate.md`, `v1-project-scope.md`, `werkstudent-founder-roadmap.md` |
| Market Analysis | `competitor-analysis.md`, `v1-project-scope.md` |
| GTM Plan | `agora-brand-marketing-playbook.md`, `competitor-analysis.md` |

All source files are in `../Buisness Planning/` and are unchanged.

---

## Key Decisions & Non-Negotiables

These decisions appear across multiple documents and govern all product and engineering work:

| Decision | Documents |
|---------|----------|
| **Mode 3 (fully automated submission) is permanently excluded** — not offered at any price point | BRD, PRD, GTM |
| **EU data residency is non-negotiable** — all PII in EU; Bedrock eu-central-1; no cross-border PII transfer | ARD, TRD |
| **Human approval gate is mandatory** — no application can reach `submitted` status without explicit user approval | BRD, PRD, ARD, TRD, Implementation Plan |
| **No server-side application submitter** — submission is always a client-side user action (Mode 1 manual / Mode 2 extension autofill, user clicks Submit). A backend bot that submits would be the banned Mode 3. | ARD, TRD, Implementation Plan |
| **Sonnet 4.x for generation, Haiku for volume/eval, Opus offline-only** — Opus in the hot path breaks the <€0.10/app and <60s targets | ARD, TRD, Financial Model, PRD |
| **Embeddings: Cohere Embed Multilingual v3 via Bedrock EU (1024-dim)** — EU-resident, bilingual; schema dimension must match | ARD, TRD |
| **Payments deferred until BSS funding starts (~Mar 2027)** — BSS eligibility requires no economic activity before funding | BRD, Financial Model, GTM |
| **GDPR erasure and consent must exist before real user data** — Phase 7 compliance tasks begin in Phase 1 | TRD, Implementation Plan |
| **PII redaction before every LLM call** — implemented as a required layer, not optional | ARD, TRD, Implementation Plan |

---

## Document Status

Documents 01–08 are at **Version 1.1 / Draft (reviewed)** as of 2026-06-08, revised per the findings in `09-Architecture-Review.md`. The next review cycle should update:
- Implementation Plan task status as phases are completed
- Financial Model with actual infrastructure invoices vs. estimates
- Market Analysis when competitive signals change (particularly Sorce EU expansion signals)
- GTM Plan after each round of customer development interviews

---

*Agora Jobs · Find your place. · Berlin, 2026*
