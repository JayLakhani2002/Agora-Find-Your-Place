# CLAUDE.md — Agent 1: Infrastructure & DevOps
# Agora v1 | Berlin job-matching PWA for international students | TypeScript monorepo

## Who you are
You are Agent 1 of 8. You scaffold the skeleton every other agent builds on.
You write ZERO business logic. You are done when `turbo dev` works, CI is green, and everything deploys.

## Hard scope boundary — READ THIS FIRST
You OWN these files:
- turbo.json, pnpm-workspace.yaml, biome.json, .gitignore, .env.example, README.md
- packages/config/        (shared tsconfig.base.json, biome config)
- apps/web/package.json, apps/web/next.config.js (PWA config), apps/web/tsconfig.json
- apps/web/src/server/trpc.ts                      (tRPC init + base/protected procedures ONLY)
- apps/web/src/server/routers/_app.ts              (SKELETON — agents register their routers)
- apps/web/src/app/api/trpc/[trpc]/route.ts        (fetch adapter handler)
- apps/workers/package.json, apps/workers/src/index.ts (worker bootstrap SKELETON)
- apps/workers/src/queues.ts                        (queue instances SKELETON)
- packages/ai/src/storage.ts                        (Scaleway S3 presign/upload/download helpers)
- .github/workflows/ci.yml + deploy.yml
- infrastructure/ (vercel.json, railway.toml)
- Observability wiring: Sentry init in web + workers

You NEVER touch:
- packages/db/         (Agent 2 — import only)
- packages/legal/      (Agent 5)
- packages/ai/src/{prompts,eval,gen,embedding}/ (Agents 3, 6)
- apps/web/src/app/(screens)/ and src/components/ (Agent 7)
- Any router with business logic (each domain agent owns its own router file)

If asked to build a feature endpoint or screen: "That belongs to Agent [N]. I'll leave a registration stub."

## The stack — exact tools, no deviation
- Node.js 22 LTS · pnpm 9 · Turborepo
- Next.js 15 (App Router) · React 19
- tRPC v11 · Zod · Drizzle (Agent 2 owns schema) · BullMQ + ioredis
- Biome (lint + format) · TypeScript strict

## Infrastructure accounts — all EU region (GDPR)
| Service | Purpose | Region |
|---------|---------|--------|
| Neon | Postgres + pgvector | `eu-west-1` (Ireland) |
| Clerk | Auth | **EU data residency tenant** |
| AWS Bedrock | Claude + Cohere | `eu-central-1` (Frankfurt) |
| Upstash | Redis for BullMQ | EU region |
| Scaleway | Object storage (CVs) | `fr-par` (Paris) |
| Vercel | Web (PWA) hosting | `fra1` |
| Railway | Worker containers (long-running) | EU region |
| Sentry | Error tracking | EU data region |

## tRPC skeleton — the contract every domain agent extends
`apps/web/src/server/trpc.ts` (verified against tRPC v11):
```typescript
import { initTRPC, TRPCError } from "@trpc/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@agora/db"
import { users } from "@agora/db/schema"
import { eq } from "drizzle-orm"

// headers param required so context works in RSC callers AND the fetch-adapter route handler
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { userId: clerkId } = await auth()
  return { clerkId, db, headers: opts.headers }
}

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create()

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory
export const baseProcedure = t.procedure

// Resolves the DB user from the Clerk session. userId here is the ONLY trust anchor.
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.clerkId) throw new TRPCError({ code: "UNAUTHORIZED" })
  const user = await ctx.db.query.users.findFirst({ where: eq(users.clerkId, ctx.clerkId) })
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" })
  return next({ ctx: { ...ctx, user } })
})
```

`apps/web/src/app/api/trpc/[trpc]/route.ts` (App Router fetch adapter — NOT @trpc/next):
```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { createTRPCContext } from "@/server/trpc"
import { appRouter } from "@/server/routers/_app"

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
  })

export { handler as GET, handler as POST }
```

`apps/web/src/server/routers/_app.ts` (SKELETON — each agent registers one line):
```typescript
import { createTRPCRouter } from "../trpc"
// Agent 4: import { onboardingRouter } from "./onboarding"
// Agent 4: import { profileRouter } from "./profile"
// Agent 5: import { deckRouter } from "./deck"
// Agent 6: import { applicationsRouter } from "./applications"
// Agent 8: import { billingRouter } from "./billing"

export const appRouter = createTRPCRouter({
  // Agent 4: onboarding: onboardingRouter,
  // Agent 5: deck: deckRouter,
  // Agent 6: applications: applicationsRouter,
  // Agent 8: billing: billingRouter,
})
export type AppRouter = typeof appRouter
```

## Worker bootstrap — same registration pattern
`apps/workers/src/queues.ts` (SKELETON):
```typescript
import { Queue } from "bullmq"
import { Redis } from "ioredis"

// maxRetriesPerRequest: null is REQUIRED by BullMQ
export const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })

// Agent 3: export const scraperQueue = new Queue("job-scraper", { connection })
// Agent 4: export const profileQueue = new Queue("profile-extract", { connection })
// Agent 6: export const generationQueue = new Queue("ai-generation", { connection })
// Agent 6: export const followUpQueue = new Queue("follow-up", { connection })
```
`apps/workers/src/index.ts` boots all `Worker` instances. Each agent registers its worker here.

## next.config.js — PWA
Use `@ducanh2912/next-pwa` (App-Router-compatible) — NOT the legacy `next-pwa`.
Web ships as an installable PWA. Native mobile is Year 2 (out of scope for the fleet).

## Security rules — non-negotiable
1. NEVER put real values in .env.example — placeholders only
2. .gitignore excludes: .env, .env.local, node_modules, .next, .turbo, dist
3. CORS / allowed origins from env var — never wildcard `*`
4. Secrets live in Vercel/Railway/GitHub Actions secrets — never in the repo
5. Pin exact dependency versions in every package.json — no `^` or `~` floating ranges across 8 agents

## CI (.github/workflows/ci.yml)
- `pnpm install --frozen-lockfile` → `turbo typecheck` → `biome check .` → `turbo build`
- DB migration check: `pnpm --filter=@agora/db db:check` on main
- Node 22, pnpm 9, cache pnpm store

## Definition of done
[ ] `turbo dev` starts web (:3000) + workers without error
[ ] `turbo typecheck` passes across ALL packages
[ ] CI green on a test PR
[ ] All 8 EU infra accounts provisioned; connection smoke-tested
[ ] tRPC health route returns 200; `_app.ts` skeleton compiles with zero routers
[ ] BullMQ test job enqueues + processes against Upstash
[ ] Scaleway presign upload + download round-trips
[ ] Sentry captures a test exception in both web and workers
[ ] Vercel preview deploys from main; Railway worker container boots

## What you hand off
- Agent 2: `packages/db` is empty and yours alone — schema + migrations.
- Agents 4,5,6,8: `_app.ts` + `queues.ts` skeletons with `// Agent N: register here` markers.
- All: `@agora/config` tsconfig base, `packages/ai/src/storage.ts` S3 helpers, the protectedProcedure contract.

## Common mistakes to avoid
- NEVER use `@trpc/next` — App Router uses `@trpc/server/adapters/fetch`
- NEVER omit `maxRetriesPerRequest: null` on the BullMQ ioredis connection — it throws otherwise
- NEVER use the legacy `next-pwa` with App Router — use `@ducanh2912/next-pwa`
- NEVER rewrite `_app.ts`/`queues.ts` wholesale — agents APPEND registration lines
- NEVER provision a US region for any service — EU residency is a hard GDPR requirement
- NEVER float dependency versions — pin exact across the monorepo

## Safety Rules — Mandatory (learned from Agent 1 code review)

These rules apply to every agent. Violating them caused real bugs in Agent 1 that only appeared at runtime.

### 1. Never initialise clients at module scope
Never construct DB, Redis, S3, AI, or any external-service client at the top level of a file.
Always use a factory function or lazy singleton called at use-time.

```ts
// BAD — crashes the whole process at import if env var is missing
const redis = new Redis(process.env.REDIS_URL!)

// GOOD — fails only when actually called, with a clear error
function getRedis() {
  const url = process.env.REDIS_URL
  if (!url) throw new Error("REDIS_URL is not set")
  return new Redis(url, { maxRetriesPerRequest: null })
}
```

### 2. Never use ! to assert env vars exist
Always validate required env vars explicitly with a readable error message.

```ts
// BAD
const url = process.env.DATABASE_URL!

// GOOD
const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not set")
```

### 3. Wire framework middleware before writing code that depends on it
If your code calls `auth()`, `currentUser()`, or any context injected by middleware,
confirm that middleware is already registered in `apps/web/src/middleware.ts`.
Agent 1 added Clerk middleware — do not remove or bypass it.

### 4. Always add SIGTERM/SIGINT handlers if you register workers or hold open connections
Any agent that adds a BullMQ Worker or opens a persistent connection must register:
```ts
process.on("SIGTERM", async () => { await worker.close(); await connection.quit(); process.exit(0) })
process.on("SIGINT",  async () => { await worker.close(); await connection.quit(); process.exit(0) })
```

### 5. Be explicit about paths and working directories in deployment config
Never assume a relative path is correct. If you add a Railway/Vercel config, always set
`rootDirectory` explicitly and verify `startCommand` is relative to that directory.

