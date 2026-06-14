# Agora — Business Plan
**Document:** BP-001 · **Version:** 1.0 · **Stage:** Pre-seed · **HQ:** Berlin, Germany · **Date:** June 2026

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem & Solution](#2-problem--solution)
3. [Product](#3-product)
4. [Market Size — TAM / SAM / SOM](#4-market-size--tam--sam--som)
5. [Business Model](#5-business-model)
6. [Competitive Landscape](#6-competitive-landscape)
7. [Go-To-Market Strategy](#7-go-to-market-strategy)
8. [Team](#8-team)
9. [Key Risks](#9-key-risks)

---

## 1. Executive Summary

**Agora is a swipe-to-apply job platform for job seekers aged 18–35 in Europe.** Users swipe through a deck of pre-matched, eligibility-checked jobs; on a right swipe, our AI drafts a tailored CV and cover letter, runs them through a 6-dimension quality and ATS check, and hands the user a ready-to-send application they review and submit themselves. An interactive guide character, **Ari**, walks beside the user from onboarding through interview prep.

We are entering through the most acute, underserved wedge in the European market: **international students in Berlin** trying to find legal work under Germany's complex student-employment rules. This is a segment of **40,000+ in Berlin alone (350,000+ nationally)** with no dedicated, legally-aware AI tooling — and it is the segment the founding team lives in.

Agora's defensibility is depth no generalist has built: legal eligibility modeled as a **hard filter** (140-day rule, 20-hour/week cap, €556 Minijob ceiling, Chancenkarte §20a), German-ATS-tested document generation (Softgarden, Personio, d.vinci), and EU-only GDPR-first data residency. From that wedge we expand outward — to all young job seekers in Germany, then DACH, then the EU — on an architecture built for per-country configuration rather than rebuild.

**Monetization is two-sided:** a B2C freemium subscription (live from ~Q2 2027) and a B2B recruiter subscription that opens access to a pool of verified, eligibility-checked candidates (from month ~18). Critically, the first 12+ months of founder living costs are covered by a **non-dilutive Berlin grant (Berliner Startup Stipendium, up to ~€90k for three founders)**, so investor capital is spent on growth and team, not survival.

| Snapshot | Detail |
|---|---|
| **Tagline** | *Find your place.* |
| **Stage** | Pre-seed / early stage |
| **Beachhead** | International students (Werkstudent / Chancenkarte) in Berlin, 18–35 |
| **Expansion** | All 18–35 job seekers in Germany → DACH → EU |
| **Model** | B2C freemium (€5.99/mo Pro) + B2B recruiter SaaS (€99–€499/mo) |
| **Moat** | German legal depth + German ATS eval + EU data residency + community + founder-as-user |
| **Funding plan** | Non-dilutive grants (BSS + GründungsBONUS Plus, ~€140k) **+** €600k pre-seed |
| **Platform** | Mobile-first PWA today; native iOS/Android Year 2 |

---

## 2. Problem & Solution

### 2.1 The problem

For a young job seeker — and acutely for an international student arriving in Germany — the job search is three compounding problems at once:

1. **Legal complexity (the killer).** Non-EU students operate under a layered, frequently-misunderstood set of rules: a **20-hour/week cap** during semester, a **140-day / 280-half-day** annual ancillary-work limit, the **€556/month Minijob ceiling** and its BAföG interaction, and **Chancenkarte §20a** constraints for job-search-visa holders. **No major platform — LinkedIn, Indeed, StepStone, Stellenticket — models any of this.** Students routinely apply to jobs they cannot legally take, wasting time and risking their visa status.

2. **Application document barriers.** German employers expect the *Tabellarischer Lebenslauf* — strict conventions on length, date format (MM/YYYY), section order, photo. Generic AI (ChatGPT) produces CVs that fail German ATS (Softgarden, Personio, d.vinci) because they have no German-market training and no Werkstudent format awareness.

3. **Fragmented discovery and friction.** Scan multiple boards → manually check eligibility → write a fresh CV + cover letter → track in a spreadsheet → remember to follow up. Hours per application, high abandonment, especially for lower German proficiency.

> The result: the highest-motivation job seekers in Europe are served worst by the tools that exist. Spray-and-pray auto-appliers make it worse — recruiter blacklisting and <2% callback rates are now documented across that category.

### 2.2 The solution

Agora collapses the entire loop into **match → generate → track**, in under five minutes per application:

- **Only legal jobs, ever.** Eligibility is enforced at the database query layer, not as a UI toggle. A user never sees a job they cannot lawfully take.
- **Application materials tested before you see them.** Every generated CV/cover letter passes a 6-dimension eval (ATS parseability, keyword coverage, factual consistency, format compliance, tone, language quality); below threshold, it auto-regenerates.
- **You always click submit.** No auto-submission at any tier — a deliberate legal, ethical, and trust decision (and our defense against the employer backlash killing competitors).
- **Ari guides the whole way.** A warm, knowledgeable character who turns confusion into the next concrete step — onboarding, empty states, interview prep, social content.

---

## 3. Product

**Core loop:** `Profile → Legal hard filter → AI ranking → Swipe deck → Generate (CV + cover letter + form pre-fills) → 6-dim quality eval → User review & submit → Pipeline tracker → Follow-up / interview prep.`

| Capability | What it does | Why it matters |
|---|---|---|
| **Swipe-to-apply deck** | 20–30 ranked, eligible cards/session; right-swipe to apply, tap for detail | Mobile-native, zero-friction; the behavior the 18–35 cohort already has |
| **Legal eligibility engine** | Hard SQL filters on visa, hours, 140-day balance, Minijob ceiling, language | The category-defining moat; nobody else has it |
| **AI matching** | SQL filter → pgvector similarity (Cohere multilingual v3) → BM25 re-rank → LLM reranker (Haiku) | Relevance + learns from swipe history |
| **AI document generation** | Tailored *Tabellarischer Lebenslauf* + cover letter + form pre-fills (Claude Sonnet, prompt-cached) | German-ATS-ready output per role in <60s |
| **CV improvisation** | Reorders/surfaces the right experience per JD; ≥80% must-have keyword coverage | "Your thesis was on LLMs but your CV says 'Python'" — fixed |
| **6-dimension eval suite** | Parse-tests against Softgarden/Personio/d.vinci before display | Publishable quality proof; auto-regenerate if <8.0 |
| **Ari (interactive guide)** | Onboarding, tips, interview coach, brand voice | Retention + brand; the Duolingo-owl of job search |
| **Pipeline tracker + follow-ups** | Status machine; auto-drafts a follow-up at 10 days no-response (never auto-sent) | Daily engagement; "Agora got me the interview" stories |
| **Interview prep** | Company brief, likely questions, STAR skeletons, German interview norms | Extends value apply → interview |

**Platform:** Next.js 15 PWA (no App Store cut — a structural margin advantage), tRPC/Hono backend, PostgreSQL/Neon (EU Frankfurt) + pgvector (HNSW), Drizzle ORM, Clerk auth, Stripe billing, Crawlee ingestion, Claude (Sonnet generation / Haiku eval) + Cohere embeddings via AWS Bedrock `eu-central-1`. **All PII stays in the EU.**

---

## 4. Market Size — TAM / SAM / SOM

> Sized two ways: **revenue** (top-down, online-recruitment + HR-tech spend) and **users** (bottom-up, our actual reachable funnel). All figures are estimates with stated assumptions; treat as directional.

### 4.1 Revenue view (top-down)

| Layer | Definition | Estimate (annual) | Assumption / basis |
|---|---|---|---|
| **TAM** | European online recruitment + job-seeker SaaS spend | **~€10–12B** | EU online recruitment market, mid-2020s scale; includes job-board, recruiter SaaS, and consumer career tools |
| **SAM** | German online recruitment + young-jobseeker & SME-recruiter tooling | **~€2.0–2.5B** | Germany is ~20–25% of EU recruitment spend; StepStone/Indeed/Xing-Onlyfy core market |
| **SOM (Year 3)** | Agora's realistic capture: Berlin+Hamburg B2C subs + early B2B recruiter SaaS | **~€0.35–0.5M revenue** | Bottom-up from §4.2 funnel; <0.03% of SAM — deliberately conservative |

### 4.2 User view (bottom-up — the number we actually operate against)

| Segment | Size | Geography |
|---|---|---|
| Job seekers 18–35 in the EU | ~45–55M (active churn pool) | EU — long-term TAM |
| Young job seekers in Germany (18–35) | ~6–8M | Germany — Phase-2 expansion market |
| **International students in Germany** | **350,000+** | National — primary expansion within wedge |
| Indian students in Germany (high-intent, mobile-first) | 49,000+ | National |
| **International students in Berlin** | **40,000+** | **V1 beachhead** |
| Werkstudent-eligible students (Berlin) | ~25,000 | Conservative SOM base |
| Chancenkarte holders (§20a, national) | 10,000+ and growing | Secondary wedge |

**Reachable funnel (bottom-up SOM):**

| Horizon | Free users | Pro users (3.5% conv.) | Note |
|---|---|---|---|
| Year 1 | 3,000–5,000 | ~105–175 | Berlin, community-led, near-zero CAC |
| Year 2 | 10,000–15,000 | ~350–525 | + native app, + Hamburg, + early B2B |
| Year 3 | 25,000–40,000 | ~900–1,400 | + Munich, + paid acquisition, + DACH config |

> **Why a niche wedge is the right TAM strategy:** international students are *hyper-clustered* (WhatsApp/Telegram groups, campus, country associations) → near-zero CAC. They have *acute, time-boxed pain* → urgency and willingness to pay. And they *churn into adjacent segments* (student → Chancenkarte → Blue Card → full-time) → the same user grows with us into the broader 18–35 market. We do not need to win "all of European recruitment"; we need to own one defensible square and expand by configuration.

---

## 5. Business Model

Two-sided, with the consumer side as the wedge and the recruiter side as the margin multiplier.

### 5.1 B2C — Freemium subscription (live ~Q2 2027)

| Tier | Price | Includes |
|---|---|---|
| **Free** | €0 | Smart Review (Mode 1), core AI matching & generation (fair-use cap), basic tracker — *real* AI value, not a crippled preview |
| **Pro** | **€5.99/mo** (planning midpoint; tested at €4.99/€6.99/€9.99) | Unlimited applications, Magic Pre-fill (Mode 2 browser extension), priority matching, interview prep, follow-up drafts |
| **Pro Annual** | ~€47.99/yr (~€4.00/mo) | Pro, ~33% discount |

- **Mode 3 (fully automated submission) is permanently excluded** at any price — legal/ethical/quality decision and our differentiation from the spray-and-pray category.
- **Unit economics:** variable cost ~€0.06–0.10 per generated application (Sonnet + Haiku eval + embeddings, prompt-cached); ~€4.50–5.00 gross margin per Pro user/month. **LTV ~€27 net** (6-month avg search) vs. **target CAC <€5** → **LTV:CAC ≥ 5:1**.
- **No App Store / Play cut** (PWA-first) — a structural margin edge to protect.

### 5.2 B2B — Recruiter subscription (from month ~18)

Berlin SMEs and startups hiring Werkstudenten and junior internationals get a structured, **eligibility-checked, pre-scored** candidate pipeline drawn exclusively from verified Agora profiles — the mirror image of the student-side problem.

| Tier | Price/mo | For |
|---|---|---|
| Starter | €99 | 1 active role, basic search |
| Growth | €249 | Multiple roles, weighted scoring, blind-screening |
| Pro | €499 | Talent-pool access, sponsored listings, team seats |

**Business rule:** employer revenue structurally subsidizes low student pricing. B2B is the higher-ASP engine (5–10× revenue multiplier potential per the internal model) that turns a beloved student tool into a venture-scale business.

### 5.3 Why this model wins
- Consumer side builds the **proprietary asset** (verified, eligibility-checked candidate profiles) that makes the B2B side uniquely valuable and hard to copy.
- Two revenue lines de-risk the raise: even if B2C conversion lands at the low end, the B2B pivot is already on the roadmap, not a hail-mary.

---

## 6. Competitive Landscape

Agora competes on two fronts: **incumbent job boards/networks** (broad, shallow, not built for this user) and **AI-apply tools** (mostly US/English, no German legal depth).

### 6.1 Incumbents

| Player | What they are | Gap for our user |
|---|---|---|
| **LinkedIn** | Professional network + Easy Apply | No eligibility modeling, no German CV generation, no visa/hours logic; internationals without a German network are invisible; not where Indian/Turkish/Brazilian students discover apps |
| **Indeed** | World's largest job board | Volume without filtering; no legal eligibility, no German-ATS-tailored documents, no guidance |
| **StepStone** | Germany's dominant paid job board (Onlyfy/Xing group) | Employer-paid listings, German-language-heavy, no AI tailoring, no student-visa logic, no swipe UX |
| **Glassdoor** | Reviews + listings | Research tool, not an application engine; no eligibility or generation layer |

> Incumbents own *supply and reach*. None solve *eligibility, German-ATS document quality, or friction* for a young international job seeker. We integrate with their world (apply into their listings) rather than fight them on listing volume.

### 6.2 Direct AI-apply competitors

| Player | Threat | Why we beat them |
|---|---|---|
| **Sorce** (US, YC, 850k users) | **High** | Best swipe UX in category — but US-only, zero German legal/ATS depth; 6–12-month build to reach parity in Germany |
| **AIApply** (global) | Medium | Strong brand & Interview Buddy — but no mobile app, no German ATS testing, no visa filtering, no swipe |
| **JobCopilot** (mass auto-apply) | Low–Med | Spray-and-pray, recruiter-blacklisted, <2% callback — the model we explicitly reject |
| **CareerBoom.ai** (Germany) | Medium (locally) | Only Germany-focused rival, but a job board with AI *filters*, not a career OS; no swipe, no deep legal modeling, no eval suite |
| **Sprout** (US) | Low | Original swipe inspiration; failed on no-editing + Mode-3 silent failures — we ship the corrected version |

### 6.3 Positioning

> **Quality-first × Germany-specific** — the upper-right quadrant no competitor occupies. US tools are quality-ish but global/shallow on Germany; CareerBoom is German but volume/shallow on product depth.

**Moat depth (time-to-replicate):** legal eligibility filtering (6–12 mo), German ATS eval suite (3–6 mo + ongoing), Tabellarischer Lebenslauf conventions (3–6 mo), Chancenkarte end-to-end flow (6–12 mo), EU GDPR-first architecture (a refactor for US tools), and **founder-as-target-user community access (not replicable by an outside team in Year 1).**

---

## 7. Go-To-Market Strategy

**Thesis:** international students are hyper-clustered and trust peer recommendations — so we don't need broad reach, we need to be *the default recommendation in specific communities*. CAC is near-zero in Year 1 by design; paid spend waits until organic unit economics are proven.

| Phase | Window | Motion |
|---|---|---|
| **0 — Foundations** | Q3 2026 | Trademark clearance (EUIPO/DPMA), lock handles/domain, build-in-public on LinkedIn/X, messaging bank from real student language |
| **1 — Customer dev as marketing** | Q3 2026 | 25 Mom-Test interviews across cohorts (Indian, Chinese, Turkish, Brazilian) and universities; recruit 5–10 design partners (first advocates) |
| **2 — Community-led launch** | Q4 2026–Q1 2027 | Seed 20+ WhatsApp/Telegram/Reddit/Discord communities; **"Welcome to Berlin" brochure** (genuine arrival guide, Ari on the cover, app subtle inside); referral loop (1 month free Pro per paying referral) |
| **3 — Channel engine** | 2027 | Ari-led explainer content (TikTok/IG/Shorts: "the 140-day rule in 30s"), ASO, SEO on Werkstudent legal queries, campus ambassadors, **published ATS eval benchmark** ("our CVs pass German ATS 94% vs ChatGPT 71%") |
| **4 — Paid acquisition** | Year 2 (post-proof) | Meta/Google **only after €1k MRR and >3% conversion**; protect the no-App-Store-cut margin |

**Seasonality is a weapon:** the **October Wintersemester arrival wave** is the single largest annual acquisition window. Every campaign is planned backward from late-September arrivals.

**North-star metric:** *interviews landed per active user per month.* Early proxy: activation = first tailored application sent within 7 days (target ≥40%).

---

## 8. Team

Three full-time co-founders, structured around the three things this business must execute: **build a legally-deep AI product, run German-market operations and compliance, and win hyper-local communities.**

| Role | Function | Mandate |
|---|---|---|
| **CEO** | Tech & Product | Owns the product, the AI/eval architecture, the legal-eligibility engine, and the technical moat. Final call on roadmap and what we don't build (Mode 3, spray-and-pray). |
| **COO** | Operations | Owns incorporation & BSS compliance, GDPR/DPA and legal, job-supply partnerships (Stellenticket, university career centers), data/ATS partnerships, finance and hiring. |
| **CMO** | Marketing | Owns community-led growth, the Ari brand, content engine, campus-ambassador program, the October campaign, and conversion experiments. |

**Why this team wins:**
- **Founder is the target user** — a Berlin international student with lived experience of the exact pain and *direct access to the communities that are the distribution channel.* This cannot be replicated by a US or UK team in Year 1.
- **Berlin-based**, embedded in the BSS startup ecosystem, with a clear professor-mentor and university-partnership path.
- **Discipline already demonstrated**: a written V1 scope, eval suite, financial model, and explicit "do-not-build" list (Mode 3 excluded on legal grounds) — evidence of founder judgment, not just enthusiasm.

**Near-term hires (post-raise):** one full-stack/AI engineer and one growth/community hire; a fractional German employment-law advisor on retainer to maintain the legal moat.

---

## 9. Key Risks

| Risk | Mitigation |
|---|---|
| Free→Pro conversion < 1% | Three-cohort pricing experiment; €2.99 entry tier option; accelerate B2B — already on roadmap |
| Sorce / a US tool expands to Germany | 6–12-month legal/ATS lead; brand + community moat built in Year 1; published eval data as a credibility asset |
| Job supply thin after legal filtering | Multiple sources (EURES, Make-it-in-Germany, Stellenticket API), 24h caching, direct employer partnerships, Minijob category Phase 2 |
| BSS grant denied | §20 job-seeker permit as personal safety net; GründungsBONUS Plus / APX / angel fallback; lean infra burn either way |
| GDPR exposure (sensitive CV/visa data) | EU-only infrastructure, PII redaction before LLM, signed DPAs, tested right-to-erasure before beta |
| Employer backlash against AI applications | Human-approval gate is the defense; quality-not-volume thesis; never build Mode 3 |

---

*This business plan synthesizes Agora's internal BRD, V1 scope, market/competitive analysis, GTM plan, and financial model (all in `Business Planning/`). Figures are planning estimates with stated assumptions; revalidate before each funding cycle.*
