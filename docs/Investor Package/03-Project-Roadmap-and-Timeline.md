# Agora — Project Roadmap & Timeline
**Document:** ROAD-001 · **Version:** 1.0 · **Date:** June 2026 · **Owner:** Founding Team

> **Two clocks.** The *build calendar* runs from now. The *monetization calendar* starts only when BSS grant funding begins (~Mar 2027) — no paid users or incorporation before then (a binding grant eligibility rule). Dates below are build-calendar; the revenue-bearing phases are flagged.
>
> **Owners:** **CEO** = Tech/Product · **COO** = Ops/Legal/Partnerships · **CMO** = Marketing/Growth.

---

## 1. Phase Overview

| Phase | Name | Window | Outcome |
|---|---|---|---|
| **0** | Foundation | **Q3 2026** (Jul–Sep) | MVP core loop, customer dev, team & mentor locked, legal clearances |
| **1** | Closed Beta (MVP) | **Q4 2026** (Oct–Dec) | 10–20 users, quality proven, BSS submitted |
| **2** | Open Beta | **Q1 2027** (Jan–Mar) | 300+ users, BSS funded, UG incorporated, Mode 2 extension |
| **3** | Launch (monetization begins 💶) | **Q2 2027** (Apr–Jun) | Billing live, Pro tier, pricing set, first MRR |
| **4** | Scale | **Q3 2027 – Q2 2028** | October campaign, native app, Hamburg, ~€9k MRR |
| **5** | Two-sided + Expansion | **Q3 2028+** | B2B recruiter SaaS, Munich, DACH config, Series-A metrics |

---

## 2. Detailed Timeline & Workstreams

### Phase 0 — Foundation · Q3 2026 (Jul–Sep)
| Workstream | Deliverable | Owner | Depends on |
|---|---|---|---|
| Product | MVP core loop (profile → legal filter → ranking → swipe → generate → eval → tracker) | CEO | Tech stack scaffold (done) |
| Product | Eval harness hitting ATS ≥90% (Softgarden/Personio/d.vinci) | CEO | Generation pipeline |
| Legal | Trademark clearance (EUIPO/DPMA Cl. 35 & 9); domain + handles | COO | — |
| Legal | Immigration-lawyer sign-off on 140-day modeling (OQ-05) | COO | — |
| Team | Professor mentor + full-time co-founder commitments confirmed | COO/CEO | — |
| Growth | 25 Mom-Test interviews → pain-language map; 5–10 design partners | CMO | — |
| Growth | Build-in-public launched (LinkedIn + X) | CMO | Brand basics |

### Phase 1 — Closed Beta · Q4 2026 (Oct–Dec)
| Workstream | Deliverable | Owner | Depends on |
|---|---|---|---|
| Product | Closed beta to 10–20 design partners; eval avg ≥8.5/10 | CEO | P0 MVP |
| Product | Eligibility engine: zero ineligible jobs across visa types | CEO | Legal rules confirmed (P0) |
| **Funding** | **BSS application submitted (31 Oct)** — no economic activity | COO | Mentor + team (P0) |
| Growth | 20+ communities seeded; 500 waitlist signups | CMO | Pain-language map (P0) |
| Growth | Activation ≥40% (first application within 7 days) | CMO | Beta live |
| Ops | Job ingestion (Crawlee) + caching; ≥20–30 eligible jobs/day | COO/CEO | Source agreements started |

### Phase 2 — Open Beta · Q1 2027 (Jan–Mar)
| Workstream | Deliverable | Owner | Depends on |
|---|---|---|---|
| **Funding** | **BSS jury pitch (Jan/Feb); funding starts ~Mar** | COO/CEO | BSS submission (P1) |
| Legal | **UG incorporated — after funding only** | COO | Funding start |
| Product | Mode 2 (Magic Pre-fill) browser extension to beta | CEO | Core generation stable |
| Growth | Open beta to 300+ free users; publish ATS benchmark post | CMO | Quality proven (P1) |
| Ops | 2 supply/career-center partnerships (Stellenticket etc.) | COO | Beta traction |

### Phase 3 — Launch 💶 · Q2 2027 (Apr–Jun) — *monetization begins*
| Workstream | Deliverable | Owner | Depends on |
|---|---|---|---|
| **Revenue** | **Stripe billing live; Pro tier launched (by 30 Apr)** | CEO/COO | UG + funding (P2) |
| Growth | Three-cohort pricing experiment (€4.99/€6.99/€9.99) → set price | CMO/CEO | Billing live |
| Growth | ~€500 MRR; ≥3% conversion; 800 free users | CMO | Pro launch |
| Ops | Infra break-even (~40–85 Pro users); burn ≤€500/mo | COO | Subscriptions |
| Growth | October campaign locked; 500 brochures printed | CMO | Brand assets |

### Phase 4 — Scale · Q3 2027 – Q2 2028
| Workstream | Deliverable | Owner | Depends on |
|---|---|---|---|
| Growth | **October Wintersemester campaign** — peak acquisition | CMO | Phase 3 assets |
| Product | Native iOS/Android app | CEO | Validated PWA + raise |
| Product | Phase-2 categories: Minijob, Chancenkarte dedicated track | CEO | Legal rules per category |
| Growth | Hamburg launch (same legal rules, no rebuild) | CMO/COO | Berlin unit economics |
| Growth | First paid acquisition (Meta/Google) — *only after €1k MRR & >3% conv.* | CMO | Proof gate |
| Finance | ~€9k MRR exit rate (≈€107k ARR) | All | Conversion + retention |

### Phase 5 — Two-sided + Expansion · Q3 2028+
| Workstream | Deliverable | Owner | Depends on |
|---|---|---|---|
| Product | **B2B recruiter SaaS** (search, weighted scoring, blind validation) | CEO | Verified candidate pool (built from V1 data model) |
| Growth | 5+ paying/sponsoring recruiters (pilot → paid) | CMO/COO | B2B product live |
| Growth | Munich launch; DACH per-country config interface | CEO/CMO | Expansion playbook |
| Finance | ~€40k+ MRR exit; Series-A-ready metrics | All | Two-sided traction |

---

## 3. Critical-Path Dependencies

```
Legal rules confirmed (P0) ──► Eligibility engine (P1) ──► "only legal jobs" guarantee (whole product)
Generation pipeline (P0) ──► ATS eval ≥90% (P0/P1) ──► Quality moat ──► ATS benchmark post (P2) ──► trust/marketing
Professor mentor + team (P0) ──► BSS application (P1) ──► BSS funding (P2) ──► UG incorporation (P2) ──► billing (P3)
                                                                                         │
                                                              (no payments/incorporation before funding — hard gate)
Beta quality proof (P1) ──► open beta (P2) ──► pricing experiment (P3) ──► proven unit economics ──► paid acq. + native app (P4)
V1 verified-profile data model (P0–P3) ──► B2B candidate pool ──► recruiter SaaS (P5)
```

**Hard gates (cannot be parallelized away):**
1. **BSS "no economic activity" rule** — billing and incorporation are blocked until funding starts (~Mar 2027). This *defines* the monetization calendar.
2. **Legal-rules confirmation gates the eligibility engine**, which gates the entire "only legal jobs" promise.
3. **Quality proof (ATS ≥90%) gates scaled marketing** — we don't pour acquisition into an unproven funnel.
4. **Proven Berlin unit economics gate expansion** (Hamburg/Munich/paid) and the native-app investment.

---

## 4. Seasonality Overlay

| Window | Effect | Roadmap implication |
|---|---|---|
| **Late Sep / Oct (every year)** | Wintersemester arrival wave — largest acquisition spike | All campaigns planned 8 weeks backward; brochures + ambassadors ready *before* arrivals |
| **July (every year)** | Summer slowdown | Ship/refactor in summer; don't launch growth pushes |

---

*Roadmap is build-calendar; revenue-bearing phases (3–5) run on the monetization calendar anchored to ~Q2 2027. Re-baseline dates if BSS funding slips. Full phase specs in `Business Planning/Prototype/` and `Business Planning/Business Documents/05-Implementation-Plan.md`.*
