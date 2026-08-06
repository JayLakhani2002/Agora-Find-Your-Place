# Security Assessment 02 — Secrets, Credential Hygiene, Git History, CI/CD, Supply Chain

Date: 2026-08-06 · Scope: whitebox, read-only · Assessor: AppSec (agent)

## Executive Summary

**Were secrets ever committed to git history? NO.** All `sk_test`/`whsec_`/`AKIA`/`postgresql://` history hits resolve to `.env.example` placeholders, docs, and adversarial eval-suite strings. `.env.local` and `apps/web/.env.local` were never tracked (`git log --all -- .env.local apps/web/.env.local '**/.env'` returns empty; both are covered by `.gitignore` line 3). No credential rotation is required from a git-leak standpoint.

The real exposure is in the dependency tree: **95 advisories (6 critical, 47 high)**, including a critical Clerk middleware auth-bypass and a critical Next.js React-flight RCE, both reachable from the production web app.

---

## Findings

### [SEV-P0] Critical/high vulnerabilities in production-reachable dependencies
- **File / commit:** `pnpm-lock.yaml` (current HEAD)
- **Evidence:** `pnpm audit`: 6 critical, 47 high, 38 moderate, 4 low. Production-reachable (apps/web, apps/website):
  - **CRITICAL `@clerk/nextjs` 6.12.12** — "Middleware-based route protection bypass" (patched >= 6.39.2) + 3 HIGH Clerk authz-bypass advisories. This is the auth layer of the product.
  - **CRITICAL `next` 15.2.4** — RCE in React flight protocol (patched >= 15.2.6) + 12 HIGH (middleware/proxy bypass, SSRF in Server Actions/rewrites, multiple DoS; fully fixed at >= 15.5.21).
  - **CRITICAL `fast-xml-parser`** — entity-encoding bypass (patched >= 4.5.4), reachable via apps/web + packages/ai.
  - **HIGH `drizzle-orm`** — SQL injection via improperly escaped identifiers (patched >= 0.45.2), reachable from packages/db → every app.
  - **HIGH `@trpc/server`** — prototype pollution + WS DoS (patched >= 11.8.0).
  - **HIGH `sharp`, `form-data`, `fast-uri`, `serialize-javascript`** — all in apps/web paths.
- **Workers/dev-only (lower urgency):** CRITICAL `tar` DoS, CRITICAL `vitest` RCE (dev-server-only exploit paths), HIGH `adm-zip`, `playwright`, `ip-address` (apps/workers); `vite`, `postcss` (build-time).
- **Impact:** Auth bypass on the auth provider SDK plus middleware bypass in the framework is a direct account-takeover / data-exposure chain on a GDPR-scoped app holding CVs and PII.
- **Fix:** Upgrade now, in this order: `@clerk/nextjs` → >= 6.39.3, `next` → >= 15.5.21, `drizzle-orm` → >= 0.45.2, `@trpc/server` → >= 11.8.0, `fast-xml-parser` → >= 4.5.5, `sharp` → >= 0.35.0. Then `pnpm audit` again and clear remaining highs. Add a CI `pnpm audit --prod --audit-level high` gate (see P2 below).

### [SEV-P2] No supply-chain hardening in pnpm config (postinstall / release-age protections absent)
- **File / commit:** `package.json`, `pnpm-workspace.yaml`, no `.npmrc`
- **Evidence:** No `minimumReleaseAge`, no `onlyBuiltDependencies` / `ignoredBuiltDependencies`, no `trustedDependencies` configured anywhere in the workspace. (Positive: no first-party `postinstall`/`prepare`/`preinstall` scripts exist, and `pnpm-lock.yaml` contains zero git/http/file: resolutions — all deps come from the registry.)
- **Impact:** A compromised upstream release (Shai-Hulud-class worm, Sept 2025 pattern) executes install scripts on dev machines and CI within minutes of publication.
- **Fix:** In `pnpm-workspace.yaml` add `minimumReleaseAge: 4320` (3 days) and an explicit `onlyBuiltDependencies` allowlist (likely just `sharp`, `esbuild`, `@biomejs/biome`). pnpm >= 10 skips build scripts by default — verify the workspace is on pnpm 10+.

### [SEV-P2] Bedrock IAM policy is region- and model-unscoped; marketplace Subscribe on `*`
- **File / commit:** `infrastructure/AgoraBedrockWorker-invoke-policy.json` (commit 8c6e120)
- **Evidence:** `Resource: "arn:aws:bedrock:*::foundation-model/*"` and `inference-profile/*` — any region, any model; second statement grants `aws-marketplace:Subscribe`/`Unsubscribe` on `Resource: "*"`.
- **Impact:** (a) Contradicts the EU-only data-residency commitment — the worker credential can invoke models in us-east-1 etc.; a prompt-injection or credential-theft incident could route CV/PII content outside the EU. (b) `aws-marketplace:Subscribe` on `*` lets the worker key subscribe the account to arbitrary paid marketplace products (cost abuse).
- **Fix:** Scope Resource ARNs to `arn:aws:bedrock:eu-central-1::foundation-model/...` and the specific `eu.anthropic.*` / cohere inference-profile ARNs actually used. Remove the marketplace statement from the runtime worker policy — subscription is a one-time admin action; do it with an admin role, not the worker's steady-state credentials. The policy also embeds AWS account ID 328559741463 in a public-ish repo file — harmless alone, but prefer keeping account IDs out of committed IaC.

### [SEV-P2] GitHub Actions not SHA-pinned and no `permissions:` scoping
- **File / commit:** `.github/workflows/ci.yml`
- **Evidence:** `uses: actions/checkout@v6`, `pnpm/action-setup@v6`, `actions/setup-node@v6` — mutable tags, not commit SHAs. No top-level or job-level `permissions:` block, so the default (potentially write) `GITHUB_TOKEN` scope applies. (Positive: no `pull_request_target`, no secret echoing, `--frozen-lockfile` used in both jobs, and the `DATABASE_URL` secret is only exposed to the `db-check` job which runs on `main` pushes only — fork PRs never see it.)
- **Impact:** A compromised action tag executes with the workflow's token; tag-retargeting was the vector in the 2025 `tj-actions/changed-files` incident.
- **Fix:** Pin all three actions to full commit SHAs (Dependabot keeps them fresh), and add `permissions: contents: read` at workflow top level.

### [SEV-P3] Local `.env.local` holds long-lived static cloud keys (AWS IAM user, Scaleway, Upstash, Neon)
- **File / commit:** `.env.local` + duplicate `apps/web/.env.local` (untracked, gitignored — names only inspected)
- **Evidence:** Real values present for `AWS_ACCESS_KEY_ID` (AKIA…, len 20) + `AWS_SECRET_ACCESS_KEY` (len 40), `S3_ACCESS_KEY` (SCW9…, len 20) + `S3_SECRET_KEY` (len 36), `UPSTASH_REDIS_REST_TOKEN` (len 62), `DATABASE_URL` with embedded password (len 129), `CLERK_SECRET_KEY` (sk_t…, test instance). Stripe values are placeholders; webhook secret is placeholder.
- **Impact:** Not a leak today (never committed, gitignored), but two identical copies of static long-lived keys on a laptop widen the accidental-exposure surface (backup tools, screen shares, other agents reading the tree). AKIA-prefix keys are permanent IAM-user credentials with no expiry.
- **Fix:** Deduplicate to one file (Next.js reads `apps/web/.env.local`; the root copy exists for workers/scripts — consider `.env.local` symlink or direnv). Longer term: replace the IAM user with short-lived credentials (aws-vault / SSO session) and move production secrets to Vercel/Railway env stores only. Verify the Bedrock IAM user attached to this AKIA key carries only the invoke policy above.

### [SEV-P3] Arbeitsagentur scraper hardcoded API key — accepted risk, document it
- **File / commit:** `apps/workers/src/jobs/scrape-arbeitsagentur.ts:9`
- **Evidence:** `const BA_KEY = "jobboerse-jobsuche"` sent as `X-API-Key` to `rest.arbeitsagentur.de`.
- **Impact:** None as a secret — this is the publicly known static client key of the BA Jobsuche API (the same value every consumer of the unofficial API uses; it identifies the app, not you). Risk is operational, not confidentiality: BA can rotate/revoke it at any time, silently breaking ingestion, and usage sits in unofficial-API territory (legal posture already tracked in docs/Job Data).
- **Fix:** No rotation needed. Move it to env (`BA_API_KEY`) with this value as default so a BA-side rotation is a config change, not a deploy; add a health alert on 401/403 from the BA endpoints.

### [SEV-P3] Investor XLSX committed in history (removed at HEAD, still retrievable)
- **File / commit:** `Business Planning/Investor Package/Agora-Credit-Calculator.xlsx` — added historically, moved out in 16fdde3 ("move investor decks... out of the repo")
- **Evidence:** File appears in `git log --all --diff-filter=A` output; absent from `git ls-files` at HEAD.
- **Impact:** Anyone with repo read access can recover pricing/financial model internals from history. No credentials or user PII involved. Currently tracked business files (`docs/Business Documents/06-Financial-Model.md`, `BSS-Research-2025-2026.csv`) are business-sensitive but contain no secrets; the `.sql` files under `packages/db/drizzle/` are schema migrations, no data.
- **Fix:** Acceptable for a private repo. If the repo ever goes public or gets external collaborators, rewrite history (`git filter-repo --path 'Business Planning/Investor Package' --invert-paths`) first. No `.DS_Store`, `graphify-out/`, or screenshot dumps are tracked.

### [SEV-P3] No secret-scanning or audit gate in CI
- **File / commit:** `.github/workflows/ci.yml`
- **Evidence:** CI runs typecheck/lint/test/build + drizzle check only. No gitleaks/trufflehog step, no `pnpm audit` gate, and GitHub secret scanning + push protection status unverified.
- **Impact:** The controls that kept this repo clean so far are convention (`.gitignore`) not enforcement; one bad `git add -f` ships a key.
- **Fix:** Add a `gitleaks/gitleaks-action` (SHA-pinned) job and `pnpm audit --prod --audit-level=high` (allow-list the accepted findings). Enable GitHub push protection on the repo settings.

---

## Credential Rotation Checklist

**Required now: NONE.** No secret was ever committed to git history; nothing in this assessment observed a secret in a shareable location.

Rotate opportunistically / on schedule:
| Credential | Why | Priority |
|---|---|---|
| AWS IAM user access key (AKIA…, in `.env.local`) | Permanent static key; replace with short-lived SSO/aws-vault creds | Medium |
| Scaleway S3 key pair (SCW9…) | Static; scope to the single bucket if not already | Medium |
| Upstash REST token | Static bearer token | Low |
| Neon `DATABASE_URL` password | Rotate when moving to prod; use separate roles for app vs. migrations | Low |
| Clerk `sk_test_…` | Test instance — rotate before creating the production instance, never reuse | Low |

## Secrets Inventory

| Name | Where stored | Who can read |
|---|---|---|
| DATABASE_URL / DATABASE_URL_UNPOOLED (Neon, embedded password) | `.env.local`, `apps/web/.env.local` (gitignored); GitHub secret `DATABASE_URL` (db-check job) | Local machine; repo admins via Actions secret |
| CLERK_SECRET_KEY (sk_test) | both `.env.local` files | Local machine |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (pk_test) | both `.env.local` files; shipped to browser by design | Public (intended) |
| CLERK_WEBHOOK_SIGNING_SECRET | placeholder only — not yet provisioned | — |
| AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (Bedrock worker) | both `.env.local` files | Local machine |
| S3_ACCESS_KEY / S3_SECRET_KEY (Scaleway fr-par) | both `.env.local` files | Local machine |
| REDIS_URL / UPSTASH_REDIS_REST_TOKEN | both `.env.local` files | Local machine |
| STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRO_PRICE_ID | placeholders only (`BILLING_ENABLED=false`) | — |
| SENTRY_DSN | placeholder only | — |
| ANTHROPIC_API_KEY (website Ari chat) | documented in `apps/website/.env.example` only; no local value found | — |
| BA Jobsuche `X-API-Key` | hardcoded `apps/workers/src/jobs/scrape-arbeitsagentur.ts:9` | Public by nature (shared static community key) |

## Verified-Clean Checks
- `.env.local` / `apps/web/.env.local` / any `.env`: **never committed** (git log empty; `.gitignore:3` covers both).
- History `.env.example` at every revision: all secret slots are `REPLACE_ME`/`xxx`/`...` placeholders; only non-secret values (regions, model IDs, URLs) are real.
- `sk_live` / `postgres://user:pass@` history hits: adversarial *test strings* in `Eval-Suites/suites/agent1.js` and a CI placeholder URL — not credentials.
- No private key material (`BEGIN … PRIVATE KEY`), no `ghp_`/`xoxb-` tokens anywhere in history.
- No client-component (`"use client"`) file references a non-`NEXT_PUBLIC_` `process.env` var; all `NEXT_PUBLIC_*` vars are benign (URLs, Clerk publishable config).
- `pnpm-lock.yaml`: zero git/http/file: resolutions; no first-party install scripts.
- Vercel region `fra1` and `AWS_BEDROCK_REGION=eu-central-1` match the EU-residency claim; Railway config has **no region pin** — set the Railway service region to an EU region explicitly.
