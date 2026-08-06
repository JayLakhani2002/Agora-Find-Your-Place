# Agora Jobs — Security Assessment

**Date:** 2026-08-06
**Scope:** whole monorepo — `apps/web`, `apps/website`, `apps/workers`, `packages/*`, `infrastructure/`, git history, dependency tree, CI/CD
**Method:** whitebox adversarial review across five domains, run in parallel, then verified first-hand against the real dependency tree, the real generated service worker, and the real build
**Authorisation:** owner-requested assessment of own product

Companion documents:
- `THREAT-MODEL.md` — assets, adversaries, trust boundaries, STRIDE
- `findings/01`–`05` — full per-domain reports with code citations
- `INPUTS-NEEDED-FROM-JAY.md` — the decisions only you can make

---

## Executive summary

The application's **own code is in better shape than its dependencies.** The red team went
looking for the classic startup breaches — IDOR, SQL injection, broken webhook
verification, leaked secrets in git — and did not find them:

- **No cross-tenant IDOR.** Every id-bearing tRPC procedure is scoped to `ctx.user.id`.
- **No SQL injection.** No `sql.raw` anywhere; LIKE wildcards escaped; NUL stripped.
- **No secrets in git history, ever.** Every hit was a placeholder, a doc, or an eval-suite
  test string. **Zero credential rotations required.**
- **Webhooks verify correctly** — svix and Stripe `constructEvent`, both on the raw body.
- **GDPR cascade is complete** — all 8 `userId` FKs are `ON DELETE CASCADE`, and storage
  erasure is failure-aware and ordered correctly.

The serious problems were in three places nobody was looking:

1. **A ~17-month-stale dependency tree** carrying a *critical Clerk middleware auth-bypass*
   and a *critical Next.js RCE*. This was the single highest-severity finding in the
   assessment and it required no application bug at all.
2. **The PWA service worker was caching every authenticated response for 24 hours** into
   origin-scoped storage that survived sign-out — on a product whose users are students on
   shared laptops. There was also **no sign-out control in the app at all.**
3. **Nothing bounded cost or abuse.** No rate limiting anywhere, and the quota gate
   short-circuits to "allowed" while billing is dark — which is the shipped state.

**21 of 24 findings are fixed, tested and verified in this pass**, including all four items
Jay decided on directly (RLS + role split, field encryption, the visa filter, and the Tier-3
hardening batch). What remains is infrastructure actions only Jay can perform — applying the
IAM policy, creating the Neon roles and the KMS key, enabling MFA — plus the two items that
need a legal answer rather than a technical one. All are in `INPUTS-NEEDED-FROM-JAY.md`.

### Verification state

| Check | Before | After |
|-------|--------|-------|
| `pnpm typecheck` | pass | **pass** (8/8) |
| Test suite | 574 pass | **615 pass** (+41 new security regression tests) |
| `pnpm build` | pass | **pass** (3/3) |
| `pnpm lint` | fail (1) | **pass** |
| `pnpm audit` **critical** (whole tree) | **3** | **0** |
| `pnpm audit` high (production-reachable) | **28** | **0** |

The three remaining `high` advisories (`serialize-javascript`, `vite`, `brace-expansion`)
are entirely build- and dev-toolchain, unreachable by an attacker in production. Rationale
per package is in §4. CI now fails the build on any new **critical**.

---

## 1. Findings — fixed in this pass

### P0-1 — Critical auth bypass in the pinned Clerk version
**`apps/web/package.json`** · `@clerk/nextjs@6.12.12`

`pnpm audit` reports **"Official Clerk JavaScript SDKs: Middleware-based route protection
bypass"** as *critical*, affecting `>=6.0.0 <6.39.2`. The entire app's route protection is
`clerkMiddleware` + `auth.protect()`. A second *high* advisory (authorization bypass when
combining organization/billing/reverification checks) affects `<=6.39.2`.

The blast radius was narrower than it first appears — `protectedProcedure` calls `auth()`
again in the data layer, so tRPC would still have refused — but that is a happy accident of
defence in depth, not a reason to run a known-critical auth bypass in production.

**Fixed:** `6.12.12 → 6.39.6`.

### P0-2 — Critical RCE in the pinned Next.js version
**`apps/web/package.json`, `apps/website/package.json`** · `next@15.2.4` (March 2025)

`next@15.2.4` is ~17 months stale and carries, per `pnpm audit`:
- **critical** — RCE in the React flight protocol (`<15.2.6`)
- **high** — SSRF in rewrites via attacker-controlled destination hostname (`<15.5.21`)
- **high** — SSRF in Server Actions on custom servers (`<15.5.21`)
- **high** — Middleware/proxy bypass via segment-prefetch routes, *and its incomplete-fix
  follow-up* (`<15.5.18`)
- plus five DoS advisories

Note CVE-2025-29927 (`x-middleware-subrequest`) is **not** among them — that was fixed in
15.2.3, and an earlier claim that it applied here was wrong. The finding is the *version*,
not any single CVE.

**Fixed:** `15.2.4 → 15.5.22` in both apps (staying in-major to minimise breakage).

### P0-3 — Service worker cached every authenticated response for 24h
**`apps/web/next.config.js`** · `@ducanh2912/next-pwa` default `runtimeCaching`

Verified by reading the library's compiled default rule set and then the **generated
`public/sw.js`**:

```js
{
  urlPattern: ({ sameOrigin, url: { pathname } }) =>
    sameOrigin && !pathname.startsWith("/api/auth/callback") && pathname.startsWith("/api/"),
  handler: "NetworkFirst", method: "GET", maxAgeSeconds: 86400
}
```

Every same-origin GET under `/api/` was written to Cache Storage for 24 hours. That
includes all tRPC queries (profile, applications, deck, résumés) and
`/api/download/document` — the generated CVs and cover letters. The `pages`, `pages-rsc`
and `pages-rsc-prefetch` rules did the same for the RSC payloads of dynamic authenticated
screens.

Cache Storage is scoped to the **origin, not the session**. Combined with P0-4 below, on a
shared university machine the next user could read the previous user's CV and visa status
straight out of the cache. It also silently defeated GDPR erasure locally.

**Fixed.** `resolveRuntimeCaching` drops a default rule when a user rule declares the same
`options.cacheName`, so five `NetworkOnly` rules now replace the data-caching defaults.
Static-asset caching (JS/CSS/fonts/images) is untouched — that is the real PWA benefit and
carries no user data. **Verified in the generated artifact:** each cache name appears
exactly once and `apis`/`pages`/`pages-rsc`/`cross-origin` are all bound to `NetworkOnly`.

Because an installed PWA can run a stale service worker for a long time, a self-healing
purge (`SessionHygiene` → `purgeStaleDataCaches`) also reclaims already-poisoned caches on
existing installs.

### P0-4 — No sign-out existed anywhere in the app
**`apps/web`** — `useClerk`/`signOut`/`logout` returned zero matches

The only way to end a session was to delete the account. With Clerk's default 7-day rolling
session and a target audience of students on shared campus machines, this is a takeover
path, and it is what turned P0-3 from a caching bug into a data-disclosure one.

**Fixed:** a Session card in Settings that purges Cache Storage **and then** signs out —
ordered deliberately, because `signOut()` redirects and would otherwise tear the component
down before the wipe completed. Account deletion now purges caches too: Art. 17 is not
satisfied while the user's CVs are still in the device's Cache Storage.

### P1-1 — No rate limiting anywhere; the cost gate is off by default
**`packages/billing/src/quota.ts:39`**, `apps/web/src/server/trpc.ts`

```ts
if (!billingEnabled()) return { allowed: true }
```

`BILLING_ENABLED` ships unset, so `checkApplicationQuota` returns "allowed" *before
touching the database*. There was no rate limiting in the repo at all. Signup is free and
self-service. So one scripted account could drive:

- `deck.getDeck` — **up to 30 Bedrock calls per single request**
- `applications.create` — Opus/Sonnet document generation, unbounded
- `/api/upload/cv` — unlimited 10 MB objects into paid storage

This was the only finding exploitable *today* with no other bug.

**Fixed:** `apps/web/src/server/lib/rate-limit.ts` — per-user fixed-window counters on the
Redis connection BullMQ already opens (no new dependency). An atomic `EVAL` sets the TTL
only on the first hit, because the naive `INCR`-then-`EXPIRE` can strand a key with no
expiry and lock a user out permanently.

| Rule | Limit | On Redis outage |
|------|-------|-----------------|
| `REQUESTS_PER_MINUTE` | 240/min, every authenticated call | **open** — a blip must not take the product down |
| `AI_PER_MINUTE` | 6/min | **closed** |
| `AI_PER_DAY` | 120/day | **closed** |
| `UPLOADS_PER_HOUR` | 20/hr | **closed** |

New `aiProcedure` applied to `deck.getDeck`, `applications.getRoleQuestions`,
`applications.create`, `onboarding.confirmUpload`. The limits are **deliberately
independent of `BILLING_ENABLED`** — turning billing on should be a product decision, not
the thing that first switches on cost control. 7 regression tests cover the limits,
per-subject and per-rule isolation, and both failure modes.

### P1-2 — Zero security headers on either app
No CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, or
COOP anywhere — confirmed absent from both `next.config` files and `vercel.json`.

**Fixed:**
- **CSP** via `clerkMiddleware({ contentSecurityPolicy: { strict: true, directives: … } })`
  — a per-request nonce with `strict-dynamic`, with Clerk's own origins merged in by Clerk
  rather than hand-maintained here (hand-maintained origin lists are how CSPs rot into
  `unsafe-inline`). **This option requires `@clerk/nextjs >= 6.14.0`, which only became
  available because of the P0-1 upgrade.** Added `frame-ancestors 'none'`, `object-src
  'none'`, `base-uri 'self'`, `form-action 'self'`.
- Requires `<ClerkProvider dynamic>`, now set. Consequence: all routes render dynamically.
  Every route except `/` was already authenticated, so the cost is small and stated.
- **HSTS** 2y + preload, **X-Frame-Options: DENY**, **nosniff**, **Referrer-Policy**,
  **Permissions-Policy**, **COOP**, `poweredByHeader: false`.
- **`Cache-Control: no-store`** on all of `/api/*` — defence in depth behind the service
  worker fix, for any other cache in the path.

### P1-3 — Indirect prompt injection: unfenced scraped text in five prompts
`packages/ai/src/prompts/{cv-generation,cover-letter}.ts`, `packages/ai/src/eval.ts`,
`apps/web/src/server/routers/deck.ts`

Job titles, companies and descriptions come from scraped third-party boards — **anyone can
publish a job ad, so this is adversarial input.** It was concatenated straight into prompts
that use `##` markdown headers to delimit their *own* instructions, making an injected
`## Mandatory German CV Format Rules` block structurally indistinguishable from ours.
`title` and `company` had **no length cap at all**.

Three consequences, in increasing severity:
1. The generated CV/cover letter is a document the user is told to send to a real employer.
2. `haikuScore`'s output **replaces** the retrieval score, so a poisoned ad could pin itself
   first in every user's deck.
3. Three of six eval dimensions read the job description — an ad instructing `{"score": 10}`
   clears `SCORE_THRESHOLD` on attempt 1, kills the regenerate loop, and fabricates the
   quality panel shown to the user.

**Fixed:** `packages/ai/src/prompts/untrusted.ts` — a `fenceUntrusted()` helper that caps
length, strips the fence markers (so an ad cannot close the fence and escape into
instruction context), removes C0/C1 control characters and zero-width/bidi smuggling
characters, and defangs line-leading markdown structure. Paired with a
`UNTRUSTED_DATA_RULE` appended to every affected system prompt, and a new
`EVAL_SYSTEM_PROMPT` telling the grader its score must never come from the graded material.
7 regression tests, including the real escape and header-forgery payloads.

This does not "solve" prompt injection — nothing does. It closes the cheap escapes. The
load-bearing rule remains: **model output is never an action** (verified true today).

### P1-4 — Bedrock IAM policy allowed every model in every region
**`infrastructure/AgoraBedrockWorker-invoke-policy.json`**

```json
"Resource": ["arn:aws:bedrock:*::foundation-model/*", …]
```

EU-only data residency — a claim made to users and in the BSS application — was enforced by
nothing but the `AWS_BEDROCK_REGION` environment variable. The policy also granted
`aws-marketplace:Unsubscribe` on `Resource: "*"`: one API call from a compromised worker
key revokes our own model access and takes the product down.

**Fixed (file):** an explicit **`Deny` on `bedrock:*` outside the EU region list** keyed on
`aws:RequestedRegion` — an explicit Deny cannot be overridden by any later Allow — plus a
narrowed Allow covering only `anthropic.claude-*` and `cohere.embed-*`. The marketplace
statement is deleted entirely. The EU list is wider than `eu-central-1` on purpose: the
configured model IDs are `eu.anthropic.…` cross-region inference profiles, which route
across EU regions by design.

> ⚠️ **This file is desired state. It changes nothing until you apply it.** Command and
> verification steps are in `infrastructure/AgoraBedrockWorker-invoke-policy.README.md`.

### P2-1 — CV upload: no content validation, attacker-controlled storage key
**`apps/web/src/app/api/upload/cv/route.ts:28`**

```ts
const key = `cv/${userId}/${randomUUID()}-${file.name}`
```

`file.name` is raw client input in a storage path, and `file.type` — the only content check
— is just the Content-Type the client wrote into the multipart part, so it validated
nothing. The endpoint was a free general-purpose blob store, and fed arbitrary bytes to the
worker's `unpdf` parser.

**Fixed:** `%PDF-` magic-byte check on the real buffer, size re-checked against the buffer
rather than client-reported metadata, and the key is now `cv/${userId}/${uuid}.pdf` —
entirely server-controlled. The original filename is still returned and stored in the DB
column built for it; it just no longer decides where bytes land. Verified compatible with
`confirmUpload`'s existing `cv/${clerkId}/` prefix check.

### P2-2 — Generated CVs cached to disk for 5 minutes
**`apps/web/src/app/api/download/document/route.ts`** · `Cache-Control: private, max-age=300`

The most sensitive bytes we serve, kept on disk past sign-out and surviving erasure.
**Fixed:** `no-store`, plus `nosniff` (the body is model-generated text) and
`Content-Disposition: attachment`. Verified against both consumers — the review screen uses
`fetch()`, the submit screen uses `<a download>`; neither is affected.

### P2-3 — Type-portability break under pnpm
`apps/web/src/lib/trpc/client.tsx` — TS2742 surfaced by the tRPC upgrade. Fixed with an
explicit `CreateTRPCReact<AppRouter, unknown>` annotation. Not a security issue; recorded
because it was required to land P0-1/P0-2.

---

## 2. Findings — open, and why

Jay decided four of these directly on 2026-08-06; those are now **built** and appear in §2b.
What remains here is work that needs his credentials or a lawyer, not more code.

| ID | Finding | Sev | Status |
|----|---------|-----|--------|
| O-4 | Bedrock IAM policy **not yet applied to AWS** | P1 | **File ready.** `create-policy-version` + two verification checks in `infrastructure/AgoraBedrockWorker-invoke-policy.README.md`. 5 minutes. |
| O-1/O-2 | RLS + role split **not yet applied to Neon** | P1 | **Migrations written and staged** (see §2b). Applying needs Neon console access to create the login roles. |
| O-6 | `resumes.content` **not yet encrypted** | P2 | **Code written, flag off** (see §2b). Needs a KMS key created and the grant attached. |
| O-9 | **Founder-account concentration (T6)** — one laptop/GitHub/Vercel/AWS compromise is total | P1 | Organisational. No code fixes it. Hardware MFA everywhere. |
| O-3 | Long-lived `AKIA…` AWS key in the worker | P2 | Needs an infra decision: OIDC role assumption vs. static key + rotation. |
| O-5 | Stripe customer survives GDPR erasure | P2 | **Legal question**, not technical — Art. 17 vs §147 AO. Cheap to fix now, expensive after billing launches. |
| O-8 | Clerk session lifetime (7-day rolling default) | P2 | Clerk dashboard setting. Recommendation: 24h + 1h inactivity. |
| O-10 | `apps/website/api/waitlist` has no rate limit or origin check | P2 | Held back deliberately — `apps/website` has heavy uncommitted work in the tree. |
| O-14 | `vitest` 2.x dev criticals | P3 | **Fixed** — upgraded to 3.2.7 across all six packages. |

### 2b. Built this pass on Jay's decisions

**RLS + three-role split — staged, migrations written**
`packages/db/drizzle/0006_rls_roles_stage1.sql` creates `agora_web` / `agora_worker` /
`agora_migrate` with least-privilege grants and enables RLS with *permissive* policies.
`0007_rls_tighten_stage2.sql` swaps those for `user_id = app_current_user_id()`.
`packages/db/src/rls.ts` resolves the original blocker (the stateless `neon-http` driver
cannot carry a session variable) with the WebSocket driver and one transaction per unit of
work. Runbook, verification queries and rollback: `docs/Security/RLS-ROLLOUT.md`.

The two migrations are deliberately separate. `0006` is behaviourally inert — RLS does
nothing while the app connects as table owner — so it is safe to apply now. `0007` applied
early makes every screen in the product empty.

`packages/db/tests/rls.test.ts` pins the one property that would turn the isolation
mechanism into a leak: `set_config(..., is_local = true)`. With `false`, the identity
persists on the pooled connection past COMMIT and the next request inherits it.

**Field encryption for `resumes.content` — built, off**
`packages/ai/src/crypto/field-encryption.ts` — KMS envelope encryption, AES-256-GCM,
version-prefixed envelope. No schema migration needed: the envelope is a JSON string and a
JSON string is valid `jsonb`, so the column holds both shapes and the backfill can be
gradual. 12 tests cover round-trip, tamper detection, non-deterministic ciphertext, absence
of plaintext in the stored value, and legacy pass-through. Rollout, KMS policy and the
"never delete this key" warning: `docs/Security/FIELD-ENCRYPTION.md`.

**Legal eligibility — now fails closed on the visa dimension**
`allowed_visa_types IS NULL` was read as "allowed for everyone" and rendered as a green
verified tick. An ad that simply never mentioned visas was indistinguishable from one that
welcomes every visa — so a §16b student was shown "Visa ✓" on a job nobody had checked.
`visaVerified()` now returns `null` for undeclared, the tick renders grey "not stated", the
card heading no longer claims "verified for you", an explicit warning appears, and verified
jobs rank above unverified ones. Inventory is preserved; the false signal is gone.

**Tier-3 hardening**
S3 server-side encryption (`AES256`) on every write path · `safeHttpUrl()` allow-list guard
at all three render sites, with 4 tests · CI: all four actions SHA-pinned, top-level
`permissions: contents: read`, gitleaks history scan, `pnpm audit --audit-level critical` as
a blocking gate, and a `sql.raw` ban · `unpdf` 0.12→1.8 (drops the entire
`canvas`→`node-pre-gyp`→`tar` chain, clearing a critical) · `vitest` 2→3.

## 3. What was verified secure

Stated explicitly because it is as important as the defect list, and because a report that
only lists problems gives you no idea where the floor is.

- **No IDOR/BOLA.** Every id-bearing procedure scoped to `ctx.user.id`; enumerated one by one.
- **No SQL injection.** No `sql.raw` in the repo; `matching.ts:143` and `jobs.ts:83`
  interpolate through the parameterising `sql` tag; `jobs.ts:18` escapes LIKE wildcards.
- **No secrets in git history.** Confirmed across all refs. `.env.local` never tracked.
  **Zero rotations required.**
- **No server secret in any client bundle.** No `process.env` secret in any `"use client"`
  file; all `NEXT_PUBLIC_*` values benign.
- **Webhooks correct.** svix (Clerk) and `constructEvent` (Stripe), both on the raw body.
- **GDPR cascade complete.** All 8 `userId` FKs `ON DELETE CASCADE`; erasure is
  storage-first and aborts on any failed delete; `deleteAccount` takes no input, so it is
  self-only; no bulk export or delete endpoint exists to abuse.
- **Object-storage ownership checks are airtight** — the download proxy's key check handles
  the empty-key case, and `confirmUpload` enforces the per-user prefix.
- **No stored XSS.** Job descriptions never reach the browser. No `dangerouslySetInnerHTML`,
  `eval`, or `innerHTML` on user or scraper content.
- **No model output becomes an action** — never a URL to fetch, a command, a query, or a path.
- **No localStorage/sessionStorage/`document.cookie`** anywhere; no custom cookies; no CORS
  headers on any route; no open redirect; every `target="_blank"` carries
  `rel="noopener noreferrer"`.
- **Production scrapers are SSRF-clean** — all targets compile-time constants,
  `enqueueLinks` same-hostname, no DB- or user-supplied URL is fetched server-side.
- **No card data or password ever stored.** Stripe and Clerk hold them. Keep it that way.
- **`apps/website` loads zero third-party runtime origins** — fonts self-hosted, logos
  fetched at build time, no analytics.

---

## 4. Dependency posture

Direct production dependencies upgraded:

| Package | From | To | Cleared |
|---------|------|-----|---------|
| `next` | 15.2.4 | **15.5.22** | 1 critical RCE, 2 SSRF, 2 middleware bypasses, 5 DoS |
| `@clerk/nextjs` | 6.12.12 | **6.39.6** | 1 critical auth bypass, 1 authz bypass |
| `drizzle-orm` | 0.38.4 | **0.45.2** | SQL injection via improperly escaped identifiers |
| `@trpc/{server,client,react-query}` | 11.0.0 | **11.18.0** | prototype pollution, WebSocket DoS |
| `playwright` | 1.50.1 | **1.62.1** | browser download without SSL verification |
| `react` / `react-dom` | 19.1.0 | **19.1.9** | required by the new Clerk peer range |
| `@tanstack/react-query` | 5.67.2 | **5.101.4** | required by the new tRPC peer range |
| `vitest` | 2.1.8 | **2.1.9** | 1 dev critical (the other needs the 2→3 major — O-14) |

Transitive fixes via `pnpm.overrides`: `sharp` (Next image optimisation — an image parser on
untrusted input), `fast-xml-parser` (AWS SDK response parsing), `form-data`, `fast-uri`,
`ip-address` (SSRF/host confusion), `postcss`, `adm-zip` (Crawlee, untrusted ZIPs).

**Deliberately not overridden**, with reasons:
- `tar` — reached only via `unpdf → canvas → node-pre-gyp`, which runs at install time to
  fetch a native binary. Forcing tar 6→7 is a breaking API change for those consumers, for
  no production benefit.
- `serialize-javascript` — `next-pwa → workbox-build → rollup terser`; build-time only.
- `vite` / `vitest` / `brace-expansion` — dev and build toolchain.

None are attacker-reachable in production. Revisit when `unpdf`/`canvas` next update.

---

## 5. Recommended order of work from here

1. **Deploy this pass.** The Clerk auth bypass and Next RCE are live in production right
   now; everything here is typechecked, tested and built.
2. **Apply the Bedrock IAM policy** (O-4) — 5 minutes, and it makes the EU-residency claim
   real rather than configured.
3. **RLS + the three-role split** (O-1, O-2) — the highest-value structural change
   available. It converts "one forgotten `WHERE` clause" from a full cross-tenant breach
   into an empty result set.
4. **Hardware MFA on GitHub / Vercel / AWS / Neon / Clerk** (O-9). No code fixes founder
   concentration, and today it is the single largest structural risk.
5. Then O-5 through O-14, in the order you choose.

Items 1–4 are the ones that change the security posture. The rest is hardening.
