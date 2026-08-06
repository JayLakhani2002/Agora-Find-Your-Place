# Agora Jobs — Threat Model

**Owner:** Jay Anil Lakhani (acting CTO)
**Author:** Security review, 2026-08-06
**Status:** Living document. Update on every architecture change.
**Method:** Asset-first, then STRIDE per trust boundary.

Companion documents:
- `docs/Security/findings/` — raw red-team findings per domain
- `docs/Security/SECURITY-REPORT.md` — consolidated, severity-ranked
- `docs/Security/INPUTS-NEEDED-FROM-JAY.md` — decisions only you can make

---

## 1. What we are actually protecting

Agora Jobs is not a generic SaaS. It holds a concentrated dataset that is unusually
attractive and unusually regulated: **the immigration status, work-hour legality, income
floor, and full career history of non-EU students in Germany.**

That framing drives every priority below. A breach here is not "emails leaked" — it is a
list of foreign students, their visa type, their remaining permitted work days, and their
CVs. That population is targetable for immigration fraud, extortion, and discrimination.

### 1.1 Asset register

| # | Asset | Where it lives | Classification | Worst case if lost |
|---|-------|----------------|----------------|--------------------|
| A1 | **Visa / immigration status** (`user_profiles.visa_type`, `enrollment_status`, `days_remaining_this_year`, `weekly_hours_limit`, `semester_end`) | Neon Postgres, plaintext | **Special-category-adjacent (GDPR Art. 9 risk)** — immigration status is a strong proxy for nationality and ethnic origin | Regulatory action + irreversible harm to users. Highest-value asset. |
| A2 | **CV / résumé documents** (raw PDFs and generated CVs) | Scaleway S3 (`cv/{userId}/…`, `applications/{id}/…`) | Personal data, high volume | Mass PII disclosure; identity fraud material |
| A3 | **Structured CV data** (`skills`, `experience_summary`, `education_summary`) | Neon Postgres, plaintext | Personal data | Profiling, doxxing |
| A4 | **Income floor** (`min_hourly_rate`) + application history | Neon Postgres | Personal / financially sensitive | Discrimination, targeted scams |
| A5 | **Identity + contact** (`users.email`, Clerk identity) | Clerk + Neon | Personal data | Phishing base for the above |
| A6 | **Platform secrets** — `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AWS_ACCESS_KEY_ID/SECRET` (Bedrock), `S3_ACCESS_KEY/SECRET`, `COHERE_*`, `REDIS_URL`, `UPSTASH_*` | Vercel/Railway env, `.env.local` on Jay's laptop | **Crown jewels** | Full compromise of A1–A5 at once, plus unbounded spend |
| A7 | **Money** — Stripe account, AWS Bedrock spend, Cohere spend, Neon compute | Third parties | Financial | Runaway cost attack; a single unauthenticated-ish loop on an AI endpoint is a real bill |
| A8 | **Integrity of the job corpus** | Neon `jobs` table, written by unattended scrapers | Integrity | Poisoned listings → prompt injection → user harm; also brand/legal damage |
| A9 | **Integrity of an application submission** (future auto-apply) | Not built yet | Integrity + non-repudiation | An application sent in the user's name that they did not approve is the single worst product failure mode |
| A10 | **Source code + CI/CD** | GitHub | Supply chain | Attacker ships their own code to prod |

### 1.2 Explicit non-assets
- **Card data** — never touches our infrastructure. Stripe holds it. `users` stores only
  `stripe_customer_id` and `plan_tier`. This is correct and must stay that way.
- **Passwords** — never stored. Clerk owns authentication. Do not build a local password path.

---

## 2. Adversaries

Ranked by likelihood × capability against *this* product at *this* stage.

| ID | Adversary | Motivation | Capability | Realistic today? |
|----|-----------|------------|------------|------------------|
| T1 | **Authenticated abuser** — signs up legitimately, then probes | Free compute, competitor scraping, curiosity, data theft | Can call every authenticated endpoint at machine speed | **Yes — the #1 threat.** Signup is free and self-service. |
| T2 | **Cost attacker** | Burn the startup's AWS/Cohere budget, deny service | Scripted account creation + AI endpoint loops | **Yes.** Directly threatens runway. |
| T3 | **Malicious job poster / poisoned upstream source** | Indirect prompt injection into our LLM pipeline; exfiltrate applicant PII via generated documents | Publishes a job ad on a board we scrape — costs them nothing | **Yes.** We ingest untrusted third-party text straight into LLM prompts. |
| T4 | **Opportunistic internet scanner** | Leaked secrets in git/JS bundles, exposed endpoints, known CVEs | Automated, continuous, indiscriminate | **Yes, constantly.** Leaked keys are found in minutes, not days. |
| T5 | **Supply-chain attacker** | Compromise an npm dependency or a GitHub Action to reach our secrets | Broad, opportunistic (cf. the npm worm campaigns) | **Yes.** We have ~unpinned transitive deps and CI with secrets. |
| T6 | **Credential thief targeting the founder** | Jay's laptop / GitHub / Vercel / AWS account is the single point of total compromise | Phishing, infostealer malware | **Yes.** Solo-founder concentration risk. |
| T7 | **Competitor** | Scrape our matched-job corpus and our pricing/quality signal | Authenticated scraping | Plausible |
| T8 | **Insider / future contractor** | Data theft | Direct DB access | Not yet — but becomes real the moment a second person is onboarded |
| T9 | **Nation-state / APT** | Targeting migrant populations | High | Low probability now, non-zero given A1's nature. Design so it isn't trivial. |

**The uncomfortable one is T6.** Today one compromised laptop = every asset. That is the
biggest structural gap and no amount of application-layer code fixes it.

---

## 3. Trust boundaries

```
                        ┌─────────────────────────────────────────┐
                        │  UNTRUSTED INTERNET                     │
                        │  T1 T2 T4 T7 — anyone with a browser    │
                        └───────────────┬─────────────────────────┘
                                        │
   ══════ TB-1: Edge / auth ════════════▼══════════════════════════
                        │  Vercel (fra1) → Next.js middleware      │
                        │  clerkMiddleware → auth.protect()        │
                        │  ⚠ no WAF, no rate limit, no CSP/HSTS    │
   ═════════════════════┼════════════════════════════════════════
                        │
   ══════ TB-2: Session → identity ═════▼══════════════════════════
                        │  trpc.ts protectedProcedure              │
                        │  clerkId → users row (JIT provisioning)  │
   ═════════════════════┼════════════════════════════════════════
                        │
   ══════ TB-3: Identity → data (AUTHORIZATION) ═══▼═══════════════
                        │  Per-router WHERE userId = ctx.user.id   │
                        │  ⚠ enforced ONLY in application code.    │
                        │  ⚠ RLS is DISABLED on every table.       │
                        │  One missed WHERE = full cross-tenant read│
   ═════════════════════┼════════════════════════════════════════
                        │
        ┌───────────────┼────────────────┬──────────────────┐
        ▼               ▼                ▼                  ▼
   Neon Postgres   Scaleway S3      AWS Bedrock         Stripe
   (A1,A3,A4)      (A2)             (A7 spend)          (A7)
        ▲               ▲                ▲
        │               │                │
   ══════ TB-4: Unattended workers ══════┴════════════════════════
        │  apps/workers — Crawlee/Playwright, DB write creds,
        │  Bedrock creds. No user session. Runs on Railway.
        ▲
   ══════ TB-5: Untrusted external content ════════════════════════
        │  Arbeitsagentur, Arbeitnow, Greenhouse/Lever/Recruitee/
        │  Personio, company career pages.
        │  ⚠ This text reaches an LLM prompt. It is ATTACKER-CONTROLLED.
        │  T3 lives here.

   ══════ TB-6: Signed callbacks ══════════════════════════════════
        │  Clerk webhook (svix sig) · Stripe webhook (constructEvent)
        │  Public routes by necessity. Signature IS the auth.

   ══════ TB-7: Developer / CI ════════════════════════════════════
        │  Jay's laptop · GitHub Actions · Vercel · Railway · AWS
        │  T5, T6. Holds A6 and A10. No MFA/least-privilege audited.
```

### 3.1 The load-bearing boundary

**TB-3 is the one that matters most and is the weakest by design.**

Every other boundary has a real enforcement mechanism owned by a third party who is good at
it: Clerk enforces TB-1/TB-2, svix and Stripe enforce TB-6. TB-3 is enforced by *us*, in
hand-written `.where(eq(x.userId, ctx.user.id))` clauses, with **no second line of defence**:

- RLS is disabled on all tables (confirmed in the 2026-08-06 DB audit).
- The app connects with one role that can read and write every row of every table.
- Therefore: **one forgotten `WHERE` in one procedure is a full cross-tenant breach of A1–A4.**

This is the classic single-layer authorization failure (OWASP A01). Big-tech equivalent
practice is defence in depth — the database itself refuses to return rows the caller does not
own, so an application bug degrades to "no data" instead of "everyone's data". Adding RLS +
a restricted role is the highest-leverage structural change available.

### 3.2 The boundary that is easiest to forget

**TB-5.** Scraped job-ad text is attacker-controlled input that we place into an LLM prompt
next to the user's CV, and whose output we hand back to the user as a document they will send
to a real employer. Standard input validation does not address this; it needs prompt-level
isolation, output constraints, and — critically — a hard rule that model output never becomes
an action.

---

## 4. STRIDE by boundary

Findings are numbered `TM-n` and cross-referenced to red-team findings in
`docs/Security/findings/`. Severity is filled in by the consolidated report.

### TB-1 — Edge / auth

| STRIDE | Threat | Notes |
|--------|--------|-------|
| Spoofing | Middleware bypass reaching a protected route unauthenticated | Next.js pinned at **15.2.4** (Mar 2025). CVE-2025-29927 is fixed at 15.2.3, but the pin is ~17 months stale — the version, not the one CVE, is the finding. |
| Tampering | Response/cache poisoning at the CDN | No cache-control discipline audited on authenticated routes |
| Repudiation | No request logging / audit trail | Cannot reconstruct an incident today |
| Info disclosure | Missing security headers (no CSP, HSTS, frame-ancestors, Referrer-Policy, Permissions-Policy) | Confirmed absent from `apps/web/next.config.js` |
| DoS | **No rate limiting anywhere in the repo** | `UPSTASH_*` env vars exist but no ratelimit library is installed |
| EoP | — | |

### TB-2 — Session → identity

| STRIDE | Threat | Notes |
|--------|--------|-------|
| Spoofing | Clerk session forgery | Delegated to Clerk; `@clerk/nextjs` pinned at **6.12.12** (stale) |
| Tampering | JIT provisioning in `trpc.ts` creates a `users` row on first authenticated request | Correct behaviour, but it means *any* valid Clerk identity self-provisions a tenant with zero gating |
| EoP | Free→pro tier escalation via Stripe webhook handling | `checkout.session.completed` sets `plan_tier = pro` from `client_reference_id` without re-checking `payment_status` |

### TB-3 — Identity → data  ⚠ **primary risk concentration**

| STRIDE | Threat | Notes |
|--------|--------|-------|
| **EoP / Info disclosure** | **IDOR/BOLA** — any procedure missing a `userId` scope | No RLS backstop. Enumerated per-procedure by the auth/API red-team pass. |
| Info disclosure | Object-storage key confusion — a user-supplied S3 key reaching `getObjectBuffer` without ownership check | `/api/download/document` does check; every *other* caller must be verified |
| Tampering | Path traversal in the CV upload key: `cv/${userId}/${uuid}-${file.name}` interpolates the raw client filename | A filename of `../../otheruser/x.pdf` writes outside the user's namespace |
| Tampering | Client-declared `file.type` is the only content check on upload | No magic-byte validation; any bytes can be stored as "application/pdf" |
| DoS | Unbounded uploads / unbounded AI calls | Storage and inference cost attack (T2) |
| Repudiation | No audit log of data access, export, or erasure | GDPR accountability gap as well as an IR gap |

### TB-4 — Unattended workers

| STRIDE | Threat | Notes |
|--------|--------|-------|
| EoP | Worker holds DB write + Bedrock + S3 credentials with no user context | Compromise of the worker host = compromise of the corpus and the AI budget |
| Tampering | Scrapers write directly to `jobs` | Poisoned rows flow to every user (A8) |
| Info disclosure | SSRF — worker fetches URLs sourced from scraped content | Cloud metadata / internal service reach |
| DoS | Malicious PDF into `unpdf`; malicious page into Playwright | Parser DoS / sandbox escape surface |

### TB-5 — Untrusted external content  ⚠ **most underrated**

| STRIDE | Threat | Notes |
|--------|--------|-------|
| Tampering | **Indirect prompt injection** via job-ad text into the CV/cover-letter prompt | Exfiltration of the applicant's PII into a document sent to a third party; or content the user is induced to act on |
| Info disclosure | Model repeats CV contents into an attacker-visible channel | Depends on prompt construction — audited in finding 04 |
| EoP | **Future:** injection steers an auto-submitting agent (A9) | Must be closed *before* auto-apply ships, not after |

### TB-6 — Signed callbacks

| STRIDE | Threat | Notes |
|--------|--------|-------|
| Spoofing | Forged webhook | Correctly mitigated: svix verification on raw body (Clerk), `constructEvent` on raw body (Stripe). **Verified good.** |
| Repudiation | No webhook event-id idempotency store | Replay within the signature tolerance window; duplicate side effects |
| Tampering | `user.deleted` triggers full erasure | Correct, but it means webhook forgery would be *destructive* — raises the value of the signing secret (A6) |

### TB-7 — Developer / CI

| STRIDE | Threat | Notes |
|--------|--------|-------|
| EoP | Compromise of Jay's laptop, GitHub, Vercel, Railway, or AWS root | **Single point of total compromise (T6).** No documented MFA/hardware-key posture. |
| Tampering | Unpinned GitHub Actions, postinstall scripts in the dep tree | Supply chain (T5) |
| Info disclosure | Secrets in git history | Audited in finding 02 |

---

## 5. Security objectives (what "Apple/Google-level" means here)

Concrete, testable, and proportionate to a pre-revenue EU startup. Not cargo cult.

| # | Objective | Test |
|---|-----------|------|
| SO-1 | A single missing `WHERE userId` clause cannot leak another user's data | RLS enabled; app role restricted; automated test proves a cross-tenant read returns 0 rows |
| SO-2 | No unauthenticated path reaches user data | Automated route-coverage test asserting every tRPC procedure is `protectedProcedure` unless explicitly allow-listed |
| SO-3 | No endpoint can be driven at unbounded cost | Rate limits on every mutation; hard per-user daily caps on AI spend |
| SO-4 | Untrusted text never becomes an instruction | Prompt isolation + output never used as an action; auto-apply gated on this |
| SO-5 | No secret is ever in git, in a client bundle, or unrotatable | History clean; documented rotation runbook; least-privilege per credential |
| SO-6 | A user's erasure request removes every byte, including object storage | Automated erasure test asserting zero rows and zero objects |
| SO-7 | An incident can be reconstructed | Structured audit log for auth, data export, erasure, admin action |
| SO-8 | Compromise of any one credential does not compromise the rest | Per-service least privilege; separate web / worker / migration DB roles |
| SO-9 | The browser cannot be turned against the user | CSP, frame-ancestors, no `dangerouslySetInnerHTML` on model or scraper output, SW does not cache authenticated responses |
| SO-10 | Founder-account compromise is hard and detectable | Hardware MFA everywhere, no long-lived root keys, alerting on privileged change |

---

## 6. Standing design rules

Non-negotiable, for this codebase, from now on:

1. **Never store card data.** Stripe only.
2. **Never store a password.** Clerk only.
3. **Every new tRPC procedure is `protectedProcedure`** unless a written exception exists here.
4. **Every query touching a user-linked table is scoped by `ctx.user.id`** — and RLS backstops it.
5. **Never interpolate a client-supplied filename or key into a storage path.** Server-generated keys only.
6. **Never place untrusted text inside a system prompt.** It goes in a delimited, clearly-labelled untrusted block, and the system prompt states that its contents are data, never instructions.
7. **Model output is never an action.** Not a URL to fetch, not a command, not a query, not a submission target.
8. **Every new external egress destination is allow-listed.**
9. **Every credential is least-privilege and has a documented rotation procedure.**
10. **Auto-apply does not ship until SO-4, SO-7, and a German legal review are all complete.**

---

## 7. Residual risk accepted (to be reviewed)

| Risk | Why accepted now | Review trigger |
|------|------------------|----------------|
| No WAF / DDoS beyond Vercel defaults | Cost, pre-revenue | First paying cohort |
| No SIEM | No ops capacity | Second engineer onboarded |
| Single-founder credential concentration (T6) | Structural | **Not accepted — mitigate now with hardware MFA** |
| Nation-state adversary (T9) | Out of proportion | Public launch scale |

---

*Findings that populate section 4 live in `docs/Security/findings/`. This model is the
stable frame; the findings are the moving part.*
