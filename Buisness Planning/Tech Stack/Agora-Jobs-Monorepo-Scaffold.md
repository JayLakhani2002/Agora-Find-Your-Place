# Agora Jobs — Monorepo Scaffold Guide

**Last updated:** 2026-06-08

A step-by-step guide to bootstrapping the Turborepo + pnpm monorepo for the recommended stack. Copy-pasteable.

---

## 0. Prerequisites

```bash
node -v   # v22 LTS
corepack enable
pnpm -v   # 9+
```

---

## 1. Create the monorepo

```bash
pnpm dlx create-turbo@latest agora-jobs
cd agora-jobs
```

Target layout:

```
agora-jobs/
├─ apps/
│  ├─ web/            # Next.js 15
│  ├─ mobile/         # Expo (React Native)
│  ├─ extension/      # WXT
│  └─ workers/        # BullMQ workers
├─ packages/
│  ├─ ui/             # shared components
│  ├─ api/            # tRPC routers + Zod
│  ├─ db/             # Drizzle schema + migrations
│  ├─ ai/             # Claude clients, prompts, agents
│  ├─ core/           # shared types & business logic
│  └─ config/         # tsconfig / biome / tailwind presets
├─ pnpm-workspace.yaml
└─ turbo.json
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## 2. Web app (Next.js 15)

```bash
cd apps && pnpm dlx create-next-app@latest web \
  --ts --app --tailwind --eslint --src-dir --import-alias "@/*"
```

- Pin Vercel function region to EU in `vercel.json`:

```json
{ "regions": ["fra1"] }
```

---

## 3. Database package (Drizzle + Neon EU)

```bash
cd packages && mkdir db && cd db && pnpm init
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

`packages/db/src/schema.ts` (starter):

```ts
import { pgTable, uuid, text, timestamp, jsonb, vector } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  source: text("source").notNull(),
  raw: jsonb("raw"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  jobId: uuid("job_id").references(() => jobs.id).notNull(),
  status: text("status").notNull().default("draft"), // draft|approved|submitted
  coverLetter: text("cover_letter"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

`drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! }, // Neon EU connection string
});
```

> Enable pgvector once: `CREATE EXTENSION IF NOT EXISTS vector;`

---

## 4. API package (tRPC + Zod)

```bash
cd packages && mkdir api && cd api && pnpm init
pnpm add @trpc/server zod superjson
```

`packages/api/src/router.ts` (starter):

```ts
import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  jobs: router({
    list: publicProcedure
      .input(z.object({ query: z.string().optional() }))
      .query(async ({ input }) => {
        // TODO: query Postgres FTS + pgvector
        return [];
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

---

## 5. AI package (Claude via Bedrock EU)

```bash
cd packages && mkdir ai && cd ai && pnpm init
pnpm add @anthropic-ai/sdk @anthropic-ai/bedrock-sdk ai
```

`packages/ai/src/client.ts`:

```ts
import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";

// Inference stays in-EU via Bedrock eu-central-1
export const claude = new AnthropicBedrock({
  awsRegion: "eu-central-1",
});

export const MODELS = {
  quality: "anthropic.claude-opus-4-8-v1:0", // final CV/cover letters
  volume:  "anthropic.claude-haiku-4-5-v1:0", // parsing/classification
} as const;
```

`packages/ai/src/redact.ts` (PII guard — run BEFORE any LLM call):

```ts
// Strip passport/visa/ID numbers before they ever reach the model.
export function redactPII(text: string): string {
  return text
    .replace(/\b[A-Z0-9]{8,9}\b/g, "[REDACTED_ID]")        // passport-like
    .replace(/\b\d{2}[ ]?\d{6}[ ]?[A-Z]\b/g, "[REDACTED]"); // example pattern
  // Extend with your own validated patterns + allowlist.
}
```

---

## 6. Workers app (BullMQ, EU container)

```bash
cd apps && mkdir workers && cd workers && pnpm init
pnpm add bullmq ioredis playwright
pnpm add @agora/ai @agora/db   # workspace deps
```

`apps/workers/src/index.ts` (starter):

```ts
import { Worker } from "bullmq";

const connection = { url: process.env.REDIS_URL! }; // Upstash EU

new Worker("generate", async (job) => {
  // 1. assemble context  2. redactPII  3. claude (Opus)  4. save draft
}, { connection });

new Worker("apply", async (job) => {
  // Playwright submit + append audit log (only if status === "approved")
}, { connection });
```

Deploy this as a **long-running container** (Railway/Render/Fly, EU) — never a serverless function.

---

## 7. Mobile app (Expo)

```bash
cd apps && pnpm dlx create-expo-app@latest mobile -t
cd mobile && pnpm add nativewind && pnpm add -D tailwindcss
# Wire @agora/api (tRPC client) + @agora/core for shared logic
```

---

## 8. Browser extension (WXT)

```bash
cd apps && pnpm dlx wxt@latest init extension
cd extension && pnpm add react react-dom
# Reuse @agora/ui + @agora/api; target Chrome/Edge/Firefox (MV3)
```

---

## 9. Shared tooling

```bash
# Biome (fast lint+format) at repo root
pnpm add -D -w @biomejs/biome
pnpm biome init

# Vitest for unit tests
pnpm add -D -w vitest
```

`turbo.json` pipeline (starter):

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "test": {},
    "typecheck": {}
  }
}
```

---

## 10. Environment variables (`.env`)

```bash
DATABASE_URL=            # Neon EU pooled connection
REDIS_URL=               # Upstash EU
AWS_REGION=eu-central-1  # Bedrock
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
CLERK_SECRET_KEY=
SCALEWAY_ACCESS_KEY=     # object storage (CVs)
SCALEWAY_SECRET_KEY=
RESEND_API_KEY=
SENTRY_DSN=
POSTHOG_KEY=
STRIPE_SECRET_KEY=
```

Manage these with **Doppler** across environments; never bundle secrets into mobile/extension clients.

---

## 11. First-run checklist

- [ ] `pnpm install` at root resolves all workspaces
- [ ] Neon EU project created, pgvector extension enabled, `drizzle-kit push` runs
- [ ] Bedrock model access approved in `eu-central-1` (Opus + Haiku)
- [ ] Clerk app created with EU data region
- [ ] Web app deploys to Vercel pinned to `fra1`
- [ ] Worker container deploys to Railway/Render EU and connects to Upstash
- [ ] `redactPII` unit-tested before any real LLM call
- [ ] CI: GitHub Actions running `lint`, `typecheck`, `test` via Turbo

---

*Model IDs above are illustrative — confirm the exact Bedrock model identifiers available in `eu-central-1` at setup time.*
