# Agora Jobs — Architecture Diagram & Data Flows

**Last updated:** 2026-06-08

---

## 1. System Overview (one-page)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENTS                                       │
│                                                                                │
│   ┌────────────┐      ┌──────────────────┐      ┌─────────────────────────┐    │
│   │  Web App   │      │   Mobile App     │      │   Browser Extension     │    │
│   │ Next.js 15 │      │  Expo / RN       │      │   WXT + React (MV3)     │    │
│   └─────┬──────┘      └────────┬─────────┘      └───────────┬─────────────┘    │
│         │   shared packages/ui · packages/api (tRPC client) · packages/core    │
└─────────┼────────────────────┼──────────────────────────────┼─────────────────┘
          │                    │                              │
          └──────────┬─────────┴──────────────┬───────────────┘
                     │ HTTPS (tRPC + REST)     │
                     ▼                         ▼
        ┌────────────────────────────────────────────────────────┐
        │                  API LAYER  (EU · fra1)                 │
        │   Next.js Route Handlers · tRPC routers · Hono REST     │
        │   Auth (Clerk) · Zod validation · Rate limit (Upstash)  │
        └───────┬───────────────────────────────────┬────────────┘
                │ reads/writes                       │ enqueue
                ▼                                    ▼
   ┌────────────────────────┐            ┌──────────────────────────┐
   │  PERSISTENCE (EU)      │            │   JOB QUEUE (EU)         │
   │  • Postgres (Neon)     │            │   BullMQ on Upstash      │
   │    + pgvector          │◄───────────┤   / QStash               │
   │  • Object storage      │  results   │   / Inngest workflows    │
   │    (Scaleway/S3 EU)    │            └───────────┬──────────────┘
   │  • Redis (Upstash)     │                        │ dispatch
   └────────────────────────┘                        ▼
                                      ┌──────────────────────────────┐
                                      │   WORKERS (EU containers)    │
                                      │   Railway / Render / Fly     │
                                      │                              │
                                      │  ┌────────────────────────┐  │
                                      │  │ Scraper (Playwright +  │  │
                                      │  │ Browserbase/Apify)     │  │
                                      │  ├────────────────────────┤  │
                                      │  │ AI generation          │  │
                                      │  │ (packages/ai)          │  │
                                      │  ├────────────────────────┤  │
                                      │  │ Auto-apply (Playwright)│  │
                                      │  │ + human-approval gate  │  │
                                      │  └───────────┬────────────┘  │
                                      └──────────────┼───────────────┘
                                                     │ inference (PII-redacted)
                                                     ▼
                                      ┌──────────────────────────────┐
                                      │  LLM — Claude via AWS Bedrock │
                                      │  EU region (eu-central-1)     │
                                      │  Opus (quality) · Haiku (vol) │
                                      └──────────────────────────────┘

   Cross-cutting (all EU): Sentry · PostHog · Axiom · Doppler · Stripe
```

---

## 2. Key Data Flows

### A. Job ingestion (scheduled)
```
Cron/Inngest → enqueue scrape jobs → Worker (Playwright/Browserbase)
   → raw listings → Claude Haiku (structured extraction)
   → normalize → Postgres (jobs) + embeddings → pgvector
```

### B. Candidate ↔ job matching
```
User profile + CV embedding (pgvector)  ⨯  job embeddings
   → similarity + rules (visa/Werkstudent/wage filters)
   → ranked matches → surfaced in app + push notification
```

### C. AI application generation (human-in-the-loop)
```
User selects job → enqueue generate job
   → Worker assembles context (profile, JD, user voice)
   → PII REDACTION layer (strip passport/visa numbers)
   → Claude Opus → draft CV + cover letter
   → store draft → USER REVIEWS & EDITS → approves
```

### D. Auto-apply (only after approval)
```
Approved application → enqueue apply job
   → Worker (Playwright) opens portal → fills form → submits
   → write AUDIT LOG (append-only) → notify user → store confirmation
```

> The **human-approval gate in C** and the **audit log in D** are non-negotiable — they address the embassy/employer AI-detection risk and GDPR accountability.

---

## 3. Trust & Residency Boundaries

```
┌─ EU DATA BOUNDARY ────────────────────────────────────────────────┐
│  All PII, CVs, documents, embeddings, logs, analytics, inference   │
│  stay inside EU regions. Sub-processors under DPA.                  │
│                                                                    │
│   Neon(EU) · Scaleway(EU) · Upstash(EU) · Bedrock(EU) ·            │
│   PostHog(EU) · Sentry(EU) · Clerk(EU)                             │
│                                                                    │
│   ▲ PII REDACTION happens BEFORE any data crosses into the LLM.    │
│   ▲ Nothing sensitive leaves this boundary.                        │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. Environments

| Env | Web | DB | Workers | LLM |
|---|---|---|---|---|
| **Local** | Next dev | Neon branch / local PG | local worker | Bedrock dev key |
| **Preview** | Vercel preview | Neon branch per PR | ephemeral | Bedrock (low quota) |
| **Production** | Vercel (fra1) | Neon prod (EU) | Railway/ECS (EU) | Bedrock prod (EU) |

Use **Neon branching** to give every PR its own isolated database — a major DX win for a small team.
