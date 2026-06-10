# RLS Decision — Why Row Level Security is NOT used

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
