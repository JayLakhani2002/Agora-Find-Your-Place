# Agora Jobs — Product & Business Overview

**Document type:** Internal reference — product decisions, user flow, team alignment, roadmap
**Last updated:** June 2026
**Status:** Pre-MVP / Build phase

---

## 1. Product Summary

Agora Jobs is a mobile-first job matching platform for international students in Germany. The core experience is swipe-to-apply: users see only jobs they are legally eligible for, AI generates tailored CVs and cover letters that pass German ATS systems, and every application is tracked through a managed pipeline.

The platform is designed to support the full student career journey from a first Minijob through to full-time employment at graduation.

**Target user:** International students (and Chancenkarte holders) in Berlin
**Primary niche (v1):** Werkstudent roles
**Expansion path:** Berlin → Germany → EU (per-country config, Year 2+)

---

## 2. Market Opportunity

- Berlin has 40,000+ international students; no dedicated AI-powered job platform exists for their specific legal situation
- Indian students are the largest single cohort (49,000+ in Germany) — acute pain from blocked accounts running low, unfamiliar legal categories, and the 20-hour/week cap
- Chancenkarte holders (§20a AufenthG) are a fast-growing underserved segment — thousands issued in 2024, often with no German and no familiarity with the German job market
- Existing platforms (Stellenticket, jobicco, Berlin Startup Jobs, LinkedIn) are traditional listing boards with no legal eligibility filtering and no AI document generation
- **The legal moat:** the 140-day rule, 20-hour limit, Minijob €556 cap, BAföG impact, and Chancenkarte-specific constraints are modeled nowhere else — this requires real German legal knowledge that generic competitors cannot replicate

---

## 3. Job Categories

The platform covers five employment types that map to a student's real career journey in Germany. Categories are built sequentially — v1 is Werkstudent-only. Each category generates data and learnings that improve the next.

| Category | Description | Key Legal Constraint |
|---|---|---|
| **Werkstudent** | Career-track part-time roles, 10–20 hrs/week during semester | 20 hrs/week max during semester |
| **Minijob** | Small roles (gastronomy, retail, admin) | Max €556/month |
| **Odd-jobs / kurzfristige Beschäftigung** | Warehouse shifts, events, gig work | 70 working days/year max |
| **Full-time employment** | For students near graduation or switching to a work visa | Different visa class; no 20-hr cap |
| **Chancenkarte** | §20a AufenthG job-search visa holders; not enrolled in study | 20 hrs/week max while searching |

The user selects their category at signup. Legal filters, CV format, cover letter tone, and interview prep content all adapt based on the selection.

---

## 4. User Flow

### 4.1 Journey Overview

Users move through four phases. Phases 1 and 2 happen on first use; Phases 3 and 4 are the ongoing repeat experience.

---

**Phase 1 — Setup** *(one-time, ~15 minutes)*

New users complete a tap-through onboarding that captures their legal eligibility, then upload their CV. AI extracts the CV into structured data. The user reviews and corrects the extracted data, then answers 5–8 gap-fill questions that surface experience and context not visible on the CV. The result is a rich career profile — not just a PDF.

---

**Phase 2 — Discover** *(5–10 minutes per session)*

The app presents a daily swipe deck of 20–30 job cards. All cards are pre-filtered to the user's legal eligibility — they never see a job they cannot take. Each card shows a match score with a per-dimension breakdown. Right-swipe to apply, left to pass, tap to see full details, swipe up to save.

The system learns from every swipe and improves the ranking over time.

---

**Phase 3 — Apply** *(~5 minutes per application)*

After swiping right, the user answers 2–5 short role-specific questions. AI then generates three artifacts simultaneously: a tailored CV, a tailored cover letter, and form pre-fills. A 6-dimension quality eval runs automatically before the user sees anything. If quality is below threshold, it regenerates. The user reviews everything side-by-side with the job description, can edit any line, and submits via Mode 1 (free) or Mode 2 (paid).

---

**Phase 4 — Track** *(1–3 minutes per check-in)*

All applications appear in a status pipeline. After 10 days of no response, the AI drafts a follow-up email for the user to review and send. When an interview is confirmed, a full interview prep package is generated automatically.

---

### 4.2 Screen Inventory

| # | Screen | Phase | Purpose | Key Actions / Features |
|---|---|---|---|---|
| 1 | Visa type | Setup | Capture legal eligibility basis | Select: Student visa / EU citizen / Chancenkarte / Blue Card / Near graduation |
| 2 | University + language | Setup | Set institution and German level | Enter university name; select German level (A1–C2) |
| 3 | Work availability | Setup | Capture remaining legal work capacity | Enter remaining days under 140-day rule (non-EU only); weekly hours available |
| 4 | Preferences | Setup | Set job search parameters | Fields of interest; minimum hourly rate; location; start date; employment category |
| 5 | CV upload | Setup | Start profile extraction | Upload PDF or DOCX (max 5MB); AI extracts structured data |
| 6 | Profile editor | Setup | Review and correct AI-extracted CV | Edit education, experience, projects, skills, languages inline; auto-saves |
| 7 | Gap-fill questions | Setup | Enrich profile beyond the CV | Answer 5–8 AI-generated questions tied to profile gaps and employment category |
| 8 | Swipe deck *(home)* | Discover | Daily matched job cards | Right = apply; left = pass; tap = detail; swipe up = save; match score + eligibility ticks on each card |
| 9 | Job detail sheet | Discover | Full job info before deciding | Full job description; company info; match score breakdown per dimension; "Apply now" CTA |
| 10 | Job-specific questions | Apply | Capture context for AI generation | 2–5 short questions tailored to the specific role (~30 seconds each) |
| 11 | Generation loading | Apply | AI generating tailored materials | Progress indicator; eval running in background; quality score revealed when ready |
| 12 | Application review | Apply | Review and submit generated materials | CV tab; cover letter tab; pre-fills tab; edit any line inline; regenerate option; quality score card (e.g. "9.3/10"); "Open application page" (Mode 1, free); "Pre-fill" (Mode 2, paid) |
| 13 | Pipeline / tracker | Track | Manage all active applications | Status columns: Applied / Viewed / Interview Invited / Rejected / No Response; tap any application to view generated materials |
| 14 | Follow-up draft | Track | Re-engage employer after silence | AI-drafted 3-sentence follow-up at 10 days of no response; user reviews and sends via mailto |
| 15 | Interview prep | Track | Prepare for confirmed interviews | Company brief; 8–12 likely questions; STAR-method answer skeletons; German interview norms; technical brush-up checklist (technical roles only) |
| 16 | Settings / account | Account | Profile and account management | Edit profile; update visa details; notification preferences; account deletion (GDPR) |

---

## 5. Core Features

### 5.1 Legal Eligibility Filtering

Hard filters applied at the matching layer. Users never see jobs they cannot legally take. Filters include: visa type, German level required, weekly hours, contract type, and employment category. The 140-day rule, 20-hour weekly cap, Minijob €556 threshold, BAföG impact, and Chancenkarte restrictions are all modeled.

### 5.2 AI-Powered Job Matching

Daily swipe deck generated through a four-step ranking pipeline:

1. SQL hard filter — visa type, hours, German level, contract category
2. Vector similarity search — cosine similarity between user profile embedding and job embeddings
3. BM25 keyword re-rank — using the user's skills and preferred fields as query terms
4. LLM reranker — scores each of the top 50 jobs "would this student get an interview? 0–10" with brief reasoning

Match score displayed on every job card: overall score + per-dimension ticks (skills, language, hours, visa eligibility, salary).

After 50+ swipes, the reranker prompt reweights based on the user's swipe history.

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
