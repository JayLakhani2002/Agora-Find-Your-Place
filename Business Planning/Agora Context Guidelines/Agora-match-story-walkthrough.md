# Agora Jobs — Product & Business Overview

**Document type:** Internal reference — product decisions, user flow, team alignment, roadmap
**Last updated:** June 2026
**Status:** Pre-MVP / Build phase

---

## 1. Product Summary

Agora Jobs is a cross-platform job matching app (web, Android, iOS) for international students in Germany. The core experience is swipe-to-apply: users see only jobs they are legally eligible for, AI generates tailored CVs and cover letters that pass German ATS systems, and every application is tracked through a managed pipeline.

The platform is designed to support the full student career journey — from odd part-time and Minijob roles, through Werkstudent positions in their field of study, all the way to full-time employment at graduation.

**Target user:** International students in Germany (Chancenkarte holders are also supported but are not the primary focus)
**Primary niche (v1):** All student-eligible job types — Minijob, Werkstudent, odd-jobs, and field-aligned roles
**Expansion path:** Germany-wide from launch → EU per-country config (Year 2+)

---

## 2. Market Opportunity

- Germany has **470,000+ international students** — none of whom have a dedicated AI-powered job platform built for their specific legal situation; Berlin alone has 40,000+ as the largest single city
- International students of all nationalities face the same core barriers: unfamiliar legal categories, the 20-hour/week cap, and a job market that assumes German fluency and familiarity
- Chancenkarte holders (§20a AufenthG) are a fast-growing underserved segment — thousands issued in 2024, often with no German and no familiarity with the German job market
- Existing platforms (Stellenticket, jobicco, Berlin Startup Jobs, LinkedIn) are traditional listing boards with no legal eligibility filtering and no AI document generation
- **The legal moat:** the 140-day rule, 20-hour weekly cap, Minijob **€603/month cap** (2026 rate, tied to minimum wage of €13.90/hr — updated annually), and Chancenkarte-specific constraints are modeled nowhere else — this requires real German legal knowledge that generic competitors cannot replicate

---

## 3. Job Categories

The platform covers four employment types that map to a student's real career journey in Germany. All four categories are available from day one.

| Category | Description | Hours / Contract | Key Legal Constraint |
|---|---|---|---|
| **Werkstudent** | Field-aligned part-time roles during studies | 87 hrs/month standard contract; unused hours carry forward within the year | 140 full days OR 280 half days per year (annual pool, not a weekly cap) |
| **Minijob** | Any employer-defined role where earnings stay under the tax-free cap | Hours and pay set by employer (e.g. 25 hrs or 40 hrs/month depending on hourly rate) | Earnings must not exceed **€603/month** (2026 rate); no income tax below this threshold |
| **Odd-jobs / Part-time** | Non-skilled roles — warehouse, events, retail, gastronomy, delivery | Student contract: 87 hrs/month; Normal part-time: 120 hrs/month | Must stay within annual day allowance; same 140-day / 280-half-day pool as Werkstudent |
| **Full-time employment** | For students who have graduated and changed visa status | 170 hrs/month | Requires post-graduation work permit (18-month job-seeker visa); not available on a student visa |

> **Chancenkarte holders** (§20a AufenthG) are also supported on the platform. They follow the same 20 hrs/week work rule while job-searching and are matched to Werkstudent and part-time roles.

> **Note:** Kurzfristige Beschäftigung (short-term employment, 70 days/year) is not included in the platform scope.

The user selects their employment category and visa type at signup. Legal filters, CV format, cover letter tone, and interview prep content all adapt based on the selection.

---

## 4. User Flow

### 4.1 Journey Overview

Users move through four phases. Phases 1 and 2 happen on first use; Phases 3 and 4 are the ongoing repeat experience.

---

**Phase 1 — Setup** *(one-time, ~15 minutes)*

New users complete a tap-through onboarding that captures their legal eligibility, then upload their CV. AI extracts the CV into structured data. The user reviews and corrects the extracted data, then answers 5–8 gap-fill questions that surface experience and context not visible on the CV. The result is a rich career profile — not just a PDF.

---

**Phase 2 — Discover** *(5–10 minutes per session)*

Before entering the swipe deck, the user has the option to **rewrite and improve their Master CV** — better Master CV quality directly raises match scores across all job cards.

The app then presents a swipe deck of matched job cards, all pre-filtered to the user's legal eligibility — they never see a job they cannot take. Each card shows a match score based on their current Master CV, work experience, education background, language level, certificates, and skills.

- **Right-swipe** → apply flow
- **Left-swipe** → pass (job saved to a Passed Jobs tab, retrievable later)
- **Tap** → full job detail
- **Swipe up** → save for later

The system learns from every swipe and improves ranking over time (v1).

**Swipe deck access is tier-based:**
- New users get a **1-week free trial** with full access
- After the trial, the deck size and app services are unlocked via **credit top-ups** (pay-as-you-go; no subscription required)

---

**Phase 3 — Apply** *(~5 minutes per application)*

After swiping right, **Ari** (the AI assistant character) guides the user through the application one step at a time:

1. **Job application questions** — Ari presents each question from the actual job application as an MCQ or short answer, one at a time. User answers all of them.
2. **Ari's impact questions** — Ari then asks targeted follow-up questions to surface key details the user may have forgotten: specific tools used, achievements with measurable outcomes, budgets managed, timelines met. One question at a time.
3. **AI generation** — All inputs (job description + user answers + profile) go to the model which:
   - Rewrites the CV with ATS-optimised bullet points in the *"used X to achieve Y in Z"* format
   - Inserts job-description keywords naturally
   - Applies correct German CV format (fonts, structure, Tabellarischer Lebenslauf conventions)
   - Generates a tailored cover letter if required (compulsory when the employer requests one; optional when they do not — Ari asks the user)
4. **Review and edit** — User reviews the generated Job-CV and cover letter side-by-side with the job description. Every line is editable before downloading. User has full control.
5. **Apply** — User downloads the tailored PDFs and applies on the company's website. For supported job portals, application forms are pre-filled automatically using the Job-CV data — user just reviews and clicks Apply.

---

**Phase 4 — Track** *(1–3 minutes per check-in)*

All applications appear in a status pipeline across four dashboard tabs: **Applied**, **Saved (Apply Later)**, **Passed**, and **Declined**.

**Follow-up after 10 days of no response:**
Ari drafts a follow-up message for the user to review and send. Contact is resolved in this order:
1. Portal messaging — reply via the same platform the user applied through
2. Email extracted from the job listing (if present)
3. Manual entry — Ari prompts the user to add a contact email if they found one (e.g. via LinkedIn or company website)

The user always reviews and sends — never auto-sent.

**Interview prep** (triggered when status moves to "Interview Invited", accessible from dashboard):
- Company brief — recent news, products, team size, funding stage
- 8–12 role-specific likely interview questions based on the JD and company type
- STAR-method answer skeletons mapped from the user's own profile and experience
- Common questions asked at that specific company (where data is available)
- Curated learning resource links for skills in the JD the user is weaker on
- Technical brush-up checklist (technical roles only) — specific tools and topics from the JD with links

---

### 4.2 Screen Inventory

| # | Screen | Phase | Purpose | Key Actions / Features |
|---|---|---|---|---|
| 1 | Visa type | Setup | Capture legal eligibility basis | Select: Student Visa / EU Citizen or EU Resident / Chancenkarte / Post-Graduation Work Permit / EU Blue Card |
| 2 | University + language | Setup | Set institution, field of study, and German level | University name; field of study; German level (A1–C2 + None) |
| 3 | Work availability | Setup | Capture employment category and approximate work capacity | Employment category (Werkstudent / Minijob / Odd-jobs / Full-time); remaining annual allowance (approximate: Just started / Used about half / Nearly full); preferred hours/month; available start date |
| 4 | Preferences | Setup | Set job search parameters | Fields of interest (multiple); minimum hourly rate (optional); preferred location; preferred job language; all editable later |
| 5 | CV + Certificates upload | Setup | Build user profile | Upload CV (PDF or DOCX) or build from scratch with Ari; upload certificates (PDF); AI extracts structured profile data |
| 6 | Profile editor | Setup | Review and correct AI-extracted data | Edit education, experience, skills, languages, certificates inline; auto-saves; quick and low friction |
| 7 | Gap-fill questions | Setup | Enrich profile beyond the CV | Ari asks targeted questions one at a time (MCQ or short answer); strategy defined in separate document |
| 8 | Swipe deck *(home)* | Discover | Browse matched job cards | Right = start Ari apply flow; left = pass (saved to Passed tab); tap = job detail; swipe up = save for later; match score (x/10) on each card; salary shown if available; filter option by job type / hours / location / salary |
| 9 | Job detail sheet | Discover | Full job info before deciding | Full job description (collapsible); company info; salary if available; match score overall + per-dimension (Skills, Education, Experience, Language, Certificates); Similar Jobs (same-field + high-score + same-company mix); Apply Now / Save / Pass buttons |
| 10 | Ari apply flow | Apply | Ari guides user through job-specific questions before generation | Job application questions one at a time (MCQ or short answer); Ari impact questions (tools, achievements, timelines, budgets); progress indicator (e.g. "Question 3 of 8"); go back allowed; progress auto-saved on exit |
| 11 | Generation loading | Apply | Ari generates Job-CV and cover letter | Ari character with loading animation and rotating status messages; estimated wait time shown; auto-regeneration hidden; cancel option available |
| 12 | Application review | Apply | Review, edit, and submit generated materials | Job-CV tab; Cover Letter tab (only if generated); collapsible job description panel; every line editable inline; Ari warns on heavy edits affecting ATS score; language switch (German / English); quality score with dimension breakdown; regenerate option; download PDF; Apply button (portal pre-fill or manual) |
| 13 | Pipeline / tracker | Track | Manage all job activity | Tabs: Applied / Saved / Passed / Declined; statuses: Applied → Viewed → Interview Invited → Offer → Rejected / Withdrawn; No Response (10 days) moves to own section; user can manually update status; Interview Prep button appears on Interview Invited |
| 14 | Follow-up draft | Track | Re-engage employer after 10 days of silence | Ari drafts follow-up in German (Germany jobs) or English; contact order: portal → extracted email → manual entry; options: Send / Edit / Snooze (3 days) / Not Interested (moves to Declined); one follow-up attempt |
| 15 | Interview prep | Track | Prepare for confirmed interviews | Company brief (news, products, team size, funding, office location/map); 8–12 role-specific questions; STAR answer skeletons from user profile; common company-specific questions; curated learning resource links; technical brush-up checklist with links (technical roles only); practice mode with Ari feedback; downloadable as PDF |
| 16 | Settings / account | Account | Profile and account management | Edit profile; visa details; certificates; Master CV rewrite; employment category change; granular notifications; job search status; preferred locations; salary expectations; privacy controls; blocked companies; help & support; referral/invite; credit balance and top-up; account deletion (GDPR) |

---

## 5. Core Features

### 5.1 Legal Eligibility Filtering

Hard filters applied at the matching layer. Users never see jobs they cannot legally take.

**Hard filters (jobs are hidden entirely):**
- Visa type incompatibility (e.g. full-time role shown to student visa holder)
- German level required explicitly by employer and user is below it
- Employment category mismatch (e.g. Werkstudent user seeing full-time-only roles)
- Working hours exceeding user's legal allowance (140-day / 280-half-day annual pool; Minijob €603/month cap)
- Salary explicitly stated below user's minimum rate expectation
- Education stream — only a hard filter when the employer explicitly states a required degree field

**Soft signals (job remains visible but match score is lowered):**
- Education stream misalignment when employer has not stated a required degree
- Missing certificates or preferred qualifications
- Experience level slightly above or below the role
- Salary not listed — job shown but ranked lower since user cannot verify it meets their expectation

### 5.2 AI-Powered Job Matching

Swipe deck generated through a 6-stage ranking pipeline:

**Stage 1 — Legal Hard Filter (SQL)**
Instantly removes all legally impossible jobs based on visa type, employment category, working hours, German level, salary, and education stream (where explicitly required). Fast and cheap — runs first before any AI.

**Stage 2 — Multi-dimensional Embedding Match**
Skills, Education, and Experience are embedded separately and matched against the corresponding sections of each job description — not one blunt full-profile vs full-JD comparison. Produces a precise per-dimension similarity score for each dimension.

**Stage 3 — Structured Signal Matching**
Language level and certificates are matched via structured logic rather than embeddings. Exact matching is more reliable here than vector similarity.

**Stage 4 — Adaptive Weighted Score Assembly**
All dimension scores are combined with weights that adapt to:
- Employment category (Werkstudent weights education higher; Minijob weights availability higher; Odd-jobs weights hours and location)
- User swipe history — after 20+ swipes, weights rebalance based on what the user engaged with

**Stage 5 — BM25 Keyword Boost**
Keyword matching applied on top of the weighted score for specific tools, technologies, and certifications mentioned in the JD (e.g. "Python", "Adobe XD", "DATEV"). Catches exact matches that embeddings sometimes blur.

**Stage 6 — LLM Reranker + Diversity Injection**
LLM scores only the top 20 candidates (not 50) with brief reasoning per dimension — 60% cheaper than scoring 50. The deck is then balanced with:
- 2–3 jobs from different industries to prevent tunnel vision
- 1 stretch job (slightly above current level — aspirational)
- 1 sure-thing job (high match, easy apply — builds confidence)

Match score displayed on every job card: overall rating (x/10) + per-dimension breakdown (Skills, Education, Experience, Language, Certificates). Salary shown on card if available.

### 5.3 CV and Cover Letter Generation

Triggered after a right-swipe. Produces three artifacts:

- **Tailored CV** — bullet points reordered to lead with what the job requires; JD keywords inserted naturally; language (DE or EN) matched to the job; correct German format (Tabellarischer Lebenslauf, ≤2 pages for Werkstudent/Minijob, up to 3 pages for full-time)
- **Tailored cover letter** — correct German salutation (hiring manager looked up where possible); tone matched to company type (startup vs. corporate); availability statement reflecting the student's actual legal hours
- **Form pre-fills** — structured answers for common application fields: why this role, availability date, hours per week, salary expectation, visa status statement

### 5.4 Quality Eval Suite (6 Dimensions)

Runs automatically after generation, before the user sees anything. If the overall score is below 8.0, the system auto-regenerates once. If still below 8.0, it shows the materials with the score breakdown and a manual regenerate option.

| Dimension | What It Checks |
|---|---|
| ATS parseability | CV correctly parsed by Softgarden / Personio / d.vinci — name, email, phone, all jobs + dates, all skills |
| Keyword coverage | % of must-have JD keywords present naturally in the CV (target ≥80%) |
| Factual consistency | Every claim in the CV traces to profile data — zero hallucination tolerance |
| Format compliance | Page count within limit; date format MM/YYYY; no tables or text boxes that break parsers |
| Tone match | Cover letter register matches company career page classification (formal / startup / mixed) |
| Language quality | Grammar, idiom, and register for DE or EN output |

All scores and token usage are written to the eval records database. This dataset compounds as a quality and research asset over time.

### 5.5 Application Submission Modes

| Mode | Name | Cost | How It Works |
|---|---|---|---|
| 1 | Smart Review | Free (always available) | App opens the company's application page; user downloads tailored PDFs and submits manually (~3–5 min) |
| 2 | Magic Pre-fill | Paid (v1.5) | Browser extension pre-fills the company's form in the user's own browser session; user reviews and clicks the company's own Submit button (~30–60 sec) |

Mode 3 (fully automated AI submission) is not built. Competitor analysis shows this approach fails silently and creates legal exposure under EU law.

### 5.6 Application Pipeline Tracker

All applications tracked through a status machine:

```
Applied → Viewed → Interview Invited → Offer / Rejected / Withdrawn
                ↓
         No Response (10 days) → Follow-up Drafted
```

Follow-up emails are drafted by AI and always sent by the user — never auto-sent.

### 5.7 Interview Prep Package

Generated automatically when application status moves to "Interview Invited":

- Company brief — recent news, funding stage, products, team size
- 8–12 likely interview questions tailored to the specific role and company type
- STAR-method answer skeletons mapped from the user's profile and gap-fill answers
- German interview norms — dress code, du vs. Sie, what to bring (shown once per user)
- Technical brush-up checklist — for technical roles only, based on skills listed in the JD

---

## 6. Key Product Decisions

| Decision | Choice Made | Rationale |
|---|---|---|
| Primary niche (v1) | Werkstudent for international students in Berlin | Underserved, hyper-specific, no real competition |
| Category build order | Sequential: Werkstudent → Minijob → odd-jobs → full-time → Chancenkarte | Each category generates learnings that improve the next; avoids spreading too thin |
| Geography | Berlin deep → Hamburg/Munich (Year 1.5) → EU per-country config (Year 2+) | Cheapest expansion is within Germany; EU requires per-country config for visa rules, CV formats, ATS vendors, and job sources |
| ATS quality bar | Beat GPT-5 on German ATS pass rate — verifiable, publishable claim | GPT-5 has no Werkstudent context, no German ATS testing pipeline, and no Lebenslauf format awareness |
| Submission model | Mode 1 (free) + Mode 2 (paid extension); no Mode 3 autopilot | Legally clean; no silent-failure risk; avoids Sprout's core product weakness |
| Pricing decision | Deferred to month 4–5 after beta data; three-cohort test at €4.99 / €6.99 / €9.99 | Cannot price before knowing real cost-per-active-user and which features drive retention |
| Funding approach | Apply for BSS (€2,500/founder/month) at month 4–5; do not incorporate before approval | Incorporating UG/GmbH before BSS approval kills eligibility — a €20,000+ mistake |
| Architecture | Multi-region, multi-category, per-country config schema from day one | EU country expansion becomes a config change, not a code rewrite |
| India outreach | Word-of-mouth via one EduOptions contact + arrival brochure; no agent-recruits-agent structure | MLM structures are illegal under German UWG/EU law, kill BSS eligibility, and are rejected by Stripe and app stores |

---

## 7. Tech Stack

### Backend
- Python + FastAPI
- PostgreSQL + pgvector (structured data and embeddings in a single database)
- Celery + Redis (background jobs, rate limiting, caching)
- Alembic (migration management)

### AI / ML
- **Generation LLM:** Claude Sonnet 4 via LiteLLM — prompt caching enabled from day one (~50% token cost reduction on repeat profile context); LiteLLM allows model swap in one line
- **Eval judges:** Claude Haiku 4.5 — 10x cheaper than Sonnet; fast enough for inline quality gates
- **Embeddings:** Cohere embed-multilingual-v3 — strongest DE+EN bilingual performance
- **Eval framework:** Inspect AI (Anthropic open-source)

### Frontend
- Next.js 14 (App Router) + Tailwind + shadcn/ui, deployed as PWA
- No native app in v1 — PWA is sufficient for beta
- Hosted on Vercel Frankfurt (fra1) for GDPR compliance

### Auth, Payments, Storage
- **Auth:** Clerk — GDPR EU data residency, SOC 2 certified, correct httpOnly cookie handling by default
- **Payments:** Stripe — subscriptions + SEPA Direct Debit; Stripe Tax handles German VAT automatically (set up month 4, not day 1)
- **File storage:** Cloudflare R2 EU region — CVs and generated PDFs served via signed URLs only; no egress fees

### Observability
- **App errors:** Sentry
- **LLM tracing:** Langfuse — per-call cost, latency, and quality score tracking; required for burn rate control
- **Product analytics:** PostHog EU Cloud — funnels, session replays, A/B tests
- **Infrastructure metrics:** Prometheus + Grafana (month 2)

**Total infra cost at MVP scale: under €50/month.** Primarily LLM API calls; prompt caching reduces this as volume grows.

### Security (built in from day one)

- **UUIDs on all user-facing IDs** — prevents enumeration attacks
- **Postgres row-level security** — every query scopes to the authenticated user at the database level, not just the application layer
- **Prompt injection defence** — all external content (job descriptions) wrapped in XML tags with explicit untrusted-data system instructions
- **File upload validation** — PDF and DOCX only; 5MB hard limit; parsed server-side in a sandboxed subprocess; never served from the app domain
- **LLM cost abuse prevention** — hard token limits per request; per-user regeneration rate limit of 5/hour; Langfuse flags per-user spend outliers
- **GDPR right to erasure** — account deletion removes all Postgres rows, R2 files, pgvector embeddings, Redis cache entries, and Sentry events; tested before beta launch
- **Scraping compliance** — robots.txt respected automatically; 1 request per 5 seconds per domain; direct API partnerships with Stellenticket and Berlin Startup Jobs pursued from month 1

---

## 8. Team

| Role | Responsibilities |
|---|---|
| Founder / CEO | AI engineering, product direction, technical architecture |
| Marketing co-founder | Customer interviews, community building, content, Indian student outreach, university partnerships |
| Operations co-founder | Partnerships, process, non-product business functions |
| Investor | Capital and network; not day-to-day operational |

Founders' agreement (equity, vesting, roles) to be signed within 4–6 weeks of starting, before serious code is written. Standard 4-year vest with 1-year cliff for operational co-founders. Investor terms handled separately.

Engineering is AI-first: the build is structured as Claude Code agents executing under the founder/CEO's direction. A human engineer hire (via BSS funds) is planned for month 6 if product growth demands it.

---

## 9. 18-Month Roadmap

| Phase | Months | Milestones |
|---|---|---|
| **Phase 1** | 1–3 | Werkstudent track full build; eval suite tested against Softgarden / Personio / d.vinci; closed beta with 10–20 users |
| **Phase 2** | 4–6 | Open beta (50 users); Minijob + Chancenkarte support; interview prep; soft paywall launch (pricing experiment); BSS consultation booked |
| **Phase 3** | 7–9 | Odd-jobs + full-time track; outcome learning loop; eval methodology blog post published; BSS application submitted |
| **Phase 4** | 10–12 | Unified "income strategy" layer — recommends job mix by visa type, income needs, and career goals; Werkstudent to full-time transition planning for graduating students |
| **Phase 5** | 13–18 | Employer-side B2B; Hamburg/Munich expansion; EU per-country config populated; potential Series A conversation |

EU country expansion (Netherlands, France, Spain) is Year 2+ work. Each country requires its own visa rule set, CV format conventions, ATS vendor list, language model config, and job sources. The config schema is designed in Phase 1 so country rollout requires no code changes.

---

## 10. Revenue Model

**Free tier:** Mode 1 (Smart Review) only.
**Paid tier:** Mode 2 (Magic Pre-fill extension) + premium features.

Pricing is set at month 4–5 based on beta data. A three-cohort experiment runs at €4.99 / €6.99 / €9.99 — decision is made on best conversion x retention, not highest conversion alone.

### 24-Month Revenue Projections

Three scenarios: Conservative (2% conversion), Expected (3.5% conversion), Optimistic (5% conversion + early employer revenue).

| Period | Conservative | Expected | Optimistic |
|---|---:|---:|---:|
| Y1 Apr (launch) | €68 | €85 | €198 |
| Y1 Sep | €326 | €503 | €1,391 |
| Y1 Dec | €918 | €1,539 | €4,262 |
| **Y1 total** | **€3,281** | **€5,304** | **€14,737** |
| Y2 Mar | €1,494 | €2,744 | €7,441 |
| Y2 Sep | €3,149 | €5,992 | €15,036 |
| Y2 Dec | €4,834 | €8,936 | €21,654 |
| **Y2 total** | **€31,130** | **€58,050** | **€147,761** |
| **2-year total** | **€34,400** | **€63,400** | **€162,500** |

**Key notes:**
- Year 1 is primarily free beta; meaningful revenue starts April (month 4)
- October spikes in both years reflect Wintersemester international student arrivals — the primary acquisition window
- July dip reflects summer slowdown; plan for it
- Expected case end of Year 2: ~€9,000 MRR (~€107,000 annual run-rate) — the threshold where the business supports 2–3 founders
- Revenue sources: subscriptions (net of Stripe fees) + one-time interview-prep purchases + employer B2B starting month 18
- Not included: Chancenkarte segment upside, university career-centre contracts, sponsored listings

**Operating principle: plan to the conservative case; anything above is upside.**

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Willingness to pay below model (conversion <1%) | Run three-cohort pricing experiment at month 5; pivot to employer-side B2B earlier if needed |
| Co-founder misalignment on time and commitment | Weekly accountability cadence from week 1; explicit scope ownership per co-founder; month-6 team review |
| Job supply density (too few eligible jobs post-filter, thin swipe deck) | Dedicated planning session: additional scraping sources (EURES, Make-it-in-Germany.de), Zenjob/Jobtoday API partnership, direct API agreements with Stellenticket and Berlin Startup Jobs |

**Decision rule:** If month 5 shows no MRR growth, conversion below 1%, and poor retention — pivot or wind down. Do not push harder without validating the model.

---

## 12. Long-Term Vision

The 5-year target is not "the app where students find Werkstudent jobs." It is the career operating system international students use throughout their entire time in Germany — Werkstudent in year 1, Chancenkarte holder landing their first role, full-time junior at graduation, senior three years later. Same profile, same trust, same platform.

A European platform that owns one clear category: international student and new-arrival career growth in the EU.

---

*Living document. Last updated June 2026. Pair with the competitive analysis and project brief for additional detail.*
