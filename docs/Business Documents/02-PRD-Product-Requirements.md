# Product Requirements Document (PRD)
**Project:** Agora Jobs · **Document:** PRD-001 · **Version:** 1.0  
**Status:** Draft · **Date:** 2026-06-08 · **Owner:** Founding Team  
**Source documents:** `../Agora Context Guidelines/v1-project-scope.md` · `../Agora Context Guidelines/werkstudent-match-story-walkthrough.md` · `../Employer Side/employer-side-scope.md`

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [User Personas](#2-user-personas)
3. [Core Loop & User Journey](#3-core-loop--user-journey)
4. [Job-Seeker Feature Requirements](#4-job-seeker-feature-requirements)
5. [Employer Feature Requirements](#5-employer-feature-requirements)
6. [Screen Inventory](#6-screen-inventory)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [V1 / V1.5 / V2 Phasing](#8-v1--v15--v2-phasing)
9. [Out of Scope](#9-out-of-scope)
10. [Acceptance Criteria Summary](#10-acceptance-criteria-summary)
11. [Traceability Appendix](#11-traceability-appendix)

---

## 1. Product Overview

Agora Jobs is a mobile-first job-matching and application platform built for international students in Germany. The V1 product is scoped to Werkstudent roles in Berlin.

**Core differentiator:** Legal eligibility hard-filtering + German ATS-tested document generation + swipe-to-apply UX — none of which exist in combination anywhere in the market.

**Core loop:** match → generate → track

```
User Profile  ──►  Legal Filter  ──►  AI Ranking  ──►  Swipe Deck
                                                             │
                                                       Right Swipe
                                                             │
                                                   Role-Specific Questions
                                                             │
                                                     AI Generation
                                                   (CV + Cover Letter
                                                    + Form Pre-fills)
                                                             │
                                                    Quality Eval (6 dims)
                                                             │
                                                    User Review + Submit
                                                             │
                                                    Application Tracker
                                                             │
                                              Follow-up Draft / Interview Prep
```

---

## 2. User Personas

### 2.1 Primary — International Werkstudent Seeker (Priya)
- **Situation:** Masters student in Data Science at TU Berlin, Indian national, §16b student visa, 87 days remaining under the 140-day rule
- **Goal:** Find a Python/ML Werkstudent role ≤20 hours/week that fits her visa constraints
- **Pain:** Does not know which jobs her visa allows; German CV format and ATS conventions are unfamiliar; previous applications using generic AI CVs received no responses
- **Device preference:** Mobile-first; uses app during commutes and between lectures
- **Willingness to pay:** €5–8/month if the platform saves 10+ hours of application work

### 2.2 Secondary — Chancenkarte Holder
- **Situation:** Non-EU national on §20a job-search visa, not enrolled in study, 20hr/week constraint while searching
- **Goal:** Land first German role; establish work history to convert to skilled-worker visa
- **Pain:** No German; no knowledge of Werkstudent vs Minijob distinctions; unfamiliar with German ATS

### 2.3 Employer — Hiring Team (Phase 5+)
- **Situation:** Project manager at a Berlin tech startup needing a Werkstudent ML engineer for 15hr/week
- **Goal:** Find a pre-screened, visa-eligible, scored candidate without reviewing 200 generic CVs
- **Pain:** Cannot filter by visa eligibility on any platform; bias enters early; self-ratings are uncalibrated

---

## 3. Core Loop & User Journey

### 3.1 End-to-End Journey (Reference Walkthrough — Priya)

**Phase 1 — Setup** (~15 minutes, one-time)
1. Priya downloads the Agora PWA and opens it on her phone
2. She selects her visa type: Student Visa (§16b)
3. She enters her university (TU Berlin), enrollment status (enrolled), and German level (B1)
4. She enters her remaining 140-day allowance: 87 days; maximum weekly hours: 20
5. She sets preferences: Data Science / Machine Learning, minimum €14/hour, Berlin Mitte/Kreuzberg area, start date in 3 weeks
6. She uploads her CV (PDF, 1.8MB)
7. The AI extracts her structured profile: BSc Computer Science (Mumbai), current MSc Data Science (TU Berlin), Python/scikit-learn/SQL skills, 1 internship at a data analytics company
8. She reviews and corrects: changes her thesis topic description, adds her Kaggle profile
9. She answers 6 gap-fill questions: "Describe a project where you used Python for data analysis end-to-end"; "What's your experience with cloud tools?"; etc.
10. Profile is complete — she reaches the home swipe deck

**Phase 2 — Discover** (~5 minutes per session)
1. The deck shows 24 job cards — all pre-filtered to her legal eligibility
2. Each card shows: role title, company, €14.50/hr, 18hrs/week, match score 8.7/10, eligibility ticks: ✓ Skills ✓ German level ✓ Hours ✓ Visa ✓ Salary
3. She swipes left on 12 (not relevant), saves 2 (swipe up), right-swipes on 1: "Python Backend Engineer — Data Pipeline Focus" at a 20-person AI startup in Kreuzberg

**Phase 3 — Apply** (~5 minutes)
1. Priya answers 4 role-specific questions: primary Python project, experience with async frameworks, availability start date, expected hours per week
2. AI generates simultaneously: Tailored CV (1.5 pages, Tabellarischer Lebenslauf, date format MM/YYYY, keywords: FastAPI, async Python, data pipelines) + Tailored Cover Letter (startup tone, German salutation, correct availability statement: "verfügbar ab 01. Juli 2026 für max. 20 Stunden/Woche") + Form Pre-fills
3. Quality eval runs: ATS 9.2, Keywords 8.8, Factual 10.0, Format 9.5, Tone 8.7, Language 9.0 — Overall 9.2/10
4. Priya reviews in three tabs: CV / Cover Letter / Pre-fills — edits one bullet point in the CV
5. She taps "Open application page" (Mode 1) — the startup's Personio page opens, she downloads the PDFs and submits
6. Application moves to tracker: status "Applied"

**Phase 4 — Track** (~2 minutes per check-in)
1. Day 11: no response — Agora drafts a 3-sentence follow-up email for Priya to review and send
2. Day 14: "Interview Invited" — Interview prep package generated: company brief, 10 likely questions, STAR-method answer skeletons from her profile, note on startup interview culture, technical brush-up checklist (FastAPI, distributed systems basics)

---

## 4. Job-Seeker Feature Requirements

### 4.1 Legal Eligibility Engine

**FR-01 — Visa type capture**  
The system SHALL capture the user's visa type during onboarding from a defined set: Student Visa (§16b), EU Citizen, Chancenkarte (§20a), Blue Card, Near Graduation.  
*Acceptance:* All visa types selectable; selection persists to profile; drives all subsequent filtering.

**FR-02 — Employment constraint modeling**  
The system SHALL model and enforce the following employment constraints per visa type:  
- 20-hour/week cap during semester (Student Visa, Chancenkarte)  
- 140-day / 280-half-day annual limit (non-EU students)  
- Minijob €556/month ceiling and BAföG interaction  
- Chancenkarte §20a AufenthG-specific constraints  
*Acceptance:* A job that would exceed any modeled constraint for a given user is invisible in that user's deck. Tested with a test user profile for each visa type.

**FR-03 — Hard filter enforcement**  
Legal eligibility filtering SHALL be applied at the database query layer, not the UI layer.  
*Acceptance:* Filtering occurs in the SQL query before any jobs are returned from the database. No ineligible jobs appear regardless of UI state.

### 4.2 AI Job Matching

**FR-04 — 4-step ranking pipeline**  
The job ranking pipeline SHALL execute in the following sequence:  
1. SQL hard filter (visa type, weekly hours, German level, contract category, location)  
2. Vector similarity search (cosine similarity between user profile embedding and job embeddings)  
3. BM25 keyword re-rank (user skills + preferred fields as query terms)  
4. LLM reranker (Claude Haiku 4.5 scores top-50: "Would this student get an interview? 0–10")  
*Acceptance:* Each step is individually measurable in the observability stack; the pipeline completes in < 3 seconds for a deck generation.

**FR-05 — Daily swipe deck**  
The system SHALL present a daily deck of 20–30 job cards to each user.  
*Acceptance:* Deck populated and available within 5 seconds of opening the home screen; cards are distinct from previous sessions.

**FR-06 — Job card data**  
Each job card SHALL display: role title, company name, hourly rate, hours/week, overall match score, and per-dimension eligibility indicators (skills ✓, language ✓, hours ✓, visa ✓, salary ✓).  
*Acceptance:* All 6 fields populated on every card; eligibility indicators accurately reflect the underlying filter state.

**FR-07 — Swipe gestures**  
The deck SHALL support: right-swipe (apply), left-swipe (pass), tap (full detail view), swipe-up (save).  
*Acceptance:* All four gestures functional on iOS and Android (PWA); haptic feedback on swipe actions.

**FR-08 — Adaptive ranking**  
After 50+ swipes, the reranker prompt SHALL reweight based on the user's swipe history.  
*Acceptance:* Ranking quality improves measurably (measured by right-swipe rate) after 50 swipes vs. at baseline.

### 4.3 User Profile & Onboarding

**FR-09 — Structured onboarding flow**  
The onboarding flow SHALL consist of 7 screens: visa type → university + language → work availability → preferences → CV upload → profile editor → gap-fill questions.  
*Acceptance:* Completion rate tracked per screen; 80% of users who start onboarding complete all 7 steps.

**FR-10 — CV extraction**  
The system SHALL accept PDF or DOCX CV uploads (max 5MB) and AI-extract: education history, work experience, projects, skills, languages.  
*Acceptance:* Extraction accuracy ≥95% on a test set of 20 representative CVs; user can review and correct all extracted fields.

**FR-11 — Gap-fill questions**  
The system SHALL generate 5–8 profile-specific gap-fill questions tailored to the user's CV and employment category.  
*Acceptance:* Questions are unique per user (not generic); answers are stored and used in all subsequent AI generation prompts.

### 4.4 AI Document Generation

**FR-12 — Three artifacts per application**  
For each right-swiped application, the system SHALL generate simultaneously: (1) Tailored CV, (2) Tailored Cover Letter, (3) Form Pre-fills.  
*Acceptance:* All three artifacts available for review within 60 seconds of completing role-specific questions.  
*Implementation note:* Generation uses Claude Sonnet 4.x via Bedrock EU (ARD AR-34); Opus is not used in the hot path for cost/latency reasons.

**FR-13 — CV format compliance**  
Generated CVs SHALL conform to Tabellarischer Lebenslauf conventions: date format MM/YYYY, section ordering (Personal → Education → Experience → Skills), ≤2 pages for Werkstudent, no text boxes or graphical elements that break ATS parsers.  
*Acceptance:* 100% format compliance in automated format-check eval dimension.

**FR-14 — Keyword coverage**  
Generated CVs SHALL include ≥80% of must-have keywords from the job description, inserted naturally.  
*Acceptance:* Keyword coverage dimension in quality eval ≥80% pass rate across 10 test applications.

**FR-15 — Cover letter conventions**  
Generated cover letters SHALL include: German salutation (hiring manager name where available), tone matched to company type (startup / corporate / mixed), availability statement reflecting the user's actual legal hours and start date.  
*Acceptance:* Cover letter passes tone-match eval dimension; salutation format is correct German convention.

**FR-16 — PII redaction**  
All user data (including CV content) SHALL have passport numbers, visa reference numbers, and ID numbers redacted before being sent to any LLM.  
*Acceptance:* PII redaction function runs on every LLM call with user data; unit-tested with real-shaped samples.

**FR-17 — Prompt caching**  
Profile context SHALL be cached to reduce per-generation token cost.  
*Acceptance:* ~50% token cost reduction on repeat generations vs. non-cached baseline (measured in Langfuse).

### 4.5 Quality Eval Suite

**FR-18 — 6-dimension quality evaluation**  
Every generated application SHALL be evaluated across 6 dimensions before being shown to the user:  

| Dimension | Pass Threshold |
|-----------|---------------|
| ATS parseability (Softgarden / Personio / d.vinci) | All fields extracted correctly |
| Keyword coverage | ≥80% of must-have JD keywords |
| Factual consistency | 0 unsupported claims |
| Format compliance | All format rules pass |
| Tone match | Correct register for company type |
| Language quality | No grammar/idiom errors |

*Acceptance:* All 6 dimensions scored and displayed on every artifact; overall score and dimension breakdown visible to user.

**FR-19 — Auto-regeneration**  
If the overall quality eval score is < 8.0, the system SHALL automatically regenerate once before showing the user.  
*Acceptance:* Auto-regeneration triggered on first fail; result (improved or not) shown with score and manual regenerate option.

### 4.6 Application Review & Submission

**FR-20 — Three-tab review interface**  
The review screen SHALL display CV, Cover Letter, and Pre-fills in three accessible tabs, with the full job description visible alongside.  
*Acceptance:* All three tabs functional; job description visible without leaving the review screen.

**FR-21 — Inline editing**  
Users SHALL be able to edit any field in the CV, cover letter, or pre-fills inline before submission.  
*Acceptance:* Edits saved and reflected in the final downloaded/submitted artifact.

**FR-22 — Mode 1 submission (Smart Review)**  
Mode 1 SHALL open the company's application page and allow the user to download the PDFs for manual submission.  
*Acceptance:* Company application URL opens correctly; PDFs downloadable in one tap; no application is ever sent automatically.

**FR-22a — Plan entitlements (free vs paid boundary)**  
The free/paid boundary is **Mode 1 + core generation (free)** vs **Mode 2 Magic Pre-fill + premium features (paid)** — matching the source scope where "Mode 1 is always available, free." A generous free tier is a deliberate growth lever (competitor lesson: Sorce's free tier drove its scale — see Market Analysis §6).  
*Open decision (see Architecture Review F-M2 / OD-2):* whether free generations are uncapped or carry an anti-abuse soft cap (e.g. N/month). If a cap is used it is a **cost-control** measure, not the primary monetization lever, and MUST be enforced server-side (TRD TR-31a). The "5/month" figure that appeared in earlier cost drafts is a placeholder pending this decision, not a settled requirement.  
*Acceptance:* Plan entitlements enforced server-side; free users can always generate and submit via Mode 1; Mode 2 and premium features require an active paid plan.

**FR-23 — Mode 2 (Magic Pre-fill) — V1.5**  
Mode 2 browser extension pre-fills company application form fields in the user's own browser session.  
*Acceptance (V1.5):* Extension pre-fills all standard fields; user reviews and clicks the company's own Submit button; no auto-submit.

### 4.7 Application Pipeline Tracker

**FR-24 — Status machine**  
The tracker SHALL implement the following status transitions:  
`Applied → Viewed → Interview Invited → Offer / Rejected / Withdrawn`  
`Applied → No Response (10 days) → Follow-up Drafted`  
*Acceptance:* All status transitions functional; status visible on tracker screen.

**FR-25 — Automated follow-up drafting**  
At 10 days of no response, the system SHALL automatically draft a 3-sentence professional follow-up email.  
*Acceptance:* Draft generated and surfaced to user at day 10; sent only when user taps a mailto link — never auto-sent.

**FR-26 — Application history**  
Tapping any application in the tracker SHALL show: generated CV and cover letter for that application, current status, and timeline.  
*Acceptance:* Historical artifacts retrievable and readable for all applications.

### 4.8 Interview Prep Package

**FR-27 — Automatic interview prep generation**  
When an application status changes to "Interview Invited", the system SHALL automatically generate an interview prep package containing:  
- Company brief (recent news, funding, products, team size)  
- 8–12 likely interview questions tailored to the role and company type  
- STAR-method answer skeletons mapped from the user's profile and gap-fill answers  
- German interview norms (shown once per user)  
- Technical brush-up checklist (for technical roles, based on JD skills)  
*Acceptance:* Package available within 2 minutes of status change; all components present.

---

## 5. Employer Feature Requirements

*(Phase 5 — Month 18+. Requirements scoped here for planning; implementation deferred.)*

**FR-28 — Requirement Profile Builder**  
Employers SHALL be able to define a weighted competency profile per role, including core/supporting/out-of-scope classifications.

**FR-29 — Candidate Self-Rating Form**  
Candidates SHALL complete a self-rating form scoped to the role's requirement profile competencies.

**FR-30 — Scoring Engine**  
The system SHALL compute a fit score per candidate: requirement match × self-rating alignment × eligibility pass (hard gate).

**FR-31 — Face-Hidden Search Deck**  
Candidate cards SHALL not display photos until the employer finalizes a candidate for assessment.

**FR-32 — Blind Two-Team Validation**  
Team 1 and Team 2 SHALL assess candidates independently, with neither team seeing the other's scores during assessment.

---

## 6. Screen Inventory

| # | Screen | Phase | Purpose | Key Actions |
|---|--------|-------|---------|-------------|
| 1 | Visa type | Setup | Capture legal eligibility basis | Select visa type from defined set |
| 2 | University + language | Setup | Institution and German level | Enter university; select German level (A1–C2) |
| 3 | Work availability | Setup | Legal capacity | Enter 140-day remainder; weekly hours available |
| 4 | Preferences | Setup | Job search parameters | Fields of interest; min rate; location; start date |
| 5 | CV upload | Setup | Profile extraction | Upload PDF/DOCX (≤5MB) |
| 6 | Profile editor | Setup | Review AI-extracted data | Edit education, experience, projects, skills |
| 7 | Gap-fill questions | Setup | Enrich profile | Answer 5–8 AI-generated questions |
| 8 | Swipe deck (home) | Discover | Daily matched jobs | Right/left/up/tap gestures; match score per card |
| 9 | Job detail sheet | Discover | Full job info | Full JD; company info; match score breakdown; Apply CTA |
| 10 | Role-specific questions | Apply | Context for AI | 2–5 short questions (~30 sec each) |
| 11 | Generation loading | Apply | AI generating materials | Progress indicator; eval running; score revealed |
| 12 | Application review | Apply | Review and submit | CV/Cover Letter/Pre-fills tabs; inline edit; score card; Mode 1/2 CTAs |
| 13 | Pipeline / tracker | Track | All active applications | Status columns; tap to see artifacts |
| 14 | Follow-up draft | Track | Re-engage employer | AI-drafted 3-sentence follow-up; mailto send |
| 15 | Interview prep | Track | Prepare for interviews | Company brief; questions; STAR skeletons; norms; checklist |
| 16 | Settings / account | Account | Profile management | Edit profile; visa update; notifications; GDPR delete |

---

## 7. Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| NFR-01 | Generation latency | Full 3-artifact generation in < 60 seconds on the happy path; the auto-regeneration path (one extra generation + eval) MAY take longer and SHALL show progress. Uses Sonnet (not Opus) to hit this budget — see ARD AR-34. |
| NFR-02 | Swipe deck load time | Deck available in < 5 seconds on home screen open |
| NFR-03 | Uptime | 99.5% monthly uptime (PWA + API) |
| NFR-04 | Data residency | All PII remains within EU at rest and during inference |
| NFR-05 | GDPR erasure | Account deletion removes all PII within 30 days |
| NFR-06 | Security | UUIDs on all user-facing IDs; Postgres row-level security; no raw PII in LLM calls |
| NFR-07 | Mobile compatibility | PWA works on iOS Safari 16+ and Chrome Mobile 110+ |
| NFR-08 | Eval score availability | Quality score displayed within 5 seconds of generation completion |
| NFR-09 | LLM cost per application | < €0.10 happy path (Sonnet generation + Haiku eval, profile cached); < €0.20 incl. one auto-regeneration. Opus would break this budget (~3×) — see ARD AR-34 / Financial Model §4.2. |

---

## 8. V1 / V1.5 / V2 Phasing

| Feature | V1 (months 1–3) | V1.5 (months 4–6) | V2 (months 7–18) |
|---------|-----------------|-------------------|------------------|
| Werkstudent track | ✅ Full build | — | — |
| Legal eligibility engine | ✅ Full build | — | — |
| AI generation + quality eval | ✅ Full build | — | — |
| Mode 1 (Smart Review) | ✅ Full build | — | — |
| Pipeline tracker | ✅ Full build | — | — |
| Interview prep | ✅ Full build | — | — |
| Soft paywall / pricing experiment | — | ✅ | — |
| Mode 2 (Magic Pre-fill extension) | — | ✅ | — |
| Minijob category | — | — | ✅ Phase 2 |
| Chancenkarte dedicated track | — | — | ✅ Phase 2 |
| Full-time employment track | — | — | ✅ Phase 3 |
| Native iOS / Android app | — | — | Year 2 |
| Employer-side portal | — | — | Phase 5 (month 18+) |

---

## 9. Out of Scope

| Feature | Rationale |
|---------|-----------|
| Mode 3 automated submission (autopilot) | Legal exposure under EU law; silent failure risk; employer detection risk; permanently excluded |
| Mass auto-apply without review | Same risk as Mode 3; contradicts core product principle |
| Non-German job markets (V1) | Requires per-country config of visa rules, ATS, CV formats — Year 2+ |
| Non-Werkstudent categories (V1) | Sequential build; Werkstudent generates learnings that improve next category |
| Real-time interview coaching | Phase 3+ feature; complex; AIApply (Interview Buddy) has it — build after ATS moat established |

---

## 10. Acceptance Criteria Summary

| ID | Criteria | Target |
|----|----------|--------|
| AC-01 | ATS pass rate | ≥90% on Softgarden, Personio, d.vinci |
| AC-02 | Quality eval average | ≥8.5/10 across generated applications |
| AC-03 | Swipe-to-submission rate | ≥40% of right swipes result in a submitted application |
| AC-04 | Generation latency | All 3 artifacts ready in < 60 seconds |
| AC-05 | Legal eligibility accuracy | Zero ineligible jobs in any user's deck |
| AC-06 | Onboarding completion | ≥80% of users who start complete all 7 onboarding steps |
| AC-07 | User satisfaction | ≥70% positive qualitative feedback on document quality |
| AC-08 | PII safety | Zero PII (passport/visa numbers) present in any LLM call, verified by unit test |

---

## 11. Traceability Appendix

| FR ID | BRD Requirement | Source Document |
|-------|-----------------|-----------------|
| FR-01, FR-02, FR-03 | BR-01 | `v1-project-scope.md` §5.1 |
| FR-04, FR-05, FR-06, FR-07, FR-08 | BR-03 | `v1-project-scope.md` §5.2 |
| FR-09, FR-10, FR-11 | BR-07 | `v1-project-scope.md` §5.3 |
| FR-12 to FR-17 | BR-02 | `v1-project-scope.md` §5.4 |
| FR-18, FR-19 | BR-06 | `v1-project-scope.md` §5.5 |
| FR-20 to FR-23 | BR-05 | `v1-project-scope.md` §5.6 |
| FR-24, FR-25, FR-26 | BR-04 | `v1-project-scope.md` §5.7 |
| FR-27 | BR-09 | `v1-project-scope.md` §5.8 |
| FR-28 to FR-32 | BR-12 to BR-17 | `employer-side-scope.md` §5 |

---

*This document defines what Agora Jobs builds. All engineering tasks should trace to FR or NFR IDs. Changes to requirements require founding team sign-off and propagation to the TRD and ARD.*
