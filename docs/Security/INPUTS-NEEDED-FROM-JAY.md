# Security — inputs needed from Jay

**Date:** 2026-08-06 · **Updated** after your four decisions.

## Where things stand

You answered four questions. All four are **built, tested and committed to the working
tree**. None of them are live, because each needs a credential or console action that is
yours to perform:

| Your decision | What I built | What you do next |
|---|---|---|
| RLS: **build it now, staged** | Migrations `0006` (roles + RLS permissive) and `0007` (isolation), `packages/db/src/rls.ts`, 5 tests, full runbook | Create three login roles in the Neon console, then apply `0006`. `docs/Security/RLS-ROLLOUT.md` |
| Encryption: **`resumes.content` only, AWS KMS** | `field-encryption.ts` (envelope, AES-256-GCM), 12 tests, backfill script, flag **off** | Create the KMS key in eu-central-1, attach the 2-action grant, set 3 env vars. `docs/Security/FIELD-ENCRYPTION.md` |
| Visa filter: **fail closed + separate section** | `visaVerified()`, grey "not stated" tick, explicit warning, verified-first ranking, 6 tests | Nothing — ships with the next deploy |
| Tier 3: **S3 encryption + "suggest the best action"** | S3 SSE, `safeHttpUrl` guard, CI hardening (SHA-pins, permissions, gitleaks, audit gate, `sql.raw` ban), `unpdf`+`vitest` upgrades that cleared the last critical | Confirm the `agorajobsdocs` bucket blocks public access |

> **On "suggest me the best action":** I did everything in the Tier-3 list **except** the
> waitlist rate limit, which touches `apps/website` where you have a lot of uncommitted
> work. Say the word and it takes five minutes. I also went beyond the list and upgraded
> `unpdf` — it removed the `canvas → node-pre-gyp → tar` chain entirely, which was the last
> thing standing between you and a green `pnpm audit --audit-level critical` gate in CI.

**Verification:** typecheck 8/8 · **615 tests passing** · lint clean · build 3/3 · zero
critical advisories.

---

## Tier 1 — do these regardless

### A. Deploy the dependency upgrades now

`@clerk/nextjs@6.12.12` carries a **critical middleware auth-bypass** and `next@15.2.4` a
**critical RCE**. Both are live in production today. The upgrade is done and verified in
this repo; it just needs to ship.

**Recommended move:** review the diff, then deploy. If you want a staged rollout, deploy
`apps/web` first — that is where both criticals live. `apps/website` only carries the Next
upgrade.

**Watch on first deploy:** all routes are now dynamically rendered (a required consequence
of the nonce-based CSP). Check the Vercel function count and cold-start times. If `/` being
dynamic bothers you, it can be exempted — say the word.

### B. Apply the Bedrock IAM policy — 5 minutes

`infrastructure/AgoraBedrockWorker-invoke-policy.json` is rewritten but **is only a file**.
Nothing in AWS has changed.

Currently the policy allows every Bedrock model in **every AWS region**, so EU-only data
residency is enforced by an environment variable and nothing else. It also grants
`aws-marketplace:Unsubscribe` on `*` — one call from a stolen worker key takes the product
offline.

**Recommended move:** run the `create-policy-version` command in
`infrastructure/AgoraBedrockWorker-invoke-policy.README.md`, then run both verification
checks in that file (a normal invoke should succeed; `AWS_BEDROCK_REGION=us-east-1` should
now fail with `AccessDenied`). Keep the old policy version until both pass.

### C. Hardware MFA on every founder account

Today, one compromised laptop or account = every asset. GitHub, Vercel, Railway, AWS, Neon,
Clerk, Stripe. This is the largest structural risk in the whole assessment and no code
change touches it.

**Recommended move:** two hardware keys (one carried, one in a drawer) enrolled everywhere
that supports WebAuthn; TOTP where it does not; remove SMS as a factor entirely. Set AWS
root to hardware MFA and then never use root again.

---

## Tier 2 — needs your decision

### D. Row Level Security + splitting the database role — ✅ BUILT, awaiting Neon roles

**You said: build it now, staged.** Done.

- `packages/db/drizzle/0006_rls_roles_stage1.sql` — creates `agora_web`, `agora_worker`,
  `agora_migrate`; least-privilege grants (web cannot write `jobs`, cannot DDL, cannot
  TRUNCATE); enables RLS on all 8 user-linked tables with **permissive** policies.
- `packages/db/drizzle/0007_rls_tighten_stage2.sql` — swaps those for
  `user_id = app_current_user_id()`, NULL-safe so a request with no user context sees
  nothing rather than everything.
- `packages/db/src/rls.ts` — `withUserContext()`, resolving the original blocker: the
  stateless `neon-http` driver cannot carry a session variable, so this uses the WebSocket
  driver with one transaction per unit of work.
- `packages/db/tests/rls.test.ts` — 5 tests, including the one that matters:
  `set_config(..., is_local = true)`. With `false` the identity persists on the pooled
  connection past COMMIT and the next request inherits it — a cross-tenant leak created by
  the isolation mechanism itself.

**Your next step:** create three login roles in the Neon console and grant each the matching
group role, then apply `0006`. Full runbook with verification queries and rollback:
`docs/Security/RLS-ROLLOUT.md`.

**Do not apply `0007` yet.** It requires every user-scoped query to route through
`withUserContext` first. Applied early, every screen in the product goes empty. That is
exactly why it is a separate migration.

**Honest note on the cost:** stage 2 means the web app holds a real connection per request
instead of stateless HTTP. That is more expensive on serverless and introduces a connection
ceiling. I still think it is worth it for this dataset, but you should see the Neon
connection metrics after stage 2 before deciding it was free.

`packages/db/drizzle/0002_rls_decision.md` — the doc that originally said "no RLS" — is
marked superseded, with the reasoning for the reversal preserved rather than deleted.

### E. `resumes.content` encryption — ✅ BUILT, awaiting KMS key

**You said: `resumes.content` only, AWS KMS.** Done, and switched **off** until you create
the key.

- `packages/ai/src/crypto/field-encryption.ts` — KMS envelope encryption (KMS mints the data
  key, AES-256-GCM does the payload), because `kms:Encrypt` caps at 4 KB and résumé JSON
  exceeds that. GCM because it is authenticated: a tampered row fails loudly instead of
  decrypting to something different.
- **No schema migration needed.** The envelope is a JSON string, and a JSON string is valid
  `jsonb` — so the existing column holds both shapes and the backfill can be gradual rather
  than a flag day. That was a nice break.
- `packages/ai/tests/field-encryption.test.ts` — 12 tests: round-trip, tamper detection,
  no plaintext in the stored value, non-deterministic ciphertext, key caching, legacy
  pass-through.
- `apps/workers/scripts/backfill-resume-encryption.ts` — interruptible, re-runnable.

**Your next step:** create the key in eu-central-1, attach a grant of exactly
`kms:GenerateDataKey` + `kms:Decrypt` on that one key ARN, set three env vars, then run the
backfill. Full procedure: `docs/Security/FIELD-ENCRYPTION.md`.

**The one thing that can go badly wrong:** deleting or disabling that KMS key makes every
encrypted résumé permanently unrecoverable — including in Neon backups. Put it on whatever
list already contains "do not delete the database". Enable annual rotation; rotation is
transparent here.

As agreed, `visa_type` is **not** encrypted: it drives the SQL legal filter, and moving that
filter into application code is a bigger risk than the encryption removes.

### F. Stripe customer survives GDPR erasure

`eraseUserAndStorage` deletes the DB rows and the object storage, but never calls
`customers.del`. Email and billing history remain at Stripe after a user exercises Art. 17.

This is genuinely a legal question, not a technical one: German **§147 AO** requires
retention of accounting records (typically 10 years), which is a lawful basis for keeping
*some* of it — but probably not for keeping the customer's email and name attached.

**Recommended move:** ask your tax adviser or the German legal review you are already
planning for auto-apply, since it is the same conversation. In the meantime the defensible
position is: delete the Stripe **customer object** (removing name/email) while retaining
the **invoices**, which is what §147 actually requires. Once you confirm, this is a small
code change I can make.

**Note:** with `BILLING_ENABLED` unset, no Stripe customers exist yet. So this is cheap to
fix now and expensive to fix after launch. Worth resolving before billing goes live.

### G. Clerk session lifetime

Default is a 7-day rolling session. Your users are students on shared university machines.
A sign-out control now exists (it did not before), but most people will not use it.

**Recommended move:** shorten the session to **24 hours** with a 1-hour inactivity timeout,
in the Clerk dashboard. For this audience I would take the extra sign-ins over a week-long
session on a library computer. Purely a dashboard setting; no code.

### H. AWS worker uses a long-lived `AKIA…` key

Scoping the IAM policy (item B) limits the blast radius but the static secret still exists
and never expires.

**Recommended move:** move Railway → AWS to **OIDC role assumption** so there is no
long-lived key to steal. If Railway's OIDC support does not fit, the fallback is a
90-day rotation reminder — meaningfully worse, but better than never.

Lower priority than A–D. Worth doing before you take on a second engineer.

### I. Legal eligibility — ✅ FIXED (fail closed + separate treatment)

**You chose: fail closed, show them in a clearly-labelled section rather than hiding them.**
Implemented that way.

`allowed_visa_types IS NULL` was read as "allowed for everyone" and rendered as a **green
verified tick**. An ad that simply never mentioned visas was indistinguishable from one that
welcomes every visa — so a §16b student saw "Visa ✓" on a job nobody had checked. That
false-confidence signal was worse than showing nothing.

Now:
- `visaVerified()` returns `null` when the ad declared no allow-list, `true` only when it
  declared one containing the user's visa.
- The tick renders grey "not stated" (`TickRow` already handled `null` — only the type and
  the server were lying).
- The card heading no longer says "verified for you" when nothing was verified.
- An explicit amber line appears: *"This ad doesn't state its visa requirements — check with
  the employer before applying."*
- Verified jobs rank above unverified ones in the deck.
- 6 regression tests.

Your inventory is intact. The misleading signal is gone.

## Tier 3 — ✅ done, except one

- ✅ **S3 server-side encryption** — `AES256` on both write paths in `storage.ts`.
  **You still need to confirm** the `agorajobsdocs` bucket blocks public access; that is a
  console check I cannot make from here.
- ✅ **CI hardening** — all four actions SHA-pinned (I verified each SHA against the GitHub
  API; the first gitleaks pin I wrote was wrong and the check caught it), top-level
  `permissions: contents: read`, a gitleaks full-history scan, and
  `pnpm audit --audit-level critical` as a **blocking** gate.
- ✅ **`safeHttpUrl()`** at all three render sites, allow-list not block-list, 4 tests.
- ✅ **`sql.raw` CI guard** — greps `apps` and `packages`, fails the build on a hit. Dry-run
  passes today (the surface is genuinely clean).
- ✅ **`vitest` 2 → 3** across all six packages.
- ⏸️ **Waitlist rate limit** — the only one I skipped. It touches `apps/website`, where you
  have substantial uncommitted work, and I did not want to collide with it. Five minutes
  whenever you say.

**One thing I did that was not on the list:** upgraded `unpdf` 0.12 → 1.8. The new version
has *zero* dependencies, which removed the entire `canvas → node-pre-gyp → tar` chain — and
`tar` was carrying the last critical advisory in the tree. Without it the new CI audit gate
would have been red on the day it was added, which would have made it worthless. Worth
smoke-testing CV text extraction after deploy: the API call is unchanged
(`getDocumentProxy` + `extractText`) and all 43 worker tests pass, but it is a major version
bump on the PDF parser.

---

## Rate limits I picked — override if these are wrong

These are guesses at your real usage. They are one-line changes in
`apps/web/src/server/lib/rate-limit.ts`.

| Rule | Limit | Reasoning |
|------|-------|-----------|
| All authenticated requests | 240/min | Loose; catches scripted scraping only |
| AI calls | 6/min | A deck load is one call; 6 covers heavy legitimate use |
| AI calls | 120/day | The real budget backstop, since one `getDeck` is up to 30 Bedrock calls |
| CV uploads | 20/hr | Generous for a real user, useless for a storage-filling script |

**One operational consequence you must know about:** the AI limits **fail closed**. If
`REDIS_URL` is unset or Redis is unreachable, every AI endpoint returns 429 and the deck
stops working. That is deliberate — an outage must not become an open bar on the Bedrock
account — but it makes Redis a hard dependency for AI features. If you would rather the
deck degrade than stop, change `AI_PER_MINUTE.onBackendFailure` to `"open"` and accept the
cost exposure during an outage. **I recommend leaving it closed** while billing is dark,
and revisiting once real quotas are enforced.
