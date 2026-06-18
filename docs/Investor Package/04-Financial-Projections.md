# Agora — Financial Projections (3-Year)
**Document:** FIN-002 · **Version:** 1.0 · **Date:** June 2026 · **Owner:** Founding Team
**Basis:** Extends `Business Documents/06-Financial-Model.md` to a 3rd year and adds the B2B recruiter line for this raise.

> **Read this first.** Two calendars are in play. The *build calendar* starts now; *monetization* starts only when the BSS grant funds (~Mar 2027), because the grant prohibits revenue/incorporation before then. Throughout, **"Monetization Year 1/2/3"** are anchored to billing go-live (~Apr 2027), **not** to build months. All forward numbers are planning estimates with stated assumptions, not forecasts.

---

## 1. Core Assumptions

| Assumption | Value | Basis |
|---|---|---|
| FX (USD→EUR) | 0.93 | June 2026 |
| Pricing model | **Credit-based; €/credit TBD** | Replaces €5.99/mo subscription (superseded) |
| Free→Pro conversion | 2% / **3.5%** / 5% (cons/exp/opt) | Mobile app benchmarks |
| Pro monthly retention | ~72%; avg sub life ~6 months | = typical job-search duration |
| LTV per paid user | ~€36 gross / **~€27 net** | *Legacy subscription basis (€5.99 × 6 mo); re-derive for credits* |
| Variable cost / application | ~€0.09–0.10 | **Opus 4.8** CV+cover-letter gen + Haiku/Sonnet for Ari, prompt-cached |
| Target CAC | <€5 (organic) → **LTV:CAC ≥5:1** | Community-led; no paid until Y2 |
| B2B recruiter ARPA (blended) | ~€220/mo | Tiers €99 / €249 / €499 |
| Stripe fees | 2.9% + €0.25 / txn | Net revenue shown |
| Model routing | **Opus 4.8** for CV+cover letter; Sonnet 4.6 for Ari advanced; Haiku 4.5 for Ari chat+eval | Opus 4.8 ($5/$25 Mtok) fits budget |

> **Pricing-in-transition note:** Agora is moving from monthly subscription to a **credit-based** model (per-action credits; see `Agora-Credit-Calculator.xlsx`). Credit price, pack sizes, and the Free allowance are **not yet finalized**. The MRR / LTV / ARPU figures throughout this document are inherited from the prior €5.99 subscription model and are shown for reference only — they must be re-derived once credit prices are set.

---

## 2. Startup Costs (one-time, pre-launch through incorporation)

| Item | Est. (€) | Note |
|---|---|---|
| Incorporation (UG: notary, HRB registration, starting capital) | 1,500 | Done *after* BSS funding starts |
| Legal (founders' agreement + vesting, trademark EUIPO/DPMA + Markenanwalt, GDPR/DPA, ToS) | 6,000 | Includes immigration-lawyer sign-off (OQ-05) |
| Brand & Ari (illustration set, logo, design system, initial animation) | 5,000 | Concept now; production after validation |
| Initial infra & tooling setup (annual prepays, dev tooling) | 2,500 | Vercel, Neon, Sentry, PostHog, etc. |
| Landing site, ASO assets, "Welcome to Berlin" brochure print run | 2,000 | 500+ brochures for October window |
| Contingency | 3,000 | ~15% buffer |
| **Total startup costs** | **~€20,000** | Largely covered by founder bootstrap + early grants |

---

## 3. Monthly Burn Rate

Burn moves through three regimes. **The defining feature: BSS covers founder *living costs* non-dilutively, so company cash burn is small until we deliberately step it up with hires.**

| Regime | Window | Founder costs | Company cash burn (infra+tools+mktg+admin) |
|---|---|---|---|
| **A — Bootstrap** | Now → Mar 2027 | Student/part-time income (off P&L) | **~€0.8–1.2k/mo** (Stage-1 infra + tools only) |
| **B — Grant-funded** | Mar 2027 → ~Feb 2028 | BSS stipend €2,500 × 3 = **€7,500/mo (non-dilutive, off company P&L)** | **~€2–4k/mo** (infra scaling + light marketing + admin) |
| **C — Post-raise scale** | From mid-2027 (with pre-seed) → | Founder salaries normalized to ~€3,500 + 2 hires | **~€18–28k/mo** by end of Monetization Y2 |

> The pre-seed is what funds Regime C — engineering and growth hires, native app, and paid acquisition — *on top of* a grant-covered base, which is why the round is efficient.

**Illustrative blended company P&L burn (cash out, excl. non-dilutive stipend):**

| Period | Avg monthly burn | Drivers |
|---|---|---|
| Monetization Y1 (Apr 27–Mar 28) | ~€5–8k | First hire mid-year, infra growth, brochure/campaign |
| Monetization Y2 (Apr 28–Mar 29) | ~€18–25k | 2 hires, native app, Hamburg, first paid acquisition |
| Monetization Y3 (Apr 29–Mar 30) | ~€30–40k | Team of ~6–7, B2B build, Munich, scaled acquisition |

---

## 4. Revenue Projections (3-Year)

Two lines: **B2C subscription** (from ~Apr 2027) and **B2B recruiter SaaS** (from ~month 18). B2C Years 1–2 are inherited verbatim from the internal Financial Model (the canonical figures); Year 3 and all B2B figures are new for this raise, with assumptions noted.

### 4.1 Expected case (3.5% conversion) — primary plan

| Period | B2C revenue | B2B revenue | Total | Exit MRR |
|---|---:|---:|---:|---:|
| **Monetization Y1** (Apr 27–Mar 28) | €5,300 | €0 | **~€5,300** | ~€1,500 |
| **Monetization Y2** (Apr 28–Mar 29) | €58,000 | €12,000 | **~€70,000** | ~€10,000 |
| **Monetization Y3** (Apr 29–Mar 30) | €180,000 | €180,000 | **~€360,000** | ~€42,000 |
| **3-year total** | €243,300 | €192,000 | **~€435,000** | — |

### 4.2 Scenario bounds

| Period | Conservative (2%) | **Expected (3.5%)** | Optimistic (5% + early B2B) |
|---|---:|---:|---:|
| Monetization Y1 | €3,300 | **€5,300** | €14,700 |
| Monetization Y2 | €40,000 | **€70,000** | €150,000 |
| Monetization Y3 | €200,000 | **€360,000** | €650,000 |
| **3-year total** | **~€243,000** | **~€435,000** | **~€815,000** |

### 4.3 How the lines are built (assumptions)

- **B2C Y1–Y2:** canonical internal model — MRR ramps from ~€85 at launch to ~€9k exit by end of monetization Y2, with **October spikes** (Wintersemester) and **July dips** (summer). ~850 Pro users @ €5.99 ≈ €5k/mo.
- **B2C Y3:** ~2.5–3× Y2 on Hamburg + Munich + native app + first paid acquisition; ~900–1,400 Pro users. ARPU held at €5.99 midpoint.
- **B2B Y2:** pilot → first paid recruiters; ~5–8 recruiters ramping at blended €220/mo.
- **B2B Y3:** ~50–70 active recruiters (avg) at blended €220/mo across €99/€249/€499 tiers ≈ €130–185k. This is the line that re-rates the business from "beloved student tool" to venture-scale.

> **Conservatism note:** even the optimistic 3-year total (~€815k) is **<0.05% of the German SAM** (~€2–2.5B). The plan does not require winning the market — only a defensible corner of it.

---

## 5. Unit Economics (the engine under the projections)

| Metric | Value |
|---|---|
| Variable cost / Pro user / month (~15 apps) | ~€0.83–1.43 |
| Gross margin / Pro user / month | **~€4.50–5.00** (≈ 5× variable cost) |
| LTV (net) per Pro user | ~€27 |
| CAC (organic, Year 1) | <€5 |
| **LTV:CAC** | **≥5:1** |
| B2B gross margin | High (software-only; candidate pool is a sunk B2C asset) |
| Structural margin edge | **No App Store / Play 15–30% cut** (PWA-first) |

---

## 6. Break-Even Analysis

Three distinct break-evens — be precise about which one:

| Break-even | Definition | Timing |
|---|---|---|
| **Infra break-even** | Revenue ≥ company infra (~€200–500/mo) | ~40–85 Pro users → **early Monetization Y1 (~mid 2027)** |
| **Founder-sustaining** | Revenue ≥ ~€7,500/mo (replaces BSS stipend for 3 founders) | ~end Monetization Y2 (~€9k MRR exit, early 2029) |
| **Full operational** | Revenue ≥ total opex incl. salaries + hires (~€30–40k/mo) | ~**Q4 2029 / early Year 4**, driven primarily by the B2B line at ~€42k+ MRR |

> Pre-seed runway is sized to reach **Series-A metrics**, not full profitability — standard for the stage. The grant + lean base means the *founder-sustaining* break-even is reached on modest revenue; the *full operational* break-even follows once B2B scales.

---

## 7. Funding Ask & Use of Funds

### 7.1 Capital stack — non-dilutive first, then a lean pre-seed

| Source | Amount | Type | Status |
|---|---|---|---|
| **Berliner Startup Stipendium (BSS)** | up to **€90,000** (€2,500 × 3 founders × 12 mo) | Non-dilutive grant | Apply Oct 2026; funds ~Mar 2027 |
| **GründungsBONUS Plus (IBB)** | up to **€50,000** | Non-dilutive grant | Post-incorporation bridge |
| **Pre-seed round (this ask)** | **€600,000** | Equity, ~13% (≈ €4.6M post-money) | **Open now** |
| **Total capital available** | **~€740,000** | | ~20–24 months runway |

> The pitch to investors: **~€140k of founder runway and base costs are already covered by non-dilutive grants.** A pre-seed euro therefore buys *growth and team*, not survival — unusually capital-efficient for the stage.

### 7.2 Use of funds (€600,000 pre-seed)

| Category | Allocation | € | What it buys |
|---|---|---:|---|
| **Engineering & product** | 45% | €270,000 | 2 hires (full-stack/AI + 1), native app, LLM/infra at scale, eval suite maintenance |
| **Growth & marketing** | 20% | €120,000 | October campaigns, content engine, ambassadors, first paid acquisition (Y2), Hamburg/Munich launches |
| **Founder salaries (top-up beyond BSS) + ops** | 15% | €90,000 | Normalize founder pay post-grant; bookkeeping, tooling, admin |
| **Legal, compliance & data** | 10% | €60,000 | GDPR/DPA, German employment-law retainer (maintains the moat), ATS-data partnerships |
| **Contingency / buffer** | 10% | €60,000 | Runway protection; B2B build acceleration |

### 7.3 Runway & next milestone
- **€600k pre-seed + ~€140k grants** → ~20–24 months at the blended burn in §3.
- Gets us to: native app live, Hamburg+Munich, B2B recruiter SaaS in market, **~€40k+ MRR exit / ~€500k ARR run-rate** — the metrics to raise a **Series A (€1.5–4M)** or reach the founder-sustaining cash-flow point.

---

## 8. Sensitivities & Downside Responses

| Variable | Downside | Response |
|---|---|---|
| Free→Pro conversion <1% | Revenue ~half of plan | Test €2.99 tier; accelerate B2B (already roadmapped); deepen activation |
| LLM costs 3× at scale | Margin compression | Token budgets, more Haiku routing, aggressive caching — levers built in Phase 3 |
| BSS denied | Runway gap | §20 permit safety net; GründungsBONUS Plus / APX / angel fallback; lean infra |
| Job supply thin post-filter | Sparse decks → churn | More sources (EURES, Make-it-in-Germany), Minijob category, direct employer deals |
| B2B adoption slow | Y3 upside delayed | B2C alone reaches founder-sustaining; B2B is upside, not survival |

---

## 9. Key Financial Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| FIN-01 | BSS rejected (loss of ~€90k non-dilutive) | Medium | High | Apply early; meet all conditions; §20 fallback; grant/angel alternatives |
| FIN-02 | Revenue delayed (BSS funding slips) | Medium | Medium | §20 + part-time income bridge; minimal Stage-1 burn |
| FIN-03 | Conversion below 1% | Medium | High | Pricing experiments; B2B pivot pre-planned |
| FIN-04 | LLM costs exceed plan | Medium | High | Routing + caching enforced before growth stage |
| FIN-05 | Scraping costs spike (anti-bot) | Medium | Medium | Official APIs; caching; dedup |

---

*Figures inherit the internal Financial Model (EU vendor list pricing, June 2026) and extend it for this raise. This is a planning tool, not a forecast — revalidate vendor costs and conversion assumptions before each funding cycle.*
