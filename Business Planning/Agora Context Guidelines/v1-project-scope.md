# Agora Jobs — V1 Project Scope

**Document type:** Project Scope — Internal Reference
**Version:** 1.0
**Date:** June 2026
**Status:** Pre-MVP / Build Phase
**Prepared by:** Agora Jobs Founding Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution](#3-solution)
4. [V1 Scope Boundaries](#4-v1-scope-boundaries)
5. [Features](#5-features)
6. [Out of Scope (V1)](#6-out-of-scope-v1)
7. [Success Criteria](#7-success-criteria)

---

## 1. Executive Summary

Agora Jobs is a mobile-first job matching platform for international students in Germany. The V1 product targets international students seeking Werkstudent roles in Berlin — a segment with 40,000+ potential users and no dedicated AI-powered tooling.

The platform solves three compounding problems at once: legal eligibility confusion, German application document barriers, and fragmented job discovery. Users swipe through pre-filtered job cards, receive AI-generated CVs and cover letters tailored to each role, and track all applications through a managed pipeline — in under five minutes per application.

**V1 target user:** International students (any visa type) in Berlin seeking Werkstudent employment.
**V1 geography:** Berlin only.
**V1 job category:** Werkstudent roles only.

---

## 2. Problem Statement

### 2.1 Legal Complexity

International students in Germany operate under a layered set of employment restrictions that vary by visa type, enrollment status, and time of year. These include:

- The **20-hour per week cap** during the semester (Student Visa and Chancenkarte holders)
- The **140-day or 280-half-day rule** for ancillary employment (non-EU students)
- The **€556/month Minijob ceiling** and its interaction with BAföG income limits
- **Chancenkarte-specific constraints** under §20a AufenthG for job-search visa holders not enrolled in study

No existing job platform — LinkedIn, Stellenticket, jobicco, Berlin Startup Jobs — models any of these constraints. Students routinely apply to jobs they are legally ineligible for, wasting time and creating potential visa compliance risk.

### 2.2 Application Document Barriers

German employers expect a specific document format: the *Tabellarischer Lebenslauf* (tabular CV), with strict conventions on page length, date format, section ordering, and photograph inclusion. Cover letters follow formal salutation and structure conventions distinct from other European markets.

International students, particularly those arriving from India and other non-EU countries, are largely unfamiliar with these conventions. Generic AI tools (ChatGPT, etc.) produce documents that fail German ATS systems (Softgarden, Personio, d.vinci) because they have no German-market-specific training, no awareness of the Werkstudent format variant, and no connection to the student's actual legal work availability.

### 2.3 Fragmented Job Discovery

The existing landscape for international students is a collection of generic listing boards with no eligibility filtering, no AI document generation, and no application tracking. Students must:

1. Manually scan multiple platforms
2. Manually verify legal eligibility for each role
3. Write a new CV and cover letter per application
4. Track applications across email and spreadsheets
5. Remember to follow up after silence

This process takes hours per application cycle and has a high abandonment rate, particularly among students with lower German proficiency.

### 2.4 Market Gap Summary

| Gap | Current State | What Agora Provides |
|---|---|---|
| Legal eligibility filtering | Not modeled anywhere | Hard filter — users see only legal roles |
| German CV/cover letter generation | No Werkstudent-aware AI tooling | Tailored generation per application |
| ATS pass rate | Generic AI output fails German ATS | 6-dimension eval with auto-regeneration |
| Application tracking | Manual, fragmented | Unified pipeline with status tracking |
| Interview preparation | Not connected to application data | Auto-generated prep from role + profile |

---

## 3. Solution

Agora Jobs is built around a single core loop: **match → generate → track**.

### 3.1 Core Loop

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

### 3.2 Key Design Principles

**Legal eligibility is a hard constraint, not a filter toggle.** Users never see a job they cannot legally take. This is enforced at the database query layer, not the UI layer.

**Quality is verified before the user sees anything.** AI-generated materials pass a 6-dimension eval before being shown. If quality is below threshold, the system regenerates automatically. Users always receive a scored output.

**The user is always in control of submission.** No application is ever sent automatically. The platform generates, the user reviews, the user submits. This is a deliberate legal and trust decision.

**The profile is a career asset, not a form.** The onboarding process constructs a rich structured profile from the CV upload plus gap-fill questions. This profile improves all future generations and can travel with the user across job categories and visa stages.

---

## 4. V1 Scope Boundaries

| Dimension | V1 Scope |
|---|---|
| Job category | Werkstudent only |
| Geography | Berlin only |
| User type | International students (all visa types) |
| Submission modes | Mode 1 (Smart Review, free) only — Mode 2 (Magic Pre-fill) deferred to V1.5 |
| Languages | German and English output supported |
| Platform | PWA (Next.js) — no native iOS/Android app |
| Employer-side features | None — job seeker only |
| Payments | Not live in V1 — soft paywall experiment starts month 4 |

---

## 5. Features

### 5.1 Legal Eligibility Engine

**Purpose:** Ensure every job shown to a user is one they can legally accept.

**Inputs captured at onboarding:**
- Visa type (Student Visa / EU Citizen / Chancenkarte / Blue Card / Near Graduation)
- University and enrollment status
- German language level (A1–C2)
- Remaining days available under the 140-day rule (non-EU only)
- Weekly hours available

**Rules modeled:**
- 20-hour/week cap during semester (Student Visa, Chancenkarte)
- 140-day / 280-half-day annual limit for ancillary employment
- Minijob €556/month ceiling and BAföG income interaction
- Chancenkarte §20a AufenthG employment constraints
- Contract type eligibility per visa class

**Implementation:** Hard SQL filters applied before any jobs enter the ranking pipeline. No eligible jobs are excluded; no ineligible jobs are included.

---

### 5.2 AI Job Matching

**Purpose:** Surface the most relevant jobs from the eligible pool as a daily swipe deck.

**Ranking pipeline (4 steps):**

1. **SQL hard filter** — visa type, weekly hours, German level, contract category, location
2. **Vector similarity search** — cosine similarity between user profile embedding and job embeddings (Cohere embed-multilingual-v3)
3. **BM25 keyword re-rank** — user's skills and preferred fields used as query terms
4. **LLM reranker** — scores top-50 results: *"Would this student get an interview? 0–10"* with brief reasoning (Claude Haiku 4.5)

**Swipe deck:**
- 20–30 cards per daily session
- Each card shows: role, company, hourly rate, hours/week, overall match score, per-dimension eligibility ticks (skills, language, hours, visa, salary)
- Right swipe → apply; Left swipe → pass; Tap → full detail; Swipe up → save

**Learning loop:**
- After 50+ swipes, reranker prompt reweights based on swipe history
- Pass reasons feed back into ranking signal over time

---

### 5.3 User Profile & Onboarding

**Purpose:** Build a rich career profile that powers generation quality across all future applications.

**Onboarding flow (one-time, ~15 minutes):**

| Step | Screen | What It Captures |
|---|---|---|
| 1 | Visa type | Legal eligibility basis |
| 2 | University + language level | Institution, German proficiency |
| 3 | Work availability | Remaining 140-day allowance, weekly hours |
| 4 | Preferences | Fields of interest, min. hourly rate, location, start date |
| 5 | CV upload | PDF or DOCX (max 5MB) |
| 6 | Profile editor | AI-extracted data reviewed and corrected by user |
| 7 | Gap-fill questions | 5–8 AI-generated questions tied to profile gaps |

**Profile data model:** Structured fields — not a stored PDF. Includes education history, work experience, projects, skills, languages, and enriched context from gap-fill answers.

---

### 5.4 AI Document Generation

**Purpose:** Produce a tailored, ATS-ready application package for each role in under 60 seconds.

**Triggered by:** Right swipe, followed by 2–5 role-specific questions (~30 seconds each).

**Three artifacts generated simultaneously:**

**Tailored CV**
- Bullet points reordered to lead with what the specific job requires
- JD keywords inserted naturally (target ≥80% coverage of must-have terms)
- Language matched to job posting (German or English)
- Correct German format: *Tabellarischer Lebenslauf*, ≤2 pages for Werkstudent
- Date format: MM/YYYY throughout

**Tailored Cover Letter**
- Hiring manager name/salutation looked up where possible
- Tone matched to company type (startup / corporate / mixed) based on career page classification
- Availability statement reflecting the student's actual legal hours and start date

**Form Pre-fills**
- Structured answers for common application fields: why this role, availability date, hours per week, salary expectation, visa status statement

**Model:** Claude Sonnet 4 via LiteLLM with prompt caching enabled (profile context cached across generations).

---

### 5.5 Quality Eval Suite

**Purpose:** Guarantee a minimum quality standard before the user sees any generated material.

**6 evaluation dimensions:**

| Dimension | What It Checks | Pass Threshold |
|---|---|---|
| ATS parseability | CV correctly parsed by Softgarden / Personio / d.vinci — name, contact, all roles + dates, skills | All fields extracted correctly |
| Keyword coverage | % of must-have JD keywords present naturally in the CV | ≥80% |
| Factual consistency | Every claim traces to profile data — zero hallucination tolerance | 0 unsupported claims |
| Format compliance | Page count within limit; date format MM/YYYY; no tables or text boxes that break parsers | All rules pass |
| Tone match | Cover letter register matches company type classification | Correct register |
| Language quality | Grammar, idiom, and register for DE or EN output | No errors |

**Eval logic:**
- Runs automatically after generation, before user sees output
- Overall score below 8.0 → auto-regenerate once
- Still below 8.0 after regeneration → show materials with score breakdown and manual regenerate option
- All scores and token usage written to eval records database

**Eval judge:** Claude Haiku 4.5 (10× cheaper than Sonnet; fast enough for inline quality gates).

---

### 5.6 Application Review & Submission

**Purpose:** Let the user review, edit, and submit the generated application with confidence.

**Application review screen:**
- Three-tab view: CV / Cover Letter / Pre-fills
- Full job description visible alongside for comparison
- Edit any line inline
- Quality score card displayed (e.g. "9.3/10") with dimension breakdown
- Regenerate option available

**Submission modes:**

| Mode | Name | Cost | How It Works |
|---|---|---|---|
| 1 | Smart Review | Free (always available) | App opens company application page; user downloads PDFs and submits manually (~3–5 min) |
| 2 | Magic Pre-fill | Paid (V1.5) | Browser extension pre-fills company form in user's own browser session; user reviews and clicks Submit (~30–60 sec) |

Mode 3 (fully automated submission) is not built and not planned. This approach fails silently, creates legal exposure under EU law, and is the core weakness of competitor platforms such as Sprout.

---

### 5.7 Application Pipeline Tracker

**Purpose:** Give users a single view of all active applications and their current status.

**Status machine:**

```
Applied → Viewed → Interview Invited → Offer
                                     → Rejected
                                     → Withdrawn
        ↓
   No Response (10 days) → Follow-up Drafted
```

**Follow-up draft:**
- Triggered automatically at 10 days of no response
- AI drafts a 3-sentence professional follow-up email
- User reviews and sends via mailto link — never auto-sent

**Tap any application to:**
- View generated CV and cover letter for that application
- See current status and timeline

---

### 5.8 Interview Prep Package

**Purpose:** Prepare users for confirmed interviews using data already available in the platform.

**Triggered by:** Application status moving to "Interview Invited".

**Package contents:**

| Component | Detail |
|---|---|
| Company brief | Recent news, funding stage, products, team size |
| Likely interview questions | 8–12 questions tailored to the specific role and company type |
| STAR-method answer skeletons | Mapped from user's profile and gap-fill answers |
| German interview norms | Dress code, du vs. Sie, what to bring — shown once per user |
| Technical brush-up checklist | For technical roles only, based on JD skills list |

---

## 6. Out of Scope (V1)

The following are explicitly not in V1. Each is planned for a subsequent phase.

| Feature | Planned Phase |
|---|---|
| Minijob category support | Phase 2 (months 4–6) |
| Chancenkarte dedicated track | Phase 2 (months 4–6) |
| Odd-jobs / kurzfristige Beschäftigung | Phase 3 (months 7–9) |
| Full-time employment track | Phase 3 (months 7–9) |
| Mode 2 browser extension (Magic Pre-fill) | V1.5 (month 5–6) |
| Native iOS / Android app | Year 2 |
| Employer-side portal | Phase 5 (month 18+) |
| Hamburg / Munich expansion | Year 1.5 |
| EU country expansion | Year 2+ |
| Payments / subscription billing | Month 4 (after beta data) |
| BSS incorporation (UG/GmbH) | Month 4–5 (after BSS approval) |

---

## 7. Success Criteria

V1 is considered successful if the following conditions are met by the end of month 3 (closed beta):

| Metric | Target |
|---|---|
| Closed beta users | 10–20 active users |
| ATS pass rate | CV parsed correctly by Softgarden, Personio, and d.vinci in ≥90% of test cases |
| Quality eval average score | ≥8.5/10 across all generated applications |
| Swipe-to-application completion rate | ≥40% of right swipes result in a submitted application |
| User-reported document quality (qualitative) | Positive signal from ≥70% of beta users on CV/cover letter quality |
| Legal eligibility accuracy | Zero cases of an ineligible job appearing in a user's swipe deck |

**Decision rule:** If month 5 shows conversion below 1% and no MRR growth, the model is reviewed and a pivot to employer-side B2B is evaluated before further investment.

---

*This document governs V1 scope decisions. Any feature addition must be assessed against the V1 success criteria and roadmap before being accepted. Changes require sign-off from the founding team.*

*Pair with: competitive analysis, technical architecture doc, and 18-month roadmap for full context.*
