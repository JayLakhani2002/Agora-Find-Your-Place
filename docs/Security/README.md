# docs/Security

Security documentation for Agora Jobs. Start here.

| Document | What it is | Read it when |
|----------|------------|--------------|
| [`SECURITY-REPORT.md`](./SECURITY-REPORT.md) | The 2026-08-06 assessment: every finding, severity-ranked, what was fixed and what is open | You want the current state of security |
| [`INPUTS-NEEDED-FROM-JAY.md`](./INPUTS-NEEDED-FROM-JAY.md) | The decisions only Jay can make, each with a recommendation | You are Jay, or you are waiting on one of them |
| [`THREAT-MODEL.md`](./THREAT-MODEL.md) | Assets, adversaries, trust boundaries, STRIDE, standing design rules | You are designing something new, or onboarding |
| [`findings/`](./findings/) | Raw per-domain red-team reports with full code citations | You want the evidence behind a finding |

## The findings directory

| File | Domain |
|------|--------|
| `01-auth-api-pentest.md` | Authentication, authorization, session, HTTP API |
| `02-secrets-supplychain.md` | Secrets, git history, CI/CD, dependencies |
| `03-database-data-layer.md` | Postgres, object storage, GDPR as a security property |
| `04-ai-workers-pipeline.md` | LLM pipeline, prompt injection, scraping workers |
| `05-frontend-edge.md` | Headers, CSP, XSS, PWA service worker, browser security |

Findings reports are point-in-time and may cite code that has since been fixed —
`SECURITY-REPORT.md` is the reconciled view and supersedes them where they disagree. One
known example: finding 05 states CVE-2025-29927 applies to `next@15.2.4`; it does not (that
was fixed in 15.2.3). The Next.js upgrade was warranted for other, worse advisories.

## The ten standing rules

From `THREAT-MODEL.md` §6. These are not suggestions:

1. Never store card data. Stripe only.
2. Never store a password. Clerk only.
3. Every new tRPC procedure is `protectedProcedure` (or `aiProcedure`) unless a written exception exists.
4. Every query touching a user-linked table is scoped by `ctx.user.id`.
5. Never interpolate a client-supplied filename or key into a storage path.
6. Never place untrusted text in a system prompt — use `fenceUntrusted()`.
7. Model output is never an action.
8. Every new external egress destination is allow-listed.
9. Every credential is least-privilege with a documented rotation procedure.
10. Auto-apply does not ship until anti-injection, audit logging, and the German legal review are all complete.

## Re-running the assessment

```sh
pnpm audit                 # dependency advisories
pnpm typecheck && pnpm build
pnpm --filter @agora/web test        # includes rate-limit regression tests
pnpm --filter @agora/ai test         # includes prompt-injection fence tests
```
