# RLS Decision — SUPERSEDED (2026-08-06)

> **This decision has been reversed.** RLS is being adopted, staged across migrations
> `0006_rls_roles_stage1.sql` and `0007_rls_tighten_stage2.sql`.
>
> **Read `docs/Security/RLS-ROLLOUT.md` instead of this file.**

## What changed

The reasoning below was correct about the constraint, and is preserved because it is still
why the rollout has the shape it does: `drizzle-orm/neon-http` is stateless, so
`SET app.current_user_id` and the query depending on it are separate round-trips and the
variable is lost.

Two things changed the conclusion:

1. **The risk was re-weighted.** The 2026-08-06 security review classified the data at risk
   — visa type, enrollment status, remaining permitted work days, raw CVs — as
   special-category-adjacent under GDPR. With app-layer scoping as the *only* tenant
   boundary, one forgotten `WHERE user_id` in one future procedure is a full cross-tenant
   breach of that data. Defence in depth was treated as optional here; for this dataset it
   is not.

2. **The same review found `neondb_owner` in use by the web app, the workers and migrations
   alike.** That is a separate and larger problem than RLS — a leaked application
   connection string can `DROP TABLE` — and fixing it needs the same role work. Once the
   roles exist, RLS is a small additional step rather than a project.

The driver constraint is resolved by `packages/db/src/rls.ts` — option 2 below (the
WebSocket driver), scoped to one transaction per unit of work.

---

## Original decision, preserved for context

## Decision: App-layer filtering only (no Postgres RLS)

## Reason: neon-http driver is stateless

The project uses `drizzle-orm/neon-http` with the `@neondatabase/serverless` HTTP client.
This driver sends every query as an **independent stateless HTTP POST** to Neon's serverless proxy.
There is no persistent Postgres session between queries.

RLS policies based on `current_setting('app.current_user_id')` require a session-local variable
to be SET before each query. With the HTTP driver, the SET and SELECT are two separate HTTP
round-trips with no shared session state — the variable is lost before the query runs.

The only ways to make RLS work with neon-http are:
1. Use Neon's batch API to bundle SET + SELECT in one HTTP round-trip
2. Switch to the WebSocket driver (`neon-serverless` with `ws`) for persistent sessions

Both add significant complexity for prototype phase. The spec says:
> "App-layer scoping (Agent 1's protectedProcedure filtering by userId) is the PRIMARY control.
> RLS is defence-in-depth."

## Current security model

All user-scoped queries are filtered at the application layer:
- `protectedProcedure` in `trpc.ts` resolves the authenticated user from Clerk
- Every domain agent must scope queries to `ctx.user.id`
- Background workers (BullMQ) are internal-only, never exposed to the internet

## When to add RLS

Add RLS in production (post-MVP) if:
- Switching to the WebSocket/pooled driver (`@neondatabase/serverless` with neonConfig)
- Or using Neon's native auth (which handles session variables automatically)
- Or using Supabase's auth integration which is purpose-built for RLS

At that point, move this decision file to an ADR (architecture decision record).
