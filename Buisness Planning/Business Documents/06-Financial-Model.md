# Financial Model & Cost Estimate
**Project:** Agora Jobs · **Document:** FIN-001 · **Version:** 1.0  
**Status:** Draft · **Date:** 2026-06-08 · **Owner:** Founding Team  
**Source documents:** `../Buisness Planning/technical tech stack/Agora-Jobs-Cost-Estimate.md` · `../Buisness Planning/Agora Context Guidlines/v1-project-scope.md` · `../Buisness Planning/Founders Visa and Funding Guidlines/werkstudent-founder-roadmap.md`

---

## Table of Contents
1. [Financial Assumptions](#1-financial-assumptions)
2. [Revenue Model](#2-revenue-model)
3. [Revenue Projections](#3-revenue-projections)
4. [Unit Economics](#4-unit-economics)
5. [Cost Model — Infrastructure by Stage](#5-cost-model--infrastructure-by-stage)
6. [Cost Drivers & Control Levers](#6-cost-drivers--control-levers)
7. [Funding & Runway](#7-funding--runway)
8. [Scenarios & Sensitivity](#8-scenarios--sensitivity)
9. [Financial Risks](#9-financial-risks)

---

## 1. Financial Assumptions

### 1.1 Market Sizing Assumptions

| Assumption | Value | Basis |
|------------|-------|-------|
| Target market (Berlin international students) | 40,000+ | V1 scope doc; Berlin alone |
| Addressable via organic outreach Year 1 | 5,000 | 12.5% of TAM within reach |
| TAM expansion (Hamburg, Munich — Year 2) | +60,000 | Estimated German student population |
| Chancenkarte holders (national) | 10,000+ growing | §20a AufenthG program growth |

### 1.2 Timeline Anchor (aligned to the Founder Roadmap)

> **Correction (F-C2 / F-H7):** Earlier drafts used an undefined "Month N" and put payments at "Month 4". That contradicts the BSS rules in `../Buisness Planning/Founders Visa and Funding Guidlines/werkstudent-founder-roadmap.md`, which prohibit economic activity before the grant is funded. The table below anchors every financial event to the **real calendar** from the founder roadmap. There are two clocks: the **build calendar** (now→launch) and **"BSS month N"** (months counted from when the grant funding actually starts, ~March 2027).

| Event | Calendar | Note |
|-------|----------|------|
| Build MVP, customer dev, recruit co-founders + professor mentor | Now → Aug 2026 | No incorporation, no payments |
| Thesis done → apply §20 job-seeker permit | Aug/Sep 2026 | Visa safety net |
| **BSS application submitted** (no economic activity yet) | Oct 2026 | "Have NOT started selling" is an eligibility condition |
| BSS jury pitch | Jan/Feb 2027 | |
| **BSS funding starts** (= "BSS month 0") | ~Mar 2027 | Pizza job ends; full-time on startup |
| Register UG (haftungsbeschränkt) | During BSS, after funding | NEVER before funding — kills eligibility |
| **Subscription billing goes live** (first revenue) | ~BSS month 3 (≈ May/Jun 2027) | First euro of MRR is here, not "Month 4" of build |
| Decision point (grow vs. pivot) | BSS month 5 | |
| Browser extension (enables paid Mode 2) | By BSS month 3 | Paid tier depends on it |
| Native mobile app | Year 2 (post-BSS) | V1 is PWA only (F-H5) |

> **Hard constraint:** No Stripe transactions or paid subscriptions before BSS funding begins (~Mar 2027). The revenue model's "Year 1" (below) therefore denotes the **first 12 months of monetized operation (~Q2 2027 → Q2 2028)** — not the first 12 months of building. This anchoring removes the prior contradiction where revenue appeared before the grant.

### 1.3 Conversion Rate Assumptions

| Funnel Stage | Conservative | Expected | Optimistic |
|-------------|-------------|---------|-----------|
| Free → Pro conversion | 2.5% | 3.5% | 6% |
| Monthly retention (Pro) | 60% | 72% | 80% |
| Viral coefficient (referrals per active user/month) | 0.05 | 0.15 | 0.30 |

### 1.4 Cost Assumptions

- All infrastructure costs in USD; EUR conversion at 0.93 (June 2026)
- LLM costs assume model routing optimized: Haiku 4.5 for eval/classification (~80% of calls), **Sonnet 4.x** for final generation (~20%). Opus 4.8 is NOT used in the hot path (F-H1).
- Prompt caching reduces repeat-context costs by ~40% at steady state
- All EU regions; +5–10% vs. US pricing

---

## 2. Revenue Model

### 2.1 Tiered Subscription

| Tier | Price | What's Included |
|------|-------|-----------------|
| **Free** | €0/month | Smart Review (Mode 1, always available); core generation (generous — possible anti-abuse soft cap TBD, see PRD FR-22a); basic matching |
| **Pro** | Set by experiment; **modeled at €5.99/month** | Unlimited applications; Magic Pre-fill (Mode 2); priority matching; interview prep; follow-up drafts |
| **Pro Annual** | ~€47.99/year (~€4.00/mo) | Same as Pro monthly; ~33% discount |

> **Pricing note (F-M8):** Final price is determined by the month-3-of-BSS three-cohort experiment at **€4.99 / €6.99 / €9.99** (decided on conversion × retention, not headline conversion). The founder roadmap's "€5.99" is used as the planning midpoint in the projections below. Earlier drafts hard-coded €4.99; treat all figures as midpoint estimates pending the live experiment.

> **Mode 3 (fully automated submission) is permanently excluded** from all tiers. This is a legal, ethical, and product quality decision, not a pricing decision. It is not offered at any price point.

### 2.2 Employer-Side Revenue (V2+, month 18+)

Employer features are out of scope for V1 financial planning. Included as future reference:
- Talent pool access (SaaS subscription per seat)
- Sponsored job listings
- Verified Werkstudent candidate profiles

### 2.3 Revenue Recognition Rules

| Rule | Detail |
|------|--------|
| Monthly subscriptions | Recognized monthly on subscription date |
| Annual subscriptions | Recognized ratably over 12 months (not on receipt) |
| BSS constraint | Zero revenue before BSS application submitted (Month 4 minimum) |
| Stripe processing | ~2.9% + €0.25 per transaction (net revenue shown below) |

---

## 3. Revenue Projections

> **Reconciliation note (F-C3):** These figures are the **canonical projections** from `../Buisness Planning/Agora Context Guidlines/werkstudent-match-story-walkthrough.md` §10, and they match the BRD (`01-BRD-Business-Requirements.md` §7.3). An earlier draft of this section contained an independently-invented ramp (Year-1 ≈ €1,576) that contradicted both — that error is corrected here. There is now one set of revenue numbers across the suite.

### 3.1 Revenue Scenarios (MRR snapshots + annual totals, EUR)

"Year 1 / Year 2" = monetization years, anchored to billing go-live (~Apr 2027; see §1.2), **not** build months.

| Period | Conservative (2% conv.) | Expected (3.5% conv.) | Optimistic (5% + early employer) |
|--------|------------------------:|----------------------:|---------------------------------:|
| Launch MRR (≈ Apr 2027) | €68 | €85 | €198 |
| Mid-Y1 MRR (≈ Sep 2027) | €326 | €503 | €1,391 |
| End-Y1 MRR (≈ Dec 2027) | €918 | €1,539 | €4,262 |
| **Monetization Year 1 total** | **€3,281** | **€5,304** | **€14,737** |
| Y2 Mar MRR | €1,494 | €2,744 | €7,441 |
| Y2 Sep MRR | €3,149 | €5,992 | €15,036 |
| Y2 Dec MRR (exit rate) | €4,834 | €8,936 | €21,654 |
| **Monetization Year 2 total** | **€31,130** | **€58,050** | **€147,761** |
| **2-year total** | **€34,400** | **€63,400** | **€162,500** |

### 3.2 Projection Notes

- Monetization Year 1 is mostly free beta; meaningful revenue builds through the year.
- **October spikes** in both years reflect the Wintersemester international-student arrival window (the primary acquisition moment). **July dips** reflect the summer slowdown — plan for both.
- **Expected case ends monetization Year 2 at ~€8,936 MRR (≈ €107k annual run-rate)** — the threshold the founder roadmap identifies as supporting 2–3 founders.
- Revenue sources: subscriptions (net of Stripe fees) + one-time interview-prep purchases + employer B2B starting ~month 18. **Not** included: Chancenkarte upside, university career-centre contracts, sponsored listings.
- **Operating principle: plan to the conservative case; anything above is upside.**

### 3.3 MRR Milestones (monetization calendar)

| Milestone | MRR Target | Timing |
|-----------|-----------|--------|
| First euro of MRR | ~€85 | Launch (≈ BSS month 3 / Apr 2027) |
| €1,000 MRR | ~€1,000 | ~End of monetization Year 1 |
| €2,000 MRR (founder-roadmap target before BSS ends) | ~€2,000 | Early monetization Year 2 |
| ~€9,000 MRR (≈ €107k ARR; supports 2–3 founders) | ~€8,936 | End of monetization Year 2 |

---

## 4. Unit Economics

### 4.1 Cost per Active User (CPAU) by Stage

| Stage | Monthly Cost | Active Users | CPAU |
|-------|-------------|-------------|------|
| Stage 1 (MVP, 0–500 users) | $120–350 | 100–500 | $0.70–3.50 |
| Stage 2 (Growth, 500–10k) | $1,200–4,300 | 500–10,000 | $0.43–2.40 |
| Stage 3 (Scale, 10k–100k+) | $6,000–55,000 | 10,000–100,000 | $0.55–0.60 |

At Stage 2 expected midpoint: CPAU ~$1.00/month vs. €4.99 Pro price = **~5× gross margin on variable costs**.

### 4.2 Cost per Application Generated

| Component | Cost (estimated) |
|-----------|-----------------|
| **Sonnet 4.x** generation (CV + cover letter + pre-fills, profile context cached) | ~$0.05–0.09 |
| Haiku eval run (6 dimensions) | ~$0.003 |
| Embedding (Cohere v3, per profile/job — amortized) | ~$0.0001 |
| Worker compute per job | ~$0.001 |
| **Total per application (happy path)** | **~$0.055–0.095** |
| With one auto-regeneration (worst case) | **~$0.11–0.19** |

> **Correction (F-H1):** A prior draft listed "Opus generation ~$0.04–0.08". That was wrong twice over: generation now uses **Sonnet**, and Opus output pricing (~$75/Mtok) would actually put a single CV+letter generation at **~$0.25–0.35** — over 3× the entire €0.10 budget. Using Opus in the hot path would break the unit economics. Sonnet keeps the happy path inside budget; the regeneration path is the figure to watch.

At **€5.99/month** Pro pricing with ~15 applications/user/month: variable cost per Pro user ≈ **$0.83–1.43/month** (happy path). Gross margin per Pro user ≈ **€4.50–5.00** after variable LLM costs — provided generation stays on Sonnet and prompt caching is enabled.

### 4.3 LTV / CAC Target Ratio

| Metric | Target |
|--------|--------|
| Average subscription length (Pro) | 5–7 months (job search duration) |
| LTV at €5.99/mo × 6 months | ~€35.94 (gross); ~€27 net of variable cost |
| Target CAC (organic/community) | < €5 |
| Target LTV:CAC ratio | ≥ 5:1 |

Community-led growth (WhatsApp groups, campus ambassador program) is the primary CAC strategy. Paid acquisition is not planned until Year 2, after organic unit economics are proven.

---

## 5. Cost Model — Infrastructure by Stage

### 5.1 Stage 1 — MVP / Pre-launch (0–500 users)

**Goal:** Ship and validate. Free/hobby tiers wherever possible.

| Component | Service | Plan | Est. USD/mo |
|-----------|---------|------|-------------|
| Web hosting | Vercel | Pro (1 seat) | $20 |
| Database | Neon (EU Frankfurt) | Launch | $19 |
| Auth | Clerk (**EU residency needs Business tier**) | Business | ~$100+ ⚠️ |
| Redis / queue | Upstash (EU) | Pay-as-you-go | ~$5 |
| Object storage | Scaleway (EU) | Pay-as-you-go | ~$5 |
| Worker container | Railway | Hobby/Dev | $5–20 |
| Email | Resend | Free → Pro | $0–20 |
| Error tracking | Sentry | Team | $0–26 |
| Analytics | PostHog (EU) | Free tier | $0 |
| Payments | Stripe | Pay-per-transaction | % only |
| **Fixed subtotal** | | | **~$150–265** |
| LLM (Claude **Sonnet** generation + Haiku eval via Bedrock EU) | usage | low volume | ~$20–100 |
| Embeddings (Cohere v3 via Bedrock EU) | usage | low | ~$2–10 |
| Scraping (Playwright/Apify) | usage | low volume | ~$20–80 |
| **Realistic total** | | | **~$195–455/mo** |
| **EUR equivalent** | | | **~€180–425/mo** |

> **Clerk note (F-H2):** The fixed subtotal rose from the earlier "~$75–165" because EU data residency forces **Clerk Business (~$100+/mo)**, not Free/Pro. The alternative — **self-hosting Auth.js against EU Postgres** — removes this line entirely (≈$0 + engineering time). This is open decision OAQ-02; the table above takes the conservative (Clerk Business) path. Choosing Auth.js returns the realistic total to roughly **~$95–355/mo**.
>
> **Reconciliation (F-M5):** The product overview claimed "under €50/month at MVP scale". That figure assumed all-free tiers, negligible LLM volume, and no EU-residency auth premium. The itemized estimate here (€180–425, or ~€95–355 with self-hosted auth) is the realistic planning number. Use the itemized figure; treat €50 as an unachievable floor.

### 5.2 Stage 2 — Early Growth (500–10,000 users)

**Goal:** Reliability, real automation volume, mobile + extension live.

| Component | Service | Plan | Est. USD/mo |
|-----------|---------|------|-------------|
| Web hosting | Vercel | Pro + usage | $50–150 |
| Database | Neon (EU) | Scale | $69–200 |
| Auth | Clerk | Pro + MAU | $100–300 |
| Redis / queue | Upstash (EU) | Pay-as-you-go | $20–60 |
| Object storage | Scaleway | usage | $20–60 |
| Workers | Railway/Render | 2–3 containers | $60–200 |
| Workflows | Inngest / Trigger.dev | Team | $50–100 |
| Email | Resend | Pro/Scale | $20–90 |
| Error tracking | Sentry | Business | $80–200 |
| Analytics | PostHog (EU) | usage | $50–200 |
| Logging | Axiom / Better Stack | Team | $25–100 |
| Mobile builds | Expo EAS | Production | $99 |
| Secrets | Doppler | Team | $0–30 |
| **Fixed subtotal** | | | **~$700–1,800** |
| LLM (Claude via Bedrock EU) | usage | medium | $300–1,500 |
| Scraping | usage | medium | $200–1,000 |
| **Realistic total** | | | **~$1,200–4,300/mo** |
| **EUR equivalent** | | | **~€1,116–3,999/mo** |

### 5.3 Stage 3 — Scale (10,000–100,000+ users)

**Goal:** Cost efficiency, EU-region containers at scale.

| Component | Est. USD/mo |
|-----------|-------------|
| Web (Vercel Enterprise or self-hosted AWS) | $500–2,000 |
| Database (Neon Business or RDS eu-central-1 + replicas) | $500–2,500 |
| Auth (Clerk Enterprise or self-hosted Auth.js) | $0–1,500 |
| Redis / queue (Upstash or self-managed) | $100–500 |
| Object storage | $100–800 |
| Workers (AWS ECS Fargate, EU, autoscaled) | $500–3,000 |
| Workflows (Inngest / Temporal) | $200–1,000 |
| Observability (Sentry + PostHog + Axiom) | $400–1,500 |
| Other (email, secrets, CI) | $200–600 |
| **Fixed subtotal** | **~$3,000–14,000** |
| LLM (Claude Sonnet generation + Haiku volume, high traffic) | $2,000–30,000+ |
| Scraping | $1,000–10,000+ |
| **Realistic total** | **~$6,000–55,000+/mo** |

---

## 6. Cost Drivers & Control Levers

### 6.1 Dominant Variable Cost: LLM Inference

LLM inference is the largest variable cost. It scales directly with application volume and must be managed proactively.

| Lever | Savings Impact | Implementation Phase |
|-------|---------------|---------------------|
| Model routing: Haiku for eval/classification (~80% of calls), **Sonnet** for final generation (Opus reserved for offline benchmarking only — F-H1) | **High** | Phase 3 |
| Prompt caching for repeated profile + JD context | **High** | Phase 3 |
| Generation deduplication (cache CV draft if job/profile unchanged) | **High** | Phase 3 |
| Batch non-urgent generation jobs (off-peak scheduling) | **Medium** | Phase 3 |
| Token budget per generation (enforce max output length) | **Medium** | Phase 3 |

### 6.2 Second Driver: Scraping / Browser Automation

Managed browsers (Playwright via Browserbase, Apify) bill per browser-minute.

| Lever | Savings Impact |
|-------|---------------|
| Prefer official job board APIs (Indeed, Stellenticket) over scraping | **High** |
| Cache job listings (TTL 24 hours); only re-scrape changed listings | **High** |
| Deduplicate by `(source, externalId)` before any AI processing | **High** |
| Schedule scraping during off-peak hours | **Medium** |

### 6.3 Infrastructure Optimization Path

| Lever | Phase | Notes |
|-------|-------|-------|
| Neon scale-to-zero during inactivity (dev/staging) | Phase 0 | Free while idle |
| Turborepo remote cache (CI minutes savings) | Phase 0 | Low-cost, high-frequency win |
| Self-host PostHog at 10k+ MAU | Stage 3 | Significant savings at scale |
| Migrate Auth.js self-hosted at enterprise scale | Stage 3 | €0 at >10k MAU |
| Read replicas before scaling Neon primary | Stage 2–3 | Cheaper than vertical scaling |

---

## 7. Funding & Runway

### 7.1 BSS (Berliner Startup Stipendium) Funding Ladder

> **Correction (F-C2):** A prior draft stated "€1,500/month + €300/co-founder, €21,600 total". That is wrong. Per `werkstudent-founder-roadmap.md`, BSS is a **living stipend of €2,500 per founder per month**.

| Item | Amount | Conditions |
|------|--------|-----------|
| BSS living stipend | **€2,500 / founder / month** | Working prototype; team of 2–4 founders; **professor mentor from a supporting Berlin university** (UE Berlin is NOT in the consortium → apply as external team via TU/HTW/BHT etc.); Berlin residence for all founders; **no economic activity before funding starts** |
| 1 founder | €2,500 / month | |
| 2 founders | €5,000 / month | |
| 3 founders | €7,500 / month | |
| Duration | 6–12 months | Funding starts ~March 2027 |
| **Total (2 founders × 12 months)** | **up to €60,000** | (vs. the erroneous €21,600 previously stated) |

> **Pre-condition:** No economic activity before funding starts. Do not incorporate the UG and do not enable Stripe billing before the grant is funded (~March 2027). Register the UG and turn on payments *during* the funding period (~BSS month 3).

### 7.2 Funding-Constrained Runway Analysis

BSS is a **personal living stipend** (founder salary-equivalent), not a company infrastructure budget. It removes the founders' personal income pressure so they can work full-time; the company's cash costs (infra) are separately small.

Assuming 2 founders, BSS funded ~March 2027:

| Line | Monthly |
|------|---------|
| BSS stipend income (2 founders) | **+€5,000** (personal) |
| Company infra cost — Stage 1 (Sonnet routing, EU) | **−€180–425** |
| Net position pre-revenue | Founders fully covered; company burn is only infra |
| Runway under BSS | 6–12 months of full-time runway with founders' living costs covered |

Infra at Stage 1 (€180–425/mo) is comfortably absorbable. The binding objective during BSS is not survival — it is reaching **€2,000+ MRR before BSS ends** (founder-roadmap target) to qualify for the next funding stage.

### 7.3 Breakeven Analysis

Two distinct breakevens:

| Breakeven | Definition | Timing |
|-----------|-----------|--------|
| **Infra breakeven** | Revenue ≥ company infra cost (~€200–500/mo) | Reached at ~40–85 Pro users @ €5.99 → early monetization Year 1 |
| **Founder-sustaining** | Revenue ≥ ~€5,000/mo (replaces BSS stipend for 2 founders) | ~850 Pro users @ €5.99 → ~monetization Year 2 (expected case ends Y2 at ~€8,936 MRR) |

> The first breakeven is easy and early; the second is the real goal and aligns with the expected-case exit MRR (~€9k) at the end of monetization Year 2.

### 7.4 Next Funding Milestone

If BSS is secured and traction is demonstrated (250+ Pro users, €1,000+ MRR), the natural next funding source is:

| Source | Amount | Stage / Conditions |
|--------|--------|-------|
| **GründungsBONUS Plus (IBB)** | up to **€50,000** non-repayable | After incorporation; company <18 months old; tech/digital; Berlin HQ. Bridge between BSS ending and angel money. |
| **APX** (Axel Springer + Porsche) | ~€50,000 for ~5% | Very early stage |
| **Angel round** (EU B2C / HRtech focus) | €150,000–500,000 for 10–20% | Target at €2,000–5,000 MRR |
| **HTGF / seed VC** | €500k–3M | Year 2–3 |

> Source: founder roadmap funding ladder. EXIST is *not* the planned path here (the founder graduates Aug/Sep 2026 and moves to §20→§21, with BSS as the primary grant); GründungsBONUS Plus is the documented post-BSS bridge.

---

## 8. Scenarios & Sensitivity

### 8.1 Key Sensitivities

| Variable | -50% Impact | Base Case | +50% Impact |
|----------|------------|-----------|------------|
| LLM cost per application | €0.022 → €0.07 margin boost | €0.044–0.084 | €0.066 → margin compression |
| Free→Pro conversion rate | 1.75% → 53 Pro users @ M12 | 3.5% → 105 Pro users | 5.25% → 158 Pro users |
| Monthly retention | 36% → faster churn | 72% → moderate churn | 90% → compounding base |
| Time-to-launch (BSS delay) | Revenue delayed 2+ months | Month 5 billing | — |

### 8.2 Upside Scenario Triggers

| Trigger | Revenue Impact |
|---------|---------------|
| Employer-side B2B (month 18+) | Potential 5–10× revenue multiplier; higher ASP (€99–499/mo per employer) |
| Hamburg / Munich expansion (Year 2) | 2–3× addressable market |
| Chancenkarte program growth | Pre-enrolled audience of motivated job-seekers; ideal cohort |
| Partnership with Berlin university job offices | Low-CAC institutional distribution |

### 8.3 Downside Scenario Responses

| Risk Event | Response |
|-----------|---------|
| Free→Pro conversion < 1% at Month 5 | Review pricing; evaluate lower €2.99 entry point; accelerate employer-side pivot |
| LLM costs 3× projected at scale | Enforce token budgets; route more tasks to Haiku; cache aggressively |
| BSS application rejected | Extend runway by delaying Stage 2 infra upgrades; focus on free-tier growth |
| Job supply thin after legal filtering | Add Minijob category; partner with specific Berlin employers directly |

---

## 9. Financial Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| RISK-FIN-01 | BSS application rejected — loss of up to **€60,000** grant (2 founders × €2,500 × 12) | Medium | High | Apply early; meet all pre-conditions; secure professor mentor; no prior economic activity; §20 fallback keeps founder in Germany |
| RISK-FIN-02 | Revenue delayed beyond plan (BSS funding starts ~Mar 2027; billing ~BSS month 3) | Medium | Medium | §20 unlimited-work permit + pizza-job income bridge until funding; keep Stage-1 infra minimal |
| RISK-FIN-03 | LLM costs exceed projections at growth stage | Medium | High | Model routing + caching implemented in Phase 3 before growth stage |
| RISK-FIN-04 | Free→Pro conversion below 1% | Medium | High | Early qualitative beta feedback; pricing experiments Month 4 |
| RISK-FIN-05 | Scraping costs spike due to portal anti-bot measures | Medium | Medium | Official API partnerships; caching; rate limiting |
| RISK-FIN-06 | Stripe processing fees reduce margin | Low | Low | Factored into net revenue calculations; accept as cost of distribution |
| RISK-FIN-07 | Visa/work constraints restrict founder economic activity | Medium | High | Strict compliance with student visa 20-hr/week cap; BSS is stipendium not employment |

---

*This financial model is a planning tool, not a forecast. Re-validate cost estimates against current EU vendor pricing before each funding or planning cycle. Cost estimates sourced from vendor list pricing as of June 2026; recalculate on growth-stage entry.*
