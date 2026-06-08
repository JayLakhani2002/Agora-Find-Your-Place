# Business Requirements Document (BRD)
**Project:** Agora Jobs · **Document:** BRD-001 · **Version:** 1.0  
**Status:** Draft · **Date:** 2026-06-08 · **Owner:** Founding Team  
**Source documents:** `../Buisness Planning/Agora Context Guidlines/v1-project-scope.md` · `../Buisness Planning/Employeers Side/employer-side-scope.md` · `../Buisness Planning/Competetor's Data/competitor-analysis.md`

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Business Objectives](#2-business-objectives)
3. [Target Market & Personas](#3-target-market--personas)
4. [Problem Statement](#4-problem-statement)
5. [Business Requirements — Job-Seeker Side](#5-business-requirements--job-seeker-side)
6. [Business Requirements — Employer Side](#6-business-requirements--employer-side)
7. [Revenue Model & Business Rules](#7-revenue-model--business-rules)
8. [Success Metrics & KPIs](#8-success-metrics--kpis)
9. [Scope Boundaries](#9-scope-boundaries)
10. [Assumptions & Constraints](#10-assumptions--constraints)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Open Questions](#12-open-questions)
13. [Traceability Appendix](#13-traceability-appendix)

---

## 1. Executive Summary

Agora Jobs is a mobile-first, AI-powered job-matching and application platform for international students in Germany. The V1 product targets international students seeking Werkstudent roles in Berlin — a segment of 40,000+ potential users with no dedicated, legally-aware AI tooling.

The platform simultaneously solves three compounding problems: legal eligibility confusion arising from Germany's complex student employment law, application document barriers unique to the German market, and fragmented job discovery across multiple generic platforms.

The core value proposition is the **match → generate → track** loop: users swipe through pre-filtered, legally eligible job cards, receive AI-generated CVs and cover letters tailored to the role and German ATS conventions, and track all applications in a managed pipeline — completing a full application in under five minutes.

The employer-facing product closes the loop by providing a structured, bias-reduced hiring pipeline that scores international students against weighted role requirements.

---

## 2. Business Objectives

| ID | Objective | Measurement | Target |
|----|-----------|-------------|--------|
| BO-01 | Become the primary job-application platform for international students in Berlin | Monthly Active Users (MAU) | 500 MAU by end of month 6 |
| BO-02 | Achieve sustainable unit economics before Year 2 | Cost per active user vs. ARPU | Break even at scale stage |
| BO-03 | Establish a defensible moat through German legal depth and ATS eval quality | ATS pass rate vs. ChatGPT baseline | ≥90% ATS parse rate; publishable claim |
| BO-04 | Generate sufficient revenue to support 2–3 founders by end of monetization Year 2 | Monthly Recurring Revenue (MRR) | ~€9,000 MRR **exit rate** (end of monetization Year 2; ≈ €107k ARR) |
| BO-05 | Secure Berliner Startup Stipendium (BSS) funding | BSS approval | **Application Oct 2026; jury Jan/Feb 2027; funding starts ~Mar 2027** (per founder roadmap — not "before Dec 2026") |
| BO-06 | Expand to employer-side B2B by month 18 to diversify revenue | Pilot employers onboarded | 3–5 paying or sponsoring employers |

---

## 3. Target Market & Personas

### 3.1 Primary Market
- **Geography:** Berlin, Germany (V1)
- **Segment:** International students (all visa types) seeking Werkstudent employment
- **Size:** 40,000+ international students in Berlin; 49,000+ Indian students across Germany
- **Growing sub-segment:** Chancenkarte (§20a AufenthG) holders — thousands issued in 2024 and growing annually

### 3.2 Persona A — Primary: The Werkstudent Seeker

| Attribute | Detail |
|-----------|--------|
| Name | Priya (representative) |
| Visa | §16b Student Visa |
| University | TU Berlin / TU Munich |
| Degree | Data Science / Engineering Masters |
| Pain | Does not know which jobs her visa allows; German CV format unknown; ATS rejection common |
| Goal | Find a 20hr/week Werkstudent role in tech that fits her visa constraints |
| Willingness to pay | €5–10/month |

### 3.3 Persona B — Secondary: The Chancenkarte Holder

| Attribute | Detail |
|-----------|--------|
| Visa | §20a AufenthG Job Search Visa |
| Status | Not enrolled in study; actively job seeking |
| Pain | 20hr/week constraint during search; no German; unfamiliar with ATS and local CV format |
| Goal | First paid role in Germany as a stepping stone to work visa |

### 3.4 Persona C — Employer-Side: The Hiring Team Lead

| Attribute | Detail |
|-----------|--------|
| Role | Project Manager / Solution Architect at a Berlin tech startup |
| Pain | Generic job descriptions attract wrong candidates; bias enters early in screening; visa eligibility unclear |
| Goal | Hire a verified, eligibility-checked international student for a Werkstudent or junior role |

---

## 4. Problem Statement

### 4.1 Legal Complexity (BR-01 basis)
International students in Germany operate under a layered set of employment restrictions that vary by visa type, enrollment status, and time of year:
- **20-hour per week cap** during the semester (Student Visa and Chancenkarte holders)
- **140-day or 280-half-day annual limit** for ancillary employment (non-EU students)
- **€556/month Minijob ceiling** and its interaction with BAföG income limits
- **Chancenkarte §20a AufenthG** constraints for job-search visa holders

No existing platform — LinkedIn, Stellenticket, jobicco, Berlin Startup Jobs — models any of these constraints. Students routinely apply to legally ineligible roles.

### 4.2 Application Document Barriers (BR-02 basis)
German employers expect the *Tabellarischer Lebenslauf* with strict conventions: page length, date format (MM/YYYY), section order, and photograph inclusion. Generic AI tools (ChatGPT) produce documents that fail German ATS systems (Softgarden, Personio, d.vinci) because they lack German market training and no Werkstudent format variant.

### 4.3 Fragmented Discovery (BR-03 basis)
Students must manually scan multiple platforms, verify eligibility for each role, write new documents per application, track applications in spreadsheets, and remember to follow up. This process takes hours per cycle with a high abandonment rate.

### 4.4 Employer Hiring Gap (BR-04 basis)
Employers hiring international students face no single, eligibility-aware, pre-scored pipeline. They manage generic boards, manual CV review, and visa uncertainty — the mirror-image of the student-side problem.

---

## 5. Business Requirements — Job-Seeker Side

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-01 | The system SHALL enforce legal employment eligibility as a hard filter before any job is displayed to a user | MUST | Zero ineligible jobs visible in a user's swipe deck across all visa types tested |
| BR-02 | The system SHALL generate Tabellarischer Lebenslauf-format CVs and German cover letters tailored per application | MUST | ≥90% ATS parse rate on Softgarden, Personio, and d.vinci |
| BR-03 | The system SHALL provide a consolidated job discovery experience with match scoring per user profile | MUST | Ranked swipe deck of 20–30 eligible jobs per session |
| BR-04 | The system SHALL track all submitted applications through a status pipeline with automated follow-up drafting | MUST | Status updates visible; follow-up draft generated at 10 days of no response |
| BR-05 | The system SHALL require explicit user review and approval before any application material is finalized or submitted | MUST | No application reaches "submitted" status without a user approval action |
| BR-06 | The system SHALL provide a quality evaluation score for every generated document before the user sees it | MUST | 6-dimension eval score displayed on every generated artifact; auto-regeneration if score < 8.0 |
| BR-07 | The system SHALL capture and structure a user's career profile from CV upload plus gap-fill questions | MUST | Structured profile created from uploaded CV + 5–8 gap-fill answers |
| BR-08 | The system SHALL support German and English language output for all generated documents | MUST | Language selection respected in generated CV and cover letter |
| BR-09 | The system SHALL provide interview preparation materials when an application reaches "Interview Invited" status | SHOULD | Interview prep package generated automatically on status change |
| BR-10 | The platform SHALL maintain full GDPR compliance including right-to-erasure and data export | MUST | Account deletion removes all PII within 30 days; data export downloadable |
| BR-11 | All personal data SHALL remain within EU data boundaries at rest and during inference | MUST | All infrastructure providers confirmed on EU regions with signed DPAs |

---

## 6. Business Requirements — Employer Side

> **Scope/priority note (F-H6):** The employer product is **Phase 5 (≈ month 13–18)** — well beyond the V1 horizon. The requirements below are therefore classified **FUTURE**, not MUST. "MUST" in this document denotes a V1 commitment; these are committed *for their phase*, not for V1. They are documented now so the V1 data model (verified, eligibility-checked student profiles) is built in a way that does not block them later.

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-12 | The system SHALL allow an employer to define a weighted requirement profile per role | FUTURE (Phase 5) | Requirement profile with competency weights authored and saved per role |
| BR-13 | The system SHALL score candidates against the employer's weighted requirement profile | FUTURE (Phase 5) | Fit score computed per candidate using requirement weighting × profile match |
| BR-14 | The system SHALL hide candidate photos and identifying information until the employer finalizes a candidate for assessment | FUTURE (Phase 5) | Zero photos displayed in deck view; revealed only post-finalization |
| BR-15 | The system SHALL support independent two-team blind validation of shortlisted candidates | FUTURE (Phase 5) | Team 1 and Team 2 scores recorded independently; neither team sees the other's scores during assessment |
| BR-16 | The employer candidate pool SHALL be drawn exclusively from verified Agora Jobs student profiles | FUTURE (Phase 5) | Candidates visible to employers are only those with active Agora profiles |
| BR-17 | The system SHALL inherit the job-seeker legal eligibility engine to ensure employer-visible candidates are legally eligible | FUTURE (Phase 5) | Ineligible candidates do not appear in employer search deck |

---

## 7. Revenue Model & Business Rules

### 7.1 Job-Seeker Revenue

| Tier | Price | Features | Business Rule |
|------|-------|----------|---------------|
| Free | €0 | Mode 1 (Smart Review) — download PDFs and submit manually | Always available; no credit card required |
| Paid | €4.99–€9.99/month | Mode 2 (Magic Pre-fill extension) + premium features | Pricing set at month 4–5 via three-cohort experiment: €4.99 / €6.99 / €9.99 |

**Business Rule BR-REV-01:** Mode 3 (fully automated submission without user interaction) is permanently out of scope. Legal exposure under EU law and employer-side detection risk make this non-viable.

**Business Rule BR-REV-02:** Payments are NOT activated until **BSS funding has started (~March 2027)** and never before — the BSS "no economic activity before funding" rule is binding (see C-02). Subscription billing goes live at ~BSS month 3 (≈ Q2 2027) after beta data validates the conversion model. (Earlier drafts said "month 4"; that undefined relative month is replaced by the BSS-anchored calendar — see Financial Model §1.2.)

**Business Rule BR-REV-03:** Pricing decision is based on best conversion × retention, not highest conversion alone.

### 7.2 Employer Revenue

| Revenue Stream | Mechanism | Pricing |
|----------------|-----------|---------|
| SaaS Subscription | Recurring fee for search, scoring, and validation tooling | Tiered by seats / active roles |
| Sponsored Student Access | Companies fund access to verified Agora student talent pool | Per-placement or bulk access fee |

**Business Rule BR-REV-04:** Employer revenue is the primary monetization engine that keeps student-side pricing low. Student pricing is structurally subsidized by employer sponsorship.

### 7.3 Revenue Projections

| Period | Conservative (2% conversion) | Expected (3.5%) | Optimistic (5% + employer) |
|--------|-------------------------------|-----------------|---------------------------|
| Y1 Total | €3,281 | €5,304 | €14,737 |
| Y2 Total | €31,130 | €58,050 | €147,761 |
| 2-Year Total | €34,400 | €63,400 | €162,500 |

> **Calendar note:** "Year 1 / Year 2" are **monetization years** anchored to billing go-live (~Q2 2027, BSS month 3) — not build months. Full breakdown and reconciliation in `06-Financial-Model.md` §3. These are the single canonical revenue figures for the suite.

**Key note:** October Wintersemester arrivals represent the primary annual acquisition spike — plan all campaigns to peak in late September.

---

## 8. Success Metrics & KPIs

### 8.1 V1 Beta Success Criteria (Month 3)

| Metric | Target |
|--------|--------|
| Closed beta users | 10–20 active users |
| ATS pass rate | ≥90% parse rate on Softgarden, Personio, d.vinci |
| Quality eval average | ≥8.5/10 across generated applications |
| Swipe-to-application completion | ≥40% of right swipes result in submitted application |
| User satisfaction (qualitative) | ≥70% positive sentiment on CV/cover letter quality |
| Legal eligibility accuracy | Zero ineligible jobs in any user's swipe deck |

### 8.2 North-Star Metrics

| Metric | Rationale |
|--------|-----------|
| **Interviews landed per active user** | The real outcome — measures whether Agora creates career value |
| Free → Paid conversion rate | Target 3.5% — validates the subscription model |
| Monthly Active Users (MAU) | Growth indicator |
| Application quality score (avg) | Platform health metric |

### 8.3 Decision Gate — Month 5

If month 5 shows: conversion < 1% AND no MRR growth → evaluate pivot to employer-side B2B before further investment. Do not continue without validated conversion.

---

## 9. Scope Boundaries

### 9.1 In Scope — V1

| Dimension | V1 Scope |
|-----------|----------|
| Job category | Werkstudent only |
| Geography | Berlin only |
| User type | International students (all visa types) |
| Submission mode | Mode 1 (Smart Review, free) only |
| Languages | German and English output |
| Platform | PWA (Next.js) — no native iOS/Android in V1 |
| Employer features | None in V1 (Phase 5, month 18+) |
| Payments | Not active until BSS funding starts (~Q2 2027); never before |

### 9.2 Out of Scope — V1

| Feature | Planned Phase |
|---------|--------------|
| Minijob category | Phase 2 (months 4–6) |
| Chancenkarte dedicated track | Phase 2 (months 4–6) |
| Odd-jobs / kurzfristige Beschäftigung | Phase 3 (months 7–9) |
| Full-time employment track | Phase 3 (months 7–9) |
| Mode 2 browser extension | V1.5 (month 5–6) |
| Native iOS / Android app | Year 2 |
| Employer-side portal | Phase 5 (month 18+) |
| Geographic expansion | Year 1.5+ |
| Mode 3 autopilot | Never |

---

## 10. Assumptions & Constraints

### 10.1 Assumptions

| ID | Assumption |
|----|-----------|
| A-01 | German student employment law (140-day rule, 20hr cap, Minijob threshold) remains stable through V1 |
| A-02 | AWS Bedrock is available in EU region (eu-central-1) with Claude model access throughout development |
| A-03 | Werkstudent job supply in Berlin is sufficient to populate a swipe deck of 20–30 eligible roles per user per day |
| A-04 | International students in Berlin are willing to share CV and visa data with a trusted platform |
| A-05 | BSS application is submitted Oct 2026, jury Jan/Feb 2027, funding starts ~Mar 2027; founder holds the §20 job-seeker permit (18 months, unlimited work) from graduation through this period as the safety net |
| A-06 | At least two co-founders will be committed full-time before BSS application; a professor mentor from a BSS-consortium Berlin university (TU/FU/HU/HTW/BHT/HWR) is secured (UE Berlin is not in the consortium) |
| A-07 | The statutory non-EU student work allowance the engine models is **140 days / 280 half-days** (current law). The founder roadmap references an older "120 days" figure; the product figure requires immigration-lawyer confirmation before launch (OQ-05 / ARD OAQ-05). The legal moat depends on this being correct. |

### 10.2 Constraints

| ID | Constraint | Impact |
|----|-----------|--------|
| C-01 | **Founder visa constraint:** UG/GmbH cannot be incorporated before BSS approval | Company registration deferred to during BSS funding period |
| C-02 | **BSS pre-condition:** No economic activity (paying users, incorporation) before BSS **funding starts** (~Mar 2027); none at application time (Oct 2026) | Payments and UG incorporation deferred until the grant is funded |
| C-03 | **GDPR-first:** All PII must remain in EU data boundaries | All infrastructure must be EU-region; PII redacted before LLM calls |
| C-04 | **Human approval gate:** No automated submission without explicit user approval | Mode 3 autopilot is permanently excluded |
| C-05 | **EU AI detection risk:** German embassies and employers actively detect AI-generated applications | Platform must augment and personalize, not mass-produce boilerplate |
| C-06 | **Student pricing:** Target users have limited disposable income (blocked accounts) | Pricing must be student-accessible (€5–10/month range) |

---

## 11. Risks & Mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| RISK-01 | Willingness to pay below model (conversion <1%) | Medium | High | Three-cohort pricing experiment at month 5; pivot to employer B2B if needed |
| RISK-02 | Co-founder misalignment on time and commitment | Medium | High | Written founders agreement before serious code; weekly accountability cadence; month-6 review |
| RISK-03 | Job supply too thin post-filtering (sparse swipe deck) | Medium | High | Additional scraping sources (EURES, Make-it-in-Germany.de); Zenjob/Jobtoday API partnerships; direct API with Stellenticket |
| RISK-04 | AI-generated applications detected/rejected by German employers | Medium | Medium | Augment-not-automate design; user voice capture; per-application variation; honest AI disclosure |
| RISK-05 | BSS funding denied | Low-Medium | High | Have fallback plan: employer B2B pivot earlier; seek GründungsBONUS Plus or angel investors |
| RISK-06 | Sorce expands to Germany within 12 months | Low | High | Move fast in Year 1 to build brand loyalty; German legal depth is 6–12 month minimum lead |
| RISK-07 | GDPR violation with sensitive documents | Low | Critical | EU-only infrastructure; PII redaction before LLM; DPAs signed; erasure tested before beta |

---

## 12. Open Questions

| ID | Question | Owner | Due |
|----|---------|-------|-----|
| OQ-01 | Does the §20 job-seeker permit explicitly allow participation in BSS? (Requires immigration lawyer confirmation) | Founder | Before BSS application |
| OQ-02 | Which Berlin university professor will mentor the BSS application? | Founder | August 2026 |
| OQ-03 | What is the final pricing tier to activate? (three-cohort €4.99/€6.99/€9.99 experiment; depends on beta conversion data) | Founding team | ~BSS month 3 |
| OQ-04 | Direct API agreements with Stellenticket and Berlin Startup Jobs — status? | Ops co-founder | Build month 1 |
| OQ-05 | Confirm the statutory non-EU student work-day allowance (product models 140/280; roadmap says 120) — immigration-lawyer sign-off | Founder + lawyer | Before launch |

---

## 13. Traceability Appendix

| BRD Requirement | Source Document | Section |
|-----------------|-----------------|---------|
| BR-01 | `v1-project-scope.md` | §5.1 Legal Eligibility Engine |
| BR-02 | `v1-project-scope.md` | §5.4 AI Document Generation |
| BR-03 | `v1-project-scope.md` | §5.2 AI Job Matching |
| BR-04 | `v1-project-scope.md` | §5.7 Pipeline Tracker |
| BR-05 | `v1-project-scope.md` | §3.2 Key Design Principles |
| BR-06 | `v1-project-scope.md` | §5.5 Quality Eval Suite |
| BR-10, BR-11 | `Agora-Jobs-Tech-Stack.md` | §8 Security & GDPR Compliance |
| BR-12 to BR-17 | `employer-side-scope.md` | §5 Features |
| BR-REV-01 to BR-REV-04 | `v1-project-scope.md` | §10 Revenue Model |
| RISK-01 to RISK-03 | `v1-project-scope.md` | §11 Risks |
| RISK-06 | `competitor-analysis.md` | §3 Real Competition |

---

*This document is the primary business requirements reference for Agora Jobs V1. All product, technical, and architecture decisions should trace back to requirements in this document. Changes require founding team sign-off.*
