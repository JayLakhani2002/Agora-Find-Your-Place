# Agora Jobs — Screen Flow Document

**Document type:** Product Design Reference — Complete Screen Inventory & User Flow
**Last updated:** June 2026
**Status:** Pre-MVP / Build Phase

---

## Overview

The app is divided into four phases that map to the user's journey. Phases 1 and 2 (Setup + Discover) happen on first use. Phases 3 and 4 (Apply + Track) are the recurring experience.

```
PHASE 1 — SETUP (one-time, ~15 min)
  Screen 1 → Screen 2 → Screen 3 → Screen 4 → Screen 5 → Screen 6 → Screen 7
       Visa      Uni+Lang    Availability   Preferences   CV Upload   Profile Editor   Gap-fill Q&A

PHASE 2 — DISCOVER (5–10 min per session)
  Screen 8 → Screen 9
  Swipe Deck    Job Detail

PHASE 3 — APPLY (~5 min per application)
  Screen 10 → Screen 11 → Screen 12
  Ari Q&A     Generation    Review & Submit

PHASE 4 — TRACK (1–3 min per check-in)
  Screen 13 → Screen 14 → Screen 15
  Pipeline     Follow-up     Interview Prep

ALWAYS ACCESSIBLE
  Screen 16 — Settings / Account
```

---

## Phase 1 — Setup

> One-time onboarding. Builds the user's career profile. Takes ~15 minutes.

---

### Screen 1 — Visa Type

**Purpose:** Capture the user's legal eligibility basis. This drives all hard filters throughout the app.

**Input:** Single-select

| Option | Description |
|---|---|
| Student Visa | Non-EU student enrolled at a German university |
| EU Citizen or EU Resident | Full work rights, no hour limits |
| Chancenkarte | §20a AufenthG job-search visa; not enrolled in study |
| Post-Graduation Work Permit | 18-month job-seeker visa after completing degree |
| EU Blue Card | Skilled worker card; field-aligned roles only |

**What happens next:** Visa type is stored in the user profile and used immediately to determine which job categories and legal rules apply. Controls which fields appear on Screen 3.

---

### Screen 2 — University + Language

**Purpose:** Set institution, field of study, and German proficiency level.

**Inputs:**

| Field | Type | Notes |
|---|---|---|
| University name | Text search / autocomplete | German universities database |
| Field of study | Text search / dropdown | Used for Werkstudent field-alignment matching |
| German level | Single-select: A1 / A2 / B1 / B2 / C1 / C2 / None | Hard filter — jobs requiring a level above this are hidden |

---

### Screen 3 — Work Availability

**Purpose:** Capture employment category and approximate work capacity. Feeds the legal eligibility engine.

**Inputs:**

| Field | Type | Notes |
|---|---|---|
| Employment category | Single-select | Werkstudent / Minijob / Odd-jobs / Full-time |
| Remaining annual allowance | Single-select | Just started (full year available) / Used about half / Nearly full |
| Preferred hours per month | Slider or number input | e.g. 40–87 hrs/month |
| Available start date | Date picker | Earliest date user can start a new role |

**Legal rules modeled per category:**

| Category | Constraint Applied |
|---|---|
| Werkstudent | 140 full days OR 280 half days per year (annual pool) |
| Minijob | Earnings must not exceed €603/month (2026 rate) |
| Odd-jobs / Part-time | Same 140-day / 280-half-day annual pool as Werkstudent |
| Full-time | Requires post-graduation work permit — shown only if visa type allows |
| Chancenkarte | 20 hrs/week max while job-searching |

---

### Screen 4 — Preferences

**Purpose:** Set job search parameters. All editable later from Settings.

**Inputs:**

| Field | Type | Notes |
|---|---|---|
| Fields of interest | Multi-select | e.g. Software Engineering, Marketing, Hospitality |
| Minimum hourly rate | Optional number input | Jobs explicitly below this are hidden |
| Preferred location | City/district picker | Within Berlin in v1 |
| Preferred job language | Single-select: German / English / Both | Affects job listing language filter |

---

### Screen 5 — CV + Certificates Upload

**Purpose:** Build the user's structured career profile from existing documents.

**Options:**

| Option | Flow |
|---|---|
| Upload CV (PDF or DOCX, max 5MB) | AI extracts structured data → goes to Screen 6 |
| Build from scratch with Ari | Ari asks structured questions to build profile from zero |

**Additional input:** Upload certificates (PDF) — driving licence, language certificates (Goethe, IELTS, etc.), vocational certificates. Parsed and stored as structured qualification records.

**AI extraction:** Pulls education history, work experience, projects, skills, languages, and contact details into structured fields. Never stores the raw PDF as the source of truth — the structured data model is the profile.

---

### Screen 6 — Profile Editor

**Purpose:** Review and correct AI-extracted profile data before it is used for matching and generation.

**Design principle:** Quick, low-friction, review-only flow. Not a full form — user corrects mistakes, not re-enters data.

**Editable sections (all inline):**

| Section | Fields |
|---|---|
| Education | Degree, institution, field of study, dates, GPA (optional) |
| Work Experience | Job title, company, dates, bullet points |
| Skills | Technical skills, tools, soft skills |
| Languages | Language + level (A1–C2 or Native) |
| Certificates | Name, issuer, date |

**Behaviour:** Auto-saves on every change. Exits to Screen 7 when user taps "Looks good."

**Note:** This screen is for quick correction only. A full Master CV rewrite (optional, improves match scores) is accessible separately from Settings after onboarding is complete.

---

### Screen 7 — Gap-fill Questions

**Purpose:** Surface experience and context not visible on the CV. Enriches the profile before the first swipe session.

**Delivery:** Ari character asks questions one at a time — never all at once. Each question is either MCQ or short answer.

**Question generation logic:** Questions are dynamically generated based on:
- Employment category selected on Screen 3 (Werkstudent questions differ from Minijob questions)
- Profile gaps identified during AI extraction (e.g. no driving licence noted, no shift flexibility data, no team size context)
- 5–8 questions total per user

**Example question types:**
- "Do you have a valid driving licence?" (MCQ — Yes / No / In progress)
- "Are you comfortable working evening or weekend shifts?" (MCQ)
- "Describe a time you worked in a team. How many people and what was your role?" (Short answer)
- "What tools or software do you use most confidently at work?" (Short answer)

**On completion:** User is taken to the Swipe Deck (Screen 8). Onboarding is complete.

---

## Phase 2 — Discover

> Recurring session experience. 5–10 minutes per session.

---

### Screen 8 — Swipe Deck (Home)

**Purpose:** Browse AI-matched job cards, all pre-filtered for legal eligibility.

**Pre-deck prompt (optional):** Before entering the deck, user is offered the option to rewrite and improve their Master CV. Better Master CV quality directly raises match scores across all job cards. User can skip this.

**Swipe gestures:**

| Gesture | Action |
|---|---|
| Right swipe | Start Ari apply flow (Screen 10) |
| Left swipe | Pass — job saved to Passed tab in pipeline |
| Tap | Open job detail sheet (Screen 9) |
| Swipe up | Save for later — goes to Saved tab in pipeline |

**Each job card displays:**

| Element | Notes |
|---|---|
| Job title + company | |
| Match score | Overall rating (x/10) |
| Hourly rate / salary | Shown if available; card ranked lower if not listed |
| Job type badge | Werkstudent / Minijob / Odd-jobs / Full-time |
| Hours per week | |
| Location | |

**Deck composition (ranking pipeline — 6 stages):**

1. **Legal Hard Filter (SQL)** — removes all legally impossible jobs before any AI runs
2. **Multi-dimensional Embedding Match** — Skills, Education, and Experience embedded and matched separately (not a single blunt profile-vs-JD comparison); produces per-dimension similarity scores
3. **Structured Signal Matching** — Language level and certificates matched via structured logic (exact matching, more reliable than vectors here)
4. **Adaptive Weighted Score Assembly** — dimension scores combined with weights that adapt to employment category and (after 20+ swipes) to individual swipe history
5. **BM25 Keyword Boost** — exact keyword matching on top of weighted score for specific tools, technologies, and certifications (e.g. "Python", "Adobe XD", "DATEV")
6. **LLM Reranker + Diversity Injection** — LLM scores top 20 candidates (not all 50) with brief reasoning per dimension; deck balanced with: 2–3 cross-industry jobs, 1 stretch job (aspirational), 1 sure-thing job (confidence builder)

**Deck size:** 20–30 cards per session.

**Filter option:** Filter by job type / hours / location / salary (always visible, non-destructive).

**Learning:** System learns from every swipe. After 20+ swipes, ranking weights rebalance based on what the user engaged with.

---

### Screen 9 — Job Detail Sheet

**Purpose:** Full job information before the user decides to apply, save, or pass.

**Content:**

| Section | Detail |
|---|---|
| Full job description | Collapsible sections |
| Company info | Name, size, industry, office location |
| Salary / hourly rate | If available |
| Overall match score | x/10 |
| Per-dimension match breakdown | Skills / Education / Experience / Language / Certificates — score per dimension |
| Similar Jobs | Same-field + high-score + same-company mix |

**Actions:**
- **Apply Now** → Screen 10 (Ari apply flow)
- **Save** → goes to Saved tab in pipeline
- **Pass** → goes to Passed tab in pipeline

---

## Phase 3 — Apply

> Triggered by a right swipe or "Apply Now" tap. ~5 minutes per application.

---

### Screen 10 — Ari Apply Flow

**Purpose:** Ari guides the user through job-specific questions before AI generation begins.

**Two question sets, in order:**

**Part A — Job application questions**
Questions from the actual job application form (e.g. "Why do you want to work here?", "What is your availability?"). Ari presents these one at a time as MCQ or short answer.

**Part B — Ari's impact questions**
Targeted follow-up questions to surface key details the user may have forgotten:
- Specific tools and technologies used
- Achievements with measurable outcomes
- Budgets managed, timelines met
- Team sizes and roles

**UI behaviour:**
- Progress indicator: e.g. "Question 3 of 8"
- Go back is allowed at any point
- Progress auto-saved on exit — user can return and continue

**On completion:** Moves to Screen 11 (generation).

---

### Screen 11 — Generation Loading

**Purpose:** AI generates the Job-CV and cover letter. Gives user feedback while they wait.

**Display:**
- Ari character with loading animation
- Rotating status messages (e.g. "Reading the job description…", "Rewriting your experience bullets…", "Checking ATS compatibility…")
- Estimated wait time shown
- Cancel option available

**Background process:**
1. All inputs (job description + user answers + full profile) sent to model (Claude Opus 4.8)
2. CV rewritten with ATS-optimised bullets in *"used X to achieve Y in Z"* format
3. JD keywords inserted naturally (target ≥80% coverage)
4. German CV format applied (Tabellarischer Lebenslauf, correct date format MM/YYYY)
5. Cover letter generated if required (always if employer requests; Ari asked user if optional)
6. **Quality eval runs automatically (6 dimensions)** — if overall score <8.0, system auto-regenerates once before showing the user anything

---

### Screen 12 — Application Review

**Purpose:** User reviews, edits, and downloads the generated application materials before applying.

**Layout:**

| Tab | Content |
|---|---|
| Job-CV | Full tailored CV, every line editable inline |
| Cover Letter | Only shown if cover letter was generated |
| Job Description | Collapsible panel — visible alongside for comparison |

**Features:**

| Feature | Behaviour |
|---|---|
| Inline editing | Every line of the CV and cover letter is editable |
| ATS warning | Ari warns if user's edits risk lowering the ATS score |
| Quality score card | Overall score (e.g. "9.1/10") with per-dimension breakdown visible |
| Language switch | Toggle between German and English output |
| Regenerate | Option to regenerate from scratch with different parameters |
| Download PDF | Export Job-CV and cover letter as separate PDFs |

**Apply button:**
- For supported portals: application form pre-filled automatically; user reviews and clicks Apply on the company's own page
- For all others (Smart Review / Mode 1): app opens the company's application page; user submits manually (~3–5 min)

**Mode 2 (Magic Pre-fill)** — browser extension that pre-fills company forms in the user's own browser session; user clicks the company's own Submit button (~30–60 sec). Deferred to V1.5.

> **Mode 3 (fully automated submission) is not built and not planned.** Users always review and submit themselves.

---

## Phase 4 — Track

> Ongoing. 1–3 minutes per check-in.

---

### Screen 13 — Pipeline / Tracker

**Purpose:** Single view of all job activity across all states.

**Four tabs:**

| Tab | What it shows |
|---|---|
| Applied | All submitted applications, with current status |
| Saved | Jobs swiped up or saved from detail view |
| Passed | Jobs left-swiped — retrievable at any time |
| Declined | Applications marked Rejected or Withdrawn |

**Application status machine:**

```
Applied → Viewed → Interview Invited → Offer
                                     → Rejected
                                     → Withdrawn
        ↓
   No Response (10 days) → Follow-up section
```

**On each applied card:**
- Current status badge
- Company + role
- Date applied
- Tap → applied job detail (shows Job-CV version that was submitted + job description side-by-side)
- Manual status update available (user can drag to any status)
- **"Interview Prep" button** appears when status is "Interview Invited"

---

### Screen 14 — Follow-up Draft

**Purpose:** Re-engage the employer after 10 days of silence on an application.

**Trigger:** Automatic — appears in the Applied tab when 10 days pass with no status change.

**Contact resolution order (Ari finds contact in this order):**
1. Portal messaging — reply via the same platform the application was submitted through
2. Email extracted from the job listing (if present)
3. Manual entry — Ari prompts user to add a contact email they found (e.g. via LinkedIn or company website)

**Draft:** Ari writes a 3-sentence professional follow-up in German (for German-language jobs) or English. User sees the full draft before sending.

**Actions:**

| Action | Result |
|---|---|
| Send | Opens mailto with draft pre-filled; user clicks send in their own email client |
| Edit | User edits the draft before sending |
| Snooze | Remind again in 3 days |
| Not Interested | Moves application to Declined tab |

**Limit:** One follow-up attempt per application. Never auto-sent.

---

### Screen 15 — Interview Prep

**Purpose:** Prepare the user for a confirmed interview using data already in the platform.

**Trigger:** Application status moves to "Interview Invited". Also accessible by tapping "Interview Prep" on any Interview Invited card in the pipeline.

**Package contents:**

| Component | Detail |
|---|---|
| Company brief | Recent news, products, team size, funding stage, office location + map |
| Likely interview questions | 8–12 questions tailored to the specific role and company type |
| STAR answer skeletons | Mapped from the user's own profile and gap-fill answers |
| Common company-specific questions | Where data is available from prior applications or public sources |
| German interview norms | Dress code, du vs. Sie, what to bring — shown once per user, not repeated |
| Curated learning resource links | For skills in the JD the user is weaker on |
| Technical brush-up checklist | Technical roles only — specific tools and topics from the JD with links |

**Modes:**
- Read mode: scroll through all content
- Practice mode: Ari asks questions one at a time; user answers; Ari gives feedback
- Download: export full prep package as PDF

---

## Always Accessible — Settings & Account

### Screen 16 — Settings / Account

**Purpose:** Profile management and account controls. Accessible from bottom navigation at any time.

**Sections:**

| Section | Options |
|---|---|
| Profile | Edit education, experience, skills, languages, certificates |
| Visa details | Update visa type, remaining allowance, start date |
| Master CV rewrite | Optional full rewrite to improve match scores across all future applications |
| Employment category | Change category (e.g. switch from Werkstudent to Minijob) |
| Job preferences | Fields of interest, minimum rate, location, language, availability |
| Notifications | Granular controls per notification type |
| Job search status | Active / Paused / Found a job |
| Salary expectations | Update expected hourly rate |
| Privacy controls | Data access, GDPR data export |
| Blocked companies | Companies hidden from the swipe deck |
| Help & support | FAQ, contact |
| Referral / invite | Share Agora with other students |
| Credits | Current balance, top-up options (pay-as-you-go; no subscription) |
| Account deletion | Full GDPR cascade delete — removes all data, files, embeddings, and cache entries |

---

## Screen Summary Table

| # | Screen | Phase | Purpose |
|---|---|---|---|
| 1 | Visa Type | Setup | Legal eligibility basis |
| 2 | University + Language | Setup | Institution, field, German level |
| 3 | Work Availability | Setup | Employment category, hours, start date |
| 4 | Preferences | Setup | Job search parameters |
| 5 | CV + Certificates Upload | Setup | Build profile from documents |
| 6 | Profile Editor | Setup | Review and correct AI-extracted data |
| 7 | Gap-fill Questions | Setup | Enrich profile beyond the CV with Ari |
| 8 | Swipe Deck | Discover | Browse matched job cards |
| 9 | Job Detail Sheet | Discover | Full job info before deciding |
| 10 | Ari Apply Flow | Apply | Job-specific Q&A before generation |
| 11 | Generation Loading | Apply | AI generates Job-CV and cover letter |
| 12 | Application Review | Apply | Review, edit, download, and submit |
| 13 | Pipeline / Tracker | Track | All applications by status |
| 14 | Follow-up Draft | Track | Re-engage employer after 10-day silence |
| 15 | Interview Prep | Track | Prepare for confirmed interviews |
| 16 | Settings / Account | Always | Profile and account management |

---

*Living document. Pair with the competitive analysis, agent specs, and PRD for full context.*
*Screen designs and wireframes to be produced separately.*
