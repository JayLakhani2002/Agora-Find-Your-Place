# Agora Jobs — Phase 0: Foundation & Infrastructure
**Document:** PROTO-002 · **Version:** 1.0  
**Duration:** Week 1–2  
**Output:** Working repo, CI pipeline, EU infrastructure accounts provisioned

---

## 1. Goals

Phase 0 produces no user-visible features. It produces the infrastructure and tooling that all other phases depend on. Rushing it causes compounding pain later.

**Exit criteria:**
- Monorepo runs locally (see `01-Tech-Setup.md`)
- GitHub Actions CI runs on every push
- All EU infrastructure accounts provisioned and tested
- Secrets stored in GitHub Actions secrets (not `.env` files in repo)
- Database schema can be applied with one command

---

## 2. Infrastructure Accounts to Create

### 2.1 Neon (Postgres, EU region)

1. Sign up at [neon.tech](https://neon.tech)
2. Create project: `agora-jobs-prod`
3. **Region:** `eu-west-1` (Ireland) — closest EU region with pgvector support
4. Note the connection strings (pooled + unpooled)
5. Enable **pgvector** extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for text search
```

6. Set `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in `.env.local`

### 2.2 Clerk (Auth, EU data residency)

1. Sign up at [clerk.com](https://clerk.com)
2. Create application: `Agora Jobs`
3. **Critical:** In Clerk dashboard → Settings → Data residency → select **Europe**
4. Enable sign-in methods: Email + Google OAuth
5. Set the publishable key and secret key in `.env.local`
6. Configure redirect URLs:
   - Sign-in: `/sign-in`
   - Sign-up: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/onboarding`

### 2.3 AWS Bedrock (Claude, Frankfurt)

1. Log in to AWS console
2. Switch region to **eu-central-1 (Frankfurt)**
3. Navigate to: Bedrock → Model access → Request access
4. Enable: `Claude Sonnet 4.x` and `Claude Haiku 4.5`
5. Create IAM user `agora-bedrock-worker` with policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream"
    ],
    "Resource": [
      "arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-sonnet-4-6*",
      "arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-haiku-4-5*"
    ]
  }]
}
```

6. Generate access key → set in `.env.local`

### 2.4 Upstash Redis (EU region)

1. Sign up at [upstash.com](https://upstash.com)
2. Create database: `agora-jobs-queue`
3. **Region:** `eu-west-1` (Ireland)
4. Enable **Eviction: noeviction** (queue data must never be evicted)
5. Copy REST URL + token → set in `.env.local`

### 2.5 Scaleway Object Storage (Paris)

1. Sign up at [scaleway.com](https://scaleway.com)
2. Create bucket: `agora-jobs-docs`
3. **Region:** `fr-par` (Paris)
4. Set CORS policy to allow uploads from your app domain:

```json
[{
  "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3000
}]
```

5. Generate API key → set S3 vars in `.env.local`

### 2.6 Vercel (Deployment)

1. Import the GitHub repo to [vercel.com](https://vercel.com)
2. Set root directory: `apps/web`
3. Add all environment variables from `.env.local`
4. Set `NEXT_PUBLIC_APP_URL` to the Vercel preview URL initially
5. The prototype deploys automatically on push to `main`

---

## 3. GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
  AWS_BEDROCK_REGION: eu-central-1

jobs:
  ci:
    name: Typecheck + Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm turbo typecheck

      - name: Lint
        run: pnpm biome check .

      - name: Build packages
        run: pnpm turbo build --filter=!web --filter=!workers

  db-check:
    name: DB Schema Check
    runs-on: ubuntu-latest
    needs: ci
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - name: Check migrations are up to date
        run: pnpm --filter=db db:check
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## 4. Database Schema — Initial Migration

Create `packages/db/src/schema.ts` (full schema for the prototype):

```typescript
import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  boolean,
  json,
  varchar,
  pgEnum,
  vector,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// ── Enums ─────────────────────────────────────────────────────────────

export const visaTypeEnum = pgEnum("visa_type", [
  "student_visa_16b",    // §16b - most common
  "eu_citizen",
  "chancenkarte_20a",    // §20a job-search visa
  "blue_card",
  "near_graduation",
])

export const applicationStatusEnum = pgEnum("application_status", [
  "generated",    // AI done, awaiting review
  "approved",     // user approved the materials
  "submitted",    // user submitted (Mode 1 - user action)
  "rejected",
  "interview_invited",
  "offer_received",
  "withdrawn",
])

export const contractTypeEnum = pgEnum("contract_type", [
  "werkstudent",
  "minijob",
  "vollzeit",
  "teilzeit",
  "praktikum",
  "freelance",
])

export const generationStatusEnum = pgEnum("generation_status", [
  "pending",
  "processing",
  "complete",
  "failed",
])

// ── Users & Profiles ──────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Legal constraints
  visaType: visaTypeEnum("visa_type").notNull(),
  weeklyHoursLimit: integer("weekly_hours_limit").notNull().default(20),
  daysRemainingThisYear: integer("days_remaining_this_year"),
  semesterEnd: timestamp("semester_end", { withTimezone: true }),
  enrollmentStatus: text("enrollment_status").default("enrolled"),

  // Professional profile
  germanLevel: text("german_level").default("B1"),
  locationPreference: text("location_preference").default("Berlin"),
  minHourlyRate: real("min_hourly_rate"),
  preferredFields: text("preferred_fields").array().default([]),
  availableFrom: timestamp("available_from", { withTimezone: true }),

  // CV data (structured, NOT raw PII)
  skills: text("skills").array().default([]),
  experienceSummary: text("experience_summary"),      // LLM-extracted summary only
  educationSummary: text("education_summary"),         // LLM-extracted summary only
  profileEmbedding: vector("profile_embedding", { dimensions: 1024 }), // for matching

  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("user_profiles_user_id_idx").on(t.userId),
  index("user_profiles_embedding_idx").using("hnsw", t.profileEmbedding.op("vector_cosine_ops")),
])

// CV files stored in Scaleway — only the storage key here, never raw content
export const userDocuments = pgTable("user_documents", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),   // Scaleway S3 object key
  fileType: text("file_type").notNull(),        // "cv_upload", "generated_cv", "generated_cl"
  filename: text("filename").notNull(),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// ── Jobs ──────────────────────────────────────────────────────────────

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  externalId: text("external_id").notNull(),
  source: text("source").notNull(),              // "stellenticket", "berlinstartupjobs", etc.
  sourceUrl: text("source_url").notNull(),

  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  contractType: contractTypeEnum("contract_type").notNull(),
  hourlyRate: real("hourly_rate"),
  hoursPerWeek: integer("hours_per_week"),
  germanLevelRequired: text("german_level_required"),
  requiredSkills: text("required_skills").array().default([]),

  // Legal filter fields (pre-computed at scrape time)
  requiresEnrollment: boolean("requires_enrollment").default(true),
  allowedVisaTypes: text("allowed_visa_types").array().$type<string[]>(),

  description: text("description").notNull(),
  jobEmbedding: vector("job_embedding", { dimensions: 1024 }),

  scrapedAt: timestamp("scraped_at", { withTimezone: true }).defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
}, (t) => [
  uniqueIndex("jobs_external_id_source_idx").on(t.externalId, t.source),
  index("jobs_contract_type_idx").on(t.contractType),
  index("jobs_is_active_idx").on(t.isActive),
  index("jobs_embedding_idx").using("hnsw", t.jobEmbedding.op("vector_cosine_ops")),
])

// ── Swipe Deck & Actions ──────────────────────────────────────────────

export const userJobActions = pgTable("user_job_actions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  action: text("action").notNull(),    // "right", "left", "save"
  matchScore: real("match_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("user_job_actions_user_job_idx").on(t.userId, t.jobId),
])

// ── Applications ──────────────────────────────────────────────────────

export const applications = pgTable("applications", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id),

  status: applicationStatusEnum("status").default("generated").notNull(),
  generationStatus: generationStatusEnum("generation_status").default("pending").notNull(),

  // Generated document storage keys (Scaleway S3)
  cvStorageKey: text("cv_storage_key"),
  coverLetterStorageKey: text("cover_letter_storage_key"),

  // Quality eval scores
  evalScoreAts: real("eval_score_ats"),
  evalScoreKeywords: real("eval_score_keywords"),
  evalScoreFactual: real("eval_score_factual"),
  evalScoreFormat: real("eval_score_format"),
  evalScoreTone: real("eval_score_tone"),
  evalScoreLanguage: real("eval_score_language"),
  evalScoreOverall: real("eval_score_overall"),

  // Audit trail — append-only JSON log
  auditLog: json("audit_log").$type<AuditEntry[]>().default([]),

  userApprovedAt: timestamp("user_approved_at", { withTimezone: true }),
  userSubmittedAt: timestamp("user_submitted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("applications_user_id_idx").on(t.userId),
  index("applications_status_idx").on(t.status),
])

export type AuditEntry = {
  timestamp: string
  action: string
  actor: "user" | "system"
  detail?: string
}

// ── Follow-up Drafts ──────────────────────────────────────────────────

export const followUpDrafts = pgTable("follow_up_drafts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  draftText: text("draft_text").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
})
```

### 4.1 Drizzle Config

`packages/db/drizzle.config.ts`:

```typescript
import type { Config } from "drizzle-kit"

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

`packages/db/package.json` scripts:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:check": "drizzle-kit check"
  }
}
```

### 4.2 Apply Initial Migration

```bash
cd packages/db
pnpm db:generate    # generates SQL migration file
pnpm db:migrate     # applies to Neon
pnpm db:studio      # opens visual DB editor at localhost:4983
```

---

## 5. tRPC Router Setup

`apps/web/src/server/trpc.ts`:

> Uses `Awaited<ReturnType<...>>` for the context generic (required by tRPC v11) and
> accepts `{ headers: Headers }` so the same factory works for both RSC server callers
> and API route handlers. Exports `createTRPCRouter` / `baseProcedure` per current convention.

```typescript
import { initTRPC, TRPCError } from "@trpc/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@agora/db"
import { users } from "@agora/db/schema"
import { eq } from "drizzle-orm"

// Accepts headers so it works in both RSC callers and the fetch-adapter route handler
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { userId: clerkId } = await auth()
  return { clerkId, db, headers: opts.headers }
}

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create()

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory
export const baseProcedure = t.procedure

// Requires Clerk session — resolves DB user from clerkId
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.clerkId) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.clerkId, ctx.clerkId),
  })
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" })
  }
  return next({ ctx: { ...ctx, user } })
})
```

`apps/web/src/app/api/trpc/[trpc]/route.ts`:

> App Router requires the fetch adapter — NOT the old `@trpc/next` pages adapter.

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

---

## 6. Definition of Done (Phase 0)

- [ ] Monorepo starts with `turbo dev` (web on :3000, workers process starting)
- [ ] CI passes on a test PR
- [ ] Neon DB provisioned in EU; migration applied; `pgvector` extension enabled
- [ ] Clerk app in EU mode; sign-in/sign-up pages resolve
- [ ] AWS Bedrock Claude Sonnet + Haiku accessible from `eu-central-1`
- [ ] Upstash Redis reachable; BullMQ test job enqueues and processes
- [ ] Scaleway bucket exists; test file upload + download works
- [ ] Drizzle schema applied; Drizzle Studio shows all tables
- [ ] `tRPC` health check endpoint returns 200
- [ ] Vercel preview deployment live from `main` branch
