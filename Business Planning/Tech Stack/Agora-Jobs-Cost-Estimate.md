# Agora Jobs — Cost Estimate by Stage

**Last updated:** 2026-06-08
**Currency:** USD/month (approx, list pricing). EU regions sometimes cost slightly more — budget +5–10%.

> These are realistic monthly run-rate estimates for the recommended stack. LLM and scraping costs are **usage-driven** and will dominate as you grow — they're called out separately.

---

## Stage 1 — MVP / Pre-launch (0–500 users)

Goal: ship and validate. Stay on free/hobby tiers wherever possible.

| Component | Service | Plan | Est. $/mo |
|---|---|---|---|
| Web hosting | Vercel | Pro (1 seat) | 20 |
| Database | Neon (EU) | Launch | 19 |
| Auth | Clerk | Free → Pro | 0–25 |
| Redis / queue | Upstash | Pay-as-you-go | ~5 |
| Object storage | Scaleway | Pay-as-you-go | ~5 |
| Worker container | Railway | Hobby/Dev | 5–20 |
| Email | Resend | Free → Pro | 0–20 |
| Errors | Sentry | Team | 0–26 |
| Analytics | PostHog (EU) | Free tier | 0 |
| Payments | Stripe | Pay-per-txn | % only |
| **Subtotal (fixed)** | | | **~$75–165** |
| LLM (Claude/Bedrock) | usage | low | ~20–100 |
| Scraping (Browserbase/Apify) | usage | low | ~20–80 |
| **Realistic total** | | | **~$120–350/mo** |

---

## Stage 2 — Early growth (500–10k users)

Goal: reliability, real automation volume, mobile + extension live.

| Component | Service | Plan | Est. $/mo |
|---|---|---|---|
| Web hosting | Vercel | Pro (+ usage) | 50–150 |
| Database | Neon (EU) | Scale | 69–200 |
| Auth | Clerk | Pro (+ MAU) | 100–300 |
| Redis / queue | Upstash | Pay-as-you-go | 20–60 |
| Object storage | Scaleway | usage | 20–60 |
| Workers | Railway/Render | 2–3 containers | 60–200 |
| Workflows | Inngest / Trigger.dev | Team | 50–100 |
| Email | Resend | Pro/Scale | 20–90 |
| Errors | Sentry | Business | 80–200 |
| Analytics | PostHog (EU) | usage | 50–200 |
| Logging | Axiom / Better Stack | Team | 25–100 |
| Mobile builds | Expo EAS | Production | 99 |
| Secrets | Doppler | Team | 0–30 |
| **Subtotal (fixed)** | | | **~$700–1,800** |
| LLM (Claude/Bedrock) | usage | medium | 300–1,500 |
| Scraping | usage | medium | 200–1,000 |
| **Realistic total** | | | **~$1,200–4,300/mo** |

---

## Stage 3 — Scale (10k–100k+ users)

Goal: cost efficiency, EU-region containers at scale, possible move to AWS ECS.

| Component | Approx $/mo |
|---|---|
| Web (Vercel Enterprise or self-host on AWS) | 500–2,000 |
| Database (Neon Scale/Business or RDS eu-central-1 + replicas) | 500–2,500 |
| Auth (Clerk Enterprise or self-hosted Auth.js) | 0–1,500 |
| Redis / queue (Upstash or self-managed) | 100–500 |
| Object storage | 100–800 |
| Workers (AWS ECS Fargate, EU, autoscaled) | 500–3,000 |
| Workflows (Inngest/Temporal) | 200–1,000 |
| Observability (Sentry + PostHog + logs) | 400–1,500 |
| Other (email, secrets, CI) | 200–600 |
| **Subtotal (fixed)** | **~$3,000–14,000** |
| **LLM (Claude)** | 2,000–30,000+ |
| **Scraping** | 1,000–10,000+ |
| **Realistic total** | **~$6,000–55,000+/mo** |

---

## Where the money actually goes at scale

1. **LLM inference** — by far the biggest variable. Mitigations:
   - Route cheap/high-volume tasks (parsing, classification, Ari's normal chat) to **Claude Haiku 4.5**; use **Opus 4.8** for CV + cover-letter generation and **Sonnet 4.6** for Ari's advanced tasks (interview prep, profile analysis).
   - **Prompt caching** for repeated context (job descriptions, user profile).
   - Cache/deduplicate generations; don't regenerate unchanged content.
   - Batch non-urgent jobs.
2. **Scraping/automation** — managed browsers bill per browser-minute. Mitigations: prefer official APIs, cache listings, dedupe, schedule smartly.
3. **Database egress & compute** — keep compute in-EU-region with the DB to avoid cross-region transfer; use read replicas before scaling the primary.

---

## Cost-control levers (in priority order)

| Lever | Savings impact |
|---|---|
| Model routing (Haiku chat / Sonnet Ari tasks / Opus generation) | High |
| Prompt caching | High |
| Generation deduplication/caching | High |
| Prefer official job APIs over scraping | Medium–High |
| Scale-to-zero (Neon, serverless workers off-peak) | Medium |
| Turborepo remote cache (CI minutes) | Low–Medium |
| Self-host PostHog/Auth.js at scale | Medium (at high MAU) |

---

*Estimates are directional planning numbers, not quotes. Re-check each vendor's current EU pricing before committing.*
