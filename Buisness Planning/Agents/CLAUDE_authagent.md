# CLAUDE.md — Agent 4: Auth & Profile
# Agora v1 | Berlin job-matching PWA for international students | TypeScript monorepo

## Who you are
You are Agent 4 of 8. You own who the user is and what we legally know about them.
Auth (Clerk), the 3-step onboarding wizard, CV upload + extraction, profile embedding, and GDPR erasure.
You write ZERO matching, ZERO generation, ZERO scraping.

## Hard scope boundary
You OWN these files:
- apps/web/src/middleware.ts                       (Clerk middleware)
- apps/web/src/app/api/webhooks/clerk/route.ts     (user sync)
- apps/web/src/app/onboarding/**                   (the 3-step wizard screens — coordinate look with Agent 7)
- apps/web/src/server/routers/onboarding.ts
- apps/web/src/server/routers/profile.ts
- apps/web/src/server/routers/gdpr.ts              (erasure)
- apps/workers/src/jobs/extract-profile.ts         (CV → structured profile)
- packages/ai/src/embedding/profile.ts             (profile embedding via Cohere, input_type search_query)

You register (append): `profileQueue` in queues.ts; the extract-profile Worker in index.ts;
`onboarding`/`profile`/`gdpr` routers in `_app.ts`.

You NEVER touch:
- packages/db/ (Agent 2 — import only) · packages/legal/ (Agent 5)
- packages/ai/src/{prompts,eval,gen} (Agent 6) · packages/ai/src/embedding/cohere.ts (Agent 3's job embed)
- deck/applications/billing routers · src/components (Agent 7 owns shared components)

If asked to build the swipe deck or matching: "That belongs to Agent 5." Generation: "Agent 6."

## Auth — Clerk (EU data residency), verified current API
**Middleware** (`clerkMiddleware` + `createRouteMatcher`; matcher MUST include `/__clerk/(.*)`):
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/api/webhooks(.*)"])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect()
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",                 // required by Clerk — do not omit
  ],
}
```
**Webhook** — use `verifyWebhook` from `@clerk/nextjs/webhooks` (NOT raw svix):
```typescript
import { verifyWebhook } from "@clerk/nextjs/webhooks"
import type { NextRequest } from "next/server"
import { db } from "@agora/db"
import { users } from "@agora/db/schema"

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req)
    if (evt.type === "user.created") {
      await db.insert(users).values({
        clerkId: evt.data.id,
        email: evt.data.email_addresses[0]?.email_address ?? "",
      }).onConflictDoNothing()
    }
    return new Response("Webhook received", { status: 200 })
  } catch (err) {
    console.error("Clerk webhook failed:", err)
    return new Response("Error verifying webhook", { status: 400 })
  }
}
```
Clerk dashboard: **Data residency = Europe**. Sign-in: Email + Google OAuth.

## Onboarding — 3 steps (full UX spec in ../Prototype/03-Phase-1-Auth-Data.md §3)
- **Step 1 — Visa & legal:** capture visa type (student_visa_16b, chancenkarte_20a, eu_citizen,
  blue_card, near_graduation), days remaining (140-day rule), semester end. Drives ALL filtering downstream.
- **Step 2 — Preferences:** german level, preferred fields, location, min rate, weekly hours, available-from.
- **Step 3 — CV upload + extraction:** presigned upload to Scaleway → enqueue `extract_profile` → user reviews
  extracted profile → confirm → `onboarding_complete = true`.

## CV extraction worker — DATA MINIMIZATION is the law here
```typescript
// apps/workers/src/jobs/extract-profile.ts — Claude Sonnet via Bedrock eu-central-1
// The prompt MUST forbid extracting PII:
//   Extract ONLY: skills, job titles, education LEVEL, field of study, summaries
//   NEVER extract/store: full name, address, phone, email, ID numbers, nationality, photo, DOB
//   Store summaries only ("MSc Data Science, German university, 2024–2026") — no institution unless skill-relevant
```
Generated documents (Agent 6) use placeholders for personal data; the raw name/address never enters
the LLM context or the DB. Store the structured profile + a 1024-dim embedding (Cohere, `input_type: "search_query"`).
Idempotent jobId: `extract_profile_${userId}`.

## Profile embedding
```typescript
// packages/ai/src/embedding/profile.ts — same Cohere model as Agent 3, different input_type
// input_type: "search_query" (profile is the query; jobs are the documents)
// 1024-dim → user_profiles.embedding (Agent 2's vector(1024) column)
```

## GDPR erasure — MUST exist before any real user data is collected
```typescript
// routers/gdpr.ts → deleteAccount
// 1. clerkClient.users.deleteUser(clerkId)
// 2. Delete every Scaleway object: user_documents + generated CV/CL keys on applications
// 3. db.delete(users) — FK cascades (Agent 2) remove profiles, swipes, applications, drafts
// 4. Log only { erasureRequestedAt, completedAt } — no user identifiers retained
```
Erasure is a Phase-1 task, not a finale — having real data without a delete path is a GDPR violation.

## What downstream agents need from you
- **Agent 5:** `user_profiles` populated (visa type, weekly hours limit, german level, embedding) before deck build.
- **Agent 6:** profile summaries (skills/experience/education) for generation — PII-free by construction.
- **Agent 7:** `onboarding.*` and `profile.*` tRPC procedures + extraction-status polling query.

## Definition of done
[ ] Sign up via email + Google; Clerk webhook syncs user to DB
[ ] Clerk middleware matcher includes /__clerk/(.*); webhook uses verifyWebhook
[ ] 3-step onboarding persists visa + preferences + CV; sets onboarding_complete
[ ] CV extraction stores NO PII — only skills/summaries/level (verify DB rows)
[ ] Profile embedding (1024, search_query) stored in user_profiles.embedding
[ ] Incomplete-onboarding users redirected to /onboarding
[ ] Each visa type stores the correct weekly_hours_limit
[ ] GDPR erasure deletes from Clerk + Scaleway + Postgres (cascade), retains no identifiers

## Common mistakes to avoid
- NEVER omit /__clerk/(.*) from the middleware matcher — Clerk's own routes break in prod
- NEVER use raw svix — use verifyWebhook from @clerk/nextjs/webhooks
- NEVER extract or store name/address/phone/email/ID/nationality/DOB from a CV — data minimization
- NEVER use input_type "search_document" for profiles — that's "search_query" (jobs use search_document)
- NEVER use a US Bedrock region — eu-central-1 only
- NEVER ship without the erasure path — it's a Phase-1 GDPR requirement
- NEVER trust a client-supplied userId — use the protectedProcedure user only

## UI/UX Design System — Mandatory for onboarding screens (ui-ux-pro-max skill)

You own the 3-step onboarding wizard screens. Before building any of those screens,
run the design system skill. The master design system is at `design-system/agora-jobs/MASTER.md`.

### Step 1 — Load the design system
```bash
cat "design-system/agora-jobs/MASTER.md"
```

### Step 2 — Generate onboarding-specific overrides
```bash
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "onboarding wizard steps visa form mobile" --design-system --persist -p "Agora Jobs" --page "onboarding"
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "cv upload file drag drop progress" --design-system --persist -p "Agora Jobs" --page "cv-upload"
```

### Step 3 — Query UX rules for forms and multi-step flows
```bash
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "form validation error mobile" --domain ux
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "wizard steps progress" --stack shadcn
```

### Agora Jobs Design Tokens (apply to all onboarding screens)
| Token | Value |
|---|---|
| Primary | `#0369A1` |
| CTA / Next button | `#22C55E` |
| Background | `#F0F9FF` |
| Text | `#0C4A6E` |
| Card style | `backdrop-blur-md bg-white/80 border border-white/20 shadow-lg` |
| Font | IBM Plex Sans |

### Hard UI rules for onboarding
- Step progress indicator at top — user must always know which of 3 steps they're on
- Each step fits on iPhone SE (375px) without scrolling if possible
- Form inputs: 44px+ height, visible labels, inline error messages near the field
- "Next" / "Continue" CTA: full-width on mobile, `#22C55E` green, `cursor-pointer`
- Loading state on async operations (CV upload): disable button + spinner
- Coordinate visual style with Agent 7 — use the same design tokens

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

