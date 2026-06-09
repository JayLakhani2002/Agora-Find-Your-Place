# Agora Jobs — Prototype MVP Overview
**Document:** PROTO-000 · **Version:** 1.0  
**Date:** 2026-06-09 · **Owner:** Founding Team  
**Target:** BSS Application-Ready Prototype by **August 2026**

---

## 1. What This Prototype Is

The prototype is the **minimum working product** that proves the Agora Jobs core loop end-to-end:

```
Legal-filtered job deck  →  AI-generated CV + Cover Letter  →  User reviews  →  User submits  →  Application tracked
```

It must be real enough to demo live to a BSS jury in Jan/Feb 2027, and stable enough for ~50 beta users by Aug 2026.

This is **not** a click-through mockup. It is a deployed, functional web app (PWA) running on EU infrastructure with real job data, real AI generation, and real application tracking.

---

## 2. Prototype Scope (What We Build)

### In Scope — Must Ship

| Feature | Why It Must Exist |
|---------|-------------------|
| Onboarding + visa capture | Without this, legal filtering cannot run |
| Legal eligibility hard filter | This is the #1 differentiator — must be provably real |
| AI job matching + swipe deck | Core UX loop |
| CV + Cover Letter generation (Tabellarischer Lebenslauf) | Core differentiator vs. ChatGPT |
| 6-dimension quality eval | Proves ATS reliability claim |
| User review + approval screen | Legal/trust requirement; mandatory before any submission |
| Mode 1 submission helper (open employer page) | Enables BSS milestone M2 |
| Application tracker | Closes the loop for the demo |
| Follow-up draft generation | Shows depth of the "track" phase |

### Out of Scope for Prototype

| Feature | When |
|---------|------|
| Browser extension (Mode 2 autofill) | Phase 6 / M3 (~Month 5) |
| Native iOS/Android app | Year 2 |
| Employer-facing B2B portal | Phase 5+ |
| Payment / subscription billing | Only after BSS funding (~Mar 2027) |
| Server-side application submission (Mode 3) | **Permanently banned — never** |
| Interview scheduling integration | Post-launch |

---

## 3. Prototype Goals

| Goal | Measurable Signal |
|------|-------------------|
| Prove legal filtering works | Demo with 3 different visa-type test accounts; zero ineligible jobs appear |
| Prove AI generation quality | ≥90% ATS parse rate on Softgarden test; 6-dim eval score ≥ 8.5 average |
| Prove UX speed | User completes first application in < 7 minutes on cold start |
| Prove EU data residency | All PII stored in Frankfurt/EU region; verifiable via infra dashboard |
| Prove the core loop | 5 real beta users submit ≥1 real application via the prototype |

---

## 4. Architecture Summary

```
┌─────────────────────────────────┐
│     Next.js PWA (web only)      │  ← prototype ships web-only; mobile deferred
│     Tailwind + shadcn/ui        │
└─────────────┬───────────────────┘
              │ tRPC
┌─────────────▼───────────────────┐
│  Next.js API Routes + tRPC      │
│  Clerk Auth (EU tenant)         │
│  Zod validation                 │
└──────┬──────────────┬───────────┘
       │              │
┌──────▼──────┐  ┌────▼────────────────────┐
│ Neon Postgres│  │ BullMQ (Redis/Upstash)  │
│ EU-west-1   │  │ EU region               │
│ + pgvector  │  └────────────┬────────────┘
└─────────────┘               │
                    ┌─────────▼──────────┐
                    │ Workers (Docker)    │
                    │ · Job scraper      │
                    │ · AI generator     │
                    │ · Quality eval     │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Claude via Bedrock  │
                    │ (Frankfurt, EU)     │
                    │ Sonnet 4.x hot path │
                    │ Haiku for ranking   │
                    └────────────────────┘
```

**Stack decisions for prototype:**
- **Web only** (PWA, responsive) — native mobile deferred
- **Neon Postgres** (EU region) — serverless, free tier gets us to beta
- **Clerk** (EU data residency tenant) — fastest auth with GDPR compliance
- **Claude Sonnet 4.x** via AWS Bedrock Frankfurt — EU data residency for LLM calls
- **Upstash Redis** (EU) — managed Redis for BullMQ without ops overhead
- **Scaleway Object Storage** (Paris EU) — CV file storage, GDPR-compliant

---

## 5. Prototype Phases

| Phase | Focus | Duration | Output |
|-------|-------|----------|--------|
| **P0** | Foundation & monorepo setup | Week 1–2 | Working repo, CI, EU infra accounts |
| **P1** | Auth, onboarding, DB schema | Week 2–3 | User can sign in, complete profile |
| **P2** | Job ingestion & matching | Week 3–5 | Legal-filtered swipe deck with real jobs |
| **P3** | AI generation & eval | Week 5–7 | CV + Cover Letter + 6-dim quality score |
| **P4** | Submission + tracking | Week 7–8 | Mode 1 helper + tracker + follow-up draft |
| **Demo** | Polish + beta users | Week 8–10 | 5 real users, BSS demo-ready |

---

## 6. Team & Ownership

| Area | Owner |
|------|-------|
| Product & legal compliance | Founder 1 |
| Frontend + design | Founder 1 |
| Backend + infra | Founder 2 |
| AI/ML pipeline | Founder 2 |
| Job scraping | Shared |

---

## 7. File Index (This Folder)

| File | Contents |
|------|---------|
| `00-MVP-Overview.md` | This file — scope, goals, architecture |
| `01-Tech-Setup.md` | Monorepo bootstrap, tooling, env vars |
| `02-Phase-0-Foundation.md` | Infrastructure accounts, CI, secrets |
| `03-Phase-1-Auth-Data.md` | Clerk setup, DB schema, onboarding flow |
| `04-Phase-2-Job-Ingestion.md` | Scraper, legal filter, matching pipeline |
| `05-Phase-3-AI-Generation.md` | CV/CL generation, eval, prompt design |
| `06-Phase-4-Submission-Tracking.md` | Mode 1 helper, tracker, follow-up drafts |
| `07-Demo-Script.md` | BSS demo walkthrough script |
