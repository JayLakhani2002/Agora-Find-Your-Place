# Agora Jobs — Phase 1: Auth, Onboarding & User Profile
**Document:** PROTO-003 · **Version:** 1.0  
**Duration:** Week 2–3  
**Depends on:** Phase 0 complete  
**Output:** User can sign up, complete onboarding, and have a legal profile stored

---

## 1. Goals

At the end of Phase 1, a real user can:
1. Sign up via email or Google
2. Complete the 3-step onboarding wizard (visa info → job prefs → CV upload)
3. Have their legal constraints stored and their profile embedding generated
4. See a "your profile is ready" confirmation

---

## 2. Clerk Auth Integration

### 2.1 Middleware

`apps/web/src/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API and tRPC routes
    "/(api|trpc)(.*)",
    // Required by Clerk for its own frontend API routes
    "/__clerk/(.*)",
  ],
}
```

### 2.2 Clerk Webhook (Sync Users to DB)

`apps/web/src/app/api/webhooks/clerk/route.ts`:

> Uses `verifyWebhook` from `@clerk/nextjs/webhooks` — the current Clerk API.
> No manual svix import needed; Clerk handles signature verification internally.

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
    console.error("Clerk webhook verification failed:", err)
    return new Response("Error verifying webhook", { status: 400 })
  }
}
```

---

## 3. Onboarding Flow (3 Steps)

### 3.1 Route Structure

```
apps/web/src/app/
├── (auth)/
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
├── onboarding/
│   ├── layout.tsx               # progress bar, step indicator
│   ├── page.tsx                 # redirect to step 1
│   ├── step-1/page.tsx          # Visa & Legal Info
│   ├── step-2/page.tsx          # Job Preferences
│   └── step-3/page.tsx          # CV Upload + Profile Review
└── dashboard/
    └── page.tsx                  # home after onboarding
```

### 3.2 Step 1 — Visa & Legal Info

**Screen:** Visa type selector + legal constraint inputs

```typescript
// apps/web/src/app/onboarding/step-1/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"

const VISA_OPTIONS = [
  {
    value: "student_visa_16b",
    label: "Student Visa (§16b)",
    description: "Enrolled at a German university — 20hr/week cap during semester",
  },
  {
    value: "chancenkarte_20a",
    label: "Chancenkarte (§20a)",
    description: "Job-search visa — 20hr/week while searching",
  },
  {
    value: "eu_citizen",
    label: "EU Citizen",
    description: "No work-hour restrictions",
  },
  {
    value: "blue_card",
    label: "EU Blue Card",
    description: "Skilled worker permit",
  },
  {
    value: "near_graduation",
    label: "Near Graduation (§16b →§18b)",
    description: "Graduating within 6 months — transitional restrictions may apply",
  },
] as const

export default function OnboardingStep1() {
  const router = useRouter()
  const [selectedVisa, setSelectedVisa] = useState<string>()
  const [daysRemaining, setDaysRemaining] = useState<number>(140)
  const [semesterEnd, setSemesterEnd] = useState<string>("")

  const saveStep1 = trpc.onboarding.saveStep1.useMutation({
    onSuccess: () => router.push("/onboarding/step-2"),
  })

  const showDaysInput = selectedVisa === "student_visa_16b"

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Your visa situation</h1>
      <p className="text-muted-foreground mb-6">
        This determines which jobs you&apos;re legally eligible for. We only show you jobs you can actually take.
      </p>

      <div className="space-y-3 mb-6">
        {VISA_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelectedVisa(opt.value)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
              selectedVisa === opt.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="font-medium">{opt.label}</div>
            <div className="text-sm text-muted-foreground">{opt.description}</div>
          </button>
        ))}
      </div>

      {showDaysInput && (
        <div className="space-y-4 mb-6 p-4 bg-muted rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1">
              Remaining days under 140-day rule this year
            </label>
            <input
              type="number"
              value={daysRemaining}
              onChange={(e) => setDaysRemaining(Number(e.target.value))}
              min={0}
              max={140}
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Check your Bundesagentur für Arbeit notification or calculate from your work history
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Current semester ends (approx.)
            </label>
            <input
              type="date"
              value={semesterEnd}
              onChange={(e) => setSemesterEnd(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      )}

      <button
        disabled={!selectedVisa || saveStep1.isPending}
        onClick={() =>
          saveStep1.mutate({
            visaType: selectedVisa as never,
            daysRemainingThisYear: daysRemaining,
            semesterEnd: semesterEnd || undefined,
          })
        }
        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium disabled:opacity-50"
      >
        {saveStep1.isPending ? "Saving..." : "Continue →"}
      </button>
    </div>
  )
}
```

### 3.3 Step 2 — Job Preferences

**Fields collected:**
- German level (A1 / A2 / B1 / B2 / C1 / C2 / Native / None)
- Preferred fields (multi-select: Tech, Data Science, Marketing, etc.)
- Location (Berlin districts — multi-select)
- Minimum hourly rate (€ slider)
- Available from (date picker)
- Hours per week preference (slider 5–20)

### 3.4 Step 3 — CV Upload & Profile Extraction

This is the most technically complex onboarding step.

```typescript
// apps/web/src/app/onboarding/step-3/page.tsx
// 1. User uploads their existing CV (PDF, max 5MB)
// 2. File is uploaded to Scaleway S3 via presigned URL
// 3. A BullMQ job is enqueued: extract_profile
// 4. Worker extracts structured profile using Claude
// 5. User sees extracted profile; can edit before confirming
```

**CV Upload Flow:**

```typescript
// Server action to get presigned upload URL
// apps/web/src/server/routers/onboarding.ts

saveStep3: protectedProcedure
  .input(z.object({ filename: z.string(), sizeBytes: z.number() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Generate presigned URL for Scaleway upload
    const storageKey = `cv-uploads/${ctx.user.id}/${Date.now()}-${input.filename}`
    const presignedUrl = await generatePresignedUploadUrl(storageKey)

    // 2. Record the document reference in DB
    await ctx.db.insert(userDocuments).values({
      userId: ctx.user.id,
      storageKey,
      fileType: "cv_upload",
      filename: input.filename,
      sizeBytes: input.sizeBytes,
    })

    // 3. Enqueue profile extraction job
    await profileExtractionQueue.add("extract_profile", {
      userId: ctx.user.id,
      storageKey,
    }, {
      jobId: `extract_profile_${ctx.user.id}`,  // idempotent
      removeOnComplete: true,
    })

    return { presignedUrl, storageKey }
  }),
```

**Worker — CV Profile Extraction:**

```typescript
// apps/workers/src/jobs/extract-profile.ts
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime"
import { downloadFromS3, uploadToS3 } from "@agora/ai/storage"
import { parsePdf } from "@agora/ai/pdf"
import { db } from "@agora/db"
import { userProfiles } from "@agora/db/schema"

const EXTRACT_PROFILE_PROMPT = `You are extracting structured profile data from a CV.

IMPORTANT — Data Minimization (GDPR):
- Extract ONLY professional information: skills, job titles, education level, field of study
- Do NOT extract: full name, address, phone, email, ID numbers, nationality, photo references, date of birth
- Summarize education as: "MSc Data Science, German university, 2024–2026" — no institution name needed unless it's highly relevant to skills
- Summarize experience as: "2 years Python/ML development, data analytics startup" — no company names needed

Return valid JSON:
{
  "skills": ["Python", "scikit-learn", "SQL", "FastAPI"],
  "experienceSummary": "2 years backend development with Python, primarily data pipelines and API development",
  "educationSummary": "BSc Computer Science (India), MSc Data Science (Germany, in progress)",
  "germanLevel": "B1",
  "inferredFields": ["Data Science", "Backend Engineering"],
  "gapQuestions": [
    "Describe your most complex Python project end-to-end",
    "What cloud platforms have you worked with?"
  ]
}`

export async function extractProfile(job: { userId: string; storageKey: string }) {
  // 1. Download CV from S3
  const pdfBuffer = await downloadFromS3(job.storageKey)
  const cvText = await parsePdf(pdfBuffer)

  // 2. Extract with Claude Sonnet (PII-safe prompt)
  const client = new BedrockRuntimeClient({ region: "eu-central-1" })
  const response = await client.send(new InvokeModelWithResponseStreamCommand({
    modelId: process.env.CLAUDE_SONNET_MODEL_ID!,
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${EXTRACT_PROFILE_PROMPT}\n\nCV text:\n${cvText.slice(0, 8000)}`,
        },
      ],
    }),
    contentType: "application/json",
    accept: "application/json",
  }))

  // 3. Parse response
  let extracted: {
    skills: string[]
    experienceSummary: string
    educationSummary: string
    germanLevel: string
    inferredFields: string[]
    gapQuestions: string[]
  }
  // ... stream handling and JSON parse ...

  // 4. Generate profile embedding (for matching)
  const embeddingText = `${extracted.skills.join(", ")}. ${extracted.experienceSummary}. ${extracted.educationSummary}`
  const embedding = await generateEmbedding(embeddingText)

  // 5. Save to DB
  await db
    .insert(userProfiles)
    .values({
      userId: job.userId,
      skills: extracted.skills,
      experienceSummary: extracted.experienceSummary,
      educationSummary: extracted.educationSummary,
      germanLevel: extracted.germanLevel,
      preferredFields: extracted.inferredFields,
      profileEmbedding: embedding,
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        skills: extracted.skills,
        experienceSummary: extracted.experienceSummary,
        profileEmbedding: embedding,
        updatedAt: new Date(),
      },
    })
}
```

---

## 4. Profile Completion Check

After onboarding, every protected route checks `onboarding_complete`:

```typescript
// middleware extension — redirect incomplete users
const { userId: clerkId } = await auth()
if (clerkId && !isOnboardingRoute(request)) {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, ...) 
  })
  if (!profile?.onboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }
}
```

---

## 5. tRPC Onboarding Router

`apps/web/src/server/routers/onboarding.ts`:

```typescript
export const onboardingRouter = router({
  saveStep1: protectedProcedure
    .input(z.object({
      visaType: z.enum(["student_visa_16b", "chancenkarte_20a", "eu_citizen", "blue_card", "near_graduation"]),
      daysRemainingThisYear: z.number().min(0).max(140).optional(),
      semesterEnd: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => { /* ... upsert userProfile ... */ }),

  saveStep2: protectedProcedure
    .input(z.object({
      germanLevel: z.string(),
      preferredFields: z.array(z.string()),
      locationPreference: z.string(),
      minHourlyRate: z.number().optional(),
      weeklyHoursPreference: z.number().min(5).max(20),
      availableFrom: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => { /* ... update userProfile ... */ }),

  getPresignedCvUploadUrl: protectedProcedure
    .input(z.object({ filename: z.string(), sizeBytes: z.number().max(5_000_000) }))
    .mutation(async ({ ctx, input }) => { /* ... generate S3 presigned URL ... */ }),

  getExtractionStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.id),
      })
      return { complete: profile?.onboardingComplete ?? false, profile }
    }),

  completeOnboarding: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.update(userProfiles)
        .set({ onboardingComplete: true, updatedAt: new Date() })
        .where(eq(userProfiles.userId, ctx.user.id))
    }),
})
```

---

## 6. Definition of Done (Phase 1)

- [ ] User can sign up via email + Google OAuth
- [ ] Clerk webhook syncs user to DB on creation
- [ ] Step 1 (visa) saves to `user_profiles.visa_type`
- [ ] Step 2 (preferences) saves to `user_profiles` preferences fields
- [ ] Step 3 (CV upload) stores file in Scaleway, enqueues extraction job
- [ ] Worker successfully extracts profile from a test PDF CV (no PII in DB)
- [ ] Profile embedding generated and stored in `pgvector` column
- [ ] `onboarding_complete = true` after step 3 confirmed
- [ ] Incomplete onboarding users are redirected to `/onboarding`
- [ ] All test visa types store correct `weekly_hours_limit` value
