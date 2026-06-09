# Agora Jobs — Phase 2: Job Ingestion, Legal Filter & Matching
**Document:** PROTO-004 · **Version:** 1.0  
**Duration:** Week 3–5  
**Depends on:** Phase 1 complete  
**Output:** User sees a legal-filtered, AI-ranked swipe deck of real Werkstudent jobs

---

## 1. Goals

At the end of Phase 2, a user with a complete profile opens the app and sees a personalized deck of 20–30 real Werkstudent jobs — all pre-filtered to their legal eligibility — ranked by AI match score.

**This is the prototype's most important differentiator.** The legal filter must be provably real, not cosmetic.

---

## 2. Job Sources (Prototype Scope)

For the prototype, scrape from 3 sources. Each produces Werkstudent roles in Berlin:

| Source | URL | Method | Update frequency |
|--------|-----|--------|-----------------|
| Stellenticket | `stellenticket.de` | Cheerio scraper | Daily |
| Berlin Startup Jobs | `berlinstartupjobs.com` | RSS feed + Cheerio | Daily |
| Arbeitsagentur API | Official BA API | REST API | Daily |

> **Note:** LinkedIn is not scrapable without ToS violation. Arbeitsagentur has a free public API for job listings. This is the cleanest data source for legal job types.

---

## 3. Job Scraper Implementation

### 3.1 BullMQ Queue Setup

`apps/workers/src/queues.ts`:

```typescript
import { Queue, Worker } from "bullmq"
import { Redis } from "ioredis"

const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })

export const scraperQueue = new Queue("job-scraper", { connection: redis })
export const matchingQueue = new Queue("job-matching", { connection: redis })
export const generationQueue = new Queue("ai-generation", { connection: redis })

// Cron: run scraper daily at 3am Berlin time
await scraperQueue.add(
  "daily-scrape",
  { sources: ["stellenticket", "berlinstartupjobs", "arbeitsagentur"] },
  {
    jobId: "daily-scrape",           // idempotent
    repeat: { pattern: "0 3 * * *", tz: "Europe/Berlin" },
    removeOnComplete: 5,
    removeOnFail: 10,
  }
)
```

### 3.2 Stellenticket Scraper

```typescript
// apps/workers/src/scrapers/stellenticket.ts
import axios from "axios"
import * as cheerio from "cheerio"
import { db } from "@agora/db"
import { jobs } from "@agora/db/schema"
import { classifyJobLegality } from "@agora/legal"
import { generateJobEmbedding } from "@agora/ai"

const BASE_URL = "https://www.stellenticket.de/de/offers/"
const WERKSTUDENT_FILTER = "?category=werkstudent&location=berlin"

export async function scrapeStellenTicket() {
  const response = await axios.get(`${BASE_URL}${WERKSTUDENT_FILTER}`, {
    headers: { "User-Agent": "AgoraJobsBot/1.0 (contact: hello@agorajobs.de)" },
  })

  const $ = cheerio.load(response.data)
  const jobListings: Array<{
    externalId: string
    title: string
    company: string
    location: string
    hoursPerWeek: number | null
    hourlyRate: number | null
    description: string
    sourceUrl: string
    germanLevelRequired: string | null
    requiredSkills: string[]
  }> = []

  $(".offer-item").each((_, el) => {
    const $el = $(el)
    const title = $el.find(".offer-title").text().trim()
    const company = $el.find(".offer-company").text().trim()
    const href = $el.find("a.offer-link").attr("href") ?? ""
    const externalId = href.split("/").filter(Boolean).pop() ?? ""

    // Parse hours from title or metadata (e.g. "20 Std/Woche")
    const hoursMatch = $el.text().match(/(\d{1,2})\s*(?:Std|Stunden)(?:\/Woche)?/i)
    const hoursPerWeek = hoursMatch ? parseInt(hoursMatch[1]!) : null

    // Parse rate (e.g. "14,50 €/h" or "14.50 €/Stunde")
    const rateMatch = $el.text().match(/(\d{1,2}[.,]\d{2})\s*€/)
    const hourlyRate = rateMatch ? parseFloat(rateMatch[1]!.replace(",", ".")) : null

    jobListings.push({
      externalId,
      title,
      company,
      location: "Berlin",
      hoursPerWeek,
      hourlyRate,
      description: $el.find(".offer-description").text().trim(),
      sourceUrl: `https://www.stellenticket.de${href}`,
      germanLevelRequired: null,    // extract from full detail page if needed
      requiredSkills: [],           // extracted by AI embedding step
    })
  })

  return jobListings
}
```

### 3.3 Arbeitsagentur API (Cleanest Source)

```typescript
// apps/workers/src/scrapers/arbeitsagentur.ts
// Official Bundesagentur für Arbeit job search API
// Docs: https://jobsuche.api.bund.dev/

const BA_API = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs"

export async function scrapeArbeitsagentur() {
  const response = await axios.get(BA_API, {
    params: {
      was: "Werkstudent",          // job title search
      wo: "Berlin",                // location
      arbeitszeit: "TEILZEIT",     // part-time
      angebotsart: 1,              // employment (not apprenticeship)
      page: 0,
      size: 50,
    },
    headers: {
      "X-API-Key": "jobboerse-jobsuche",  // public key
      "Accept": "application/json",
    },
  })

  return response.data.stellenangebote.map((job: Record<string, unknown>) => ({
    externalId: job.refnr as string,
    title: job.titel as string,
    company: (job.arbeitgeber as string) || "Unbekannt",
    location: (job.arbeitsort as { ort: string })?.ort ?? "Berlin",
    hoursPerWeek: null,
    hourlyRate: null,
    description: (job.kurzbeschreibung as string) ?? "",
    sourceUrl: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.refnr}`,
    germanLevelRequired: null,
    requiredSkills: [],
  }))
}
```

---

## 4. Legal Classification (`packages/legal`)

This is pure TypeScript logic — no AI, no DB. It must be testable in isolation.

### 4.1 Employment Constraint Rules

`packages/legal/src/constraints.ts`:

```typescript
export type VisaType = 
  | "student_visa_16b"
  | "chancenkarte_20a" 
  | "eu_citizen"
  | "blue_card"
  | "near_graduation"

export type ContractType = "werkstudent" | "minijob" | "vollzeit" | "teilzeit" | "praktikum"

export type LegalConstraints = {
  maxWeeklyHours: number
  maxDailyHours: number
  annualDayLimit: number | null          // null = no limit
  requiresEnrollment: boolean
  allowedContractTypes: ContractType[]
  minijobAllowed: boolean
}

export const VISA_CONSTRAINTS: Record<VisaType, LegalConstraints> = {
  student_visa_16b: {
    maxWeeklyHours: 20,
    maxDailyHours: 8,
    annualDayLimit: 140,                 // 140 full days OR 280 half days
    requiresEnrollment: true,
    allowedContractTypes: ["werkstudent", "minijob", "praktikum"],
    minijobAllowed: true,
  },
  chancenkarte_20a: {
    maxWeeklyHours: 20,
    maxDailyHours: 8,
    annualDayLimit: null,               // no day limit, but 20hr/week cap while searching
    requiresEnrollment: false,
    allowedContractTypes: ["werkstudent", "minijob", "teilzeit"],
    minijobAllowed: true,
  },
  eu_citizen: {
    maxWeeklyHours: 40,
    maxDailyHours: 8,
    annualDayLimit: null,
    requiresEnrollment: false,
    allowedContractTypes: ["werkstudent", "minijob", "vollzeit", "teilzeit", "praktikum"],
    minijobAllowed: true,
  },
  blue_card: {
    maxWeeklyHours: 40,
    maxDailyHours: 8,
    annualDayLimit: null,
    requiresEnrollment: false,
    allowedContractTypes: ["werkstudent", "vollzeit", "teilzeit"],
    minijobAllowed: false,
  },
  near_graduation: {
    maxWeeklyHours: 20,
    maxDailyHours: 8,
    annualDayLimit: 140,
    requiresEnrollment: true,
    allowedContractTypes: ["werkstudent", "minijob", "praktikum"],
    minijobAllowed: true,
  },
}

export type EligibilityResult = {
  eligible: boolean
  reasons: string[]                     // human-readable explanation
  failedChecks: string[]                // machine-readable check IDs
}

export function checkEligibility(
  visaType: VisaType,
  job: {
    contractType: ContractType
    hoursPerWeek: number | null
    hourlyRate: number | null
    requiresEnrollment: boolean
  },
  userState: {
    daysRemainingThisYear: number | null
    weeklyHoursUsed?: number
  }
): EligibilityResult {
  const constraints = VISA_CONSTRAINTS[visaType]
  const reasons: string[] = []
  const failedChecks: string[] = []

  // Check 1: Contract type allowed
  if (!constraints.allowedContractTypes.includes(job.contractType)) {
    failedChecks.push("CONTRACT_TYPE_NOT_ALLOWED")
    reasons.push(`${job.contractType} contracts are not allowed on ${visaType}`)
  }

  // Check 2: Hours per week
  if (job.hoursPerWeek !== null && job.hoursPerWeek > constraints.maxWeeklyHours) {
    failedChecks.push("HOURS_EXCEED_LIMIT")
    reasons.push(`${job.hoursPerWeek}hr/week exceeds ${constraints.maxWeeklyHours}hr limit`)
  }

  // Check 3: Annual day limit (only §16b and near_graduation)
  if (constraints.annualDayLimit !== null && userState.daysRemainingThisYear !== null) {
    if (userState.daysRemainingThisYear <= 0) {
      failedChecks.push("ANNUAL_DAY_LIMIT_EXHAUSTED")
      reasons.push("Annual 140-day allowance is exhausted for this year")
    }
  }

  // Check 4: Enrollment requirement
  if (constraints.requiresEnrollment && !job.requiresEnrollment) {
    // Job explicitly says enrollment NOT required — that's fine, it's permissive
    // But if job says enrollment IS required and user can't provide it, flag it
    // (For prototype: assume user is enrolled if they selected student_visa_16b)
  }

  // Check 5: Minijob rate ceiling (€556/month)
  if (job.contractType === "minijob" && job.hourlyRate !== null) {
    const estimatedMonthly = job.hourlyRate * (job.hoursPerWeek ?? 10) * 4.3
    if (estimatedMonthly > 556) {
      failedChecks.push("MINIJOB_CEILING_EXCEEDED")
      reasons.push(`Estimated monthly earnings €${estimatedMonthly.toFixed(0)} exceed €556 Minijob ceiling`)
    }
  }

  return {
    eligible: failedChecks.length === 0,
    reasons,
    failedChecks,
  }
}
```

### 4.2 Legal Filter SQL Query

The filter is applied at the **database query layer**, not in application code:

```typescript
// packages/db/src/queries/jobs.ts
import { db } from "../client"
import { jobs } from "../schema"
import { and, eq, lte, arrayContains, or, isNull } from "drizzle-orm"
import type { VisaType } from "@agora/legal"

export async function getLegallyEligibleJobs(params: {
  visaType: VisaType
  maxWeeklyHours: number
  userId: string
}) {
  return db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.isActive, true),
        eq(jobs.contractType, "werkstudent"),  // prototype: Werkstudent only
        or(
          isNull(jobs.hoursPerWeek),
          lte(jobs.hoursPerWeek, params.maxWeeklyHours)
        ),
        or(
          isNull(jobs.allowedVisaTypes),
          arrayContains(jobs.allowedVisaTypes, params.visaType)
        )
      )
    )
    .limit(500)   // pre-filter pool; AI reranker picks top 30
}
```

---

## 5. AI Matching Pipeline

The 4-step pipeline runs when a user's deck needs refresh (daily or on demand):

### 5.1 Step 1 — SQL Hard Filter (above)

Returns ~50–200 legally eligible jobs.

### 5.2 Step 2 — Vector Similarity

```typescript
// packages/db/src/queries/matching.ts
import { cosineDistance, desc, sql } from "drizzle-orm"

export async function vectorRankJobs(
  userEmbedding: number[],
  eligibleJobIds: string[],
  limit = 50
) {
  const similarity = sql<number>`1 - (${cosineDistance(jobs.jobEmbedding, userEmbedding)})`

  return db
    .select({ id: jobs.id, similarity })
    .from(jobs)
    .where(inArray(jobs.id, eligibleJobIds))
    .orderBy(desc(similarity))
    .limit(limit)
}
```

### 5.3 Step 3 — BM25 Keyword Re-rank

```typescript
// Simple BM25 using pg_trgm similarity
export async function keywordRerankJobs(
  userSkills: string[],
  jobIds: string[]
) {
  const skillQuery = userSkills.join(" ")
  return db
    .select({
      id: jobs.id,
      keywordScore: sql<number>`similarity(${jobs.description}, ${skillQuery})`,
    })
    .from(jobs)
    .where(inArray(jobs.id, jobIds))
    .orderBy(desc(sql`similarity(${jobs.description}, ${skillQuery})`))
}
```

### 5.4 Step 4 — Claude Haiku LLM Reranker

```typescript
// apps/workers/src/jobs/build-deck.ts
const RERANK_PROMPT = (userProfile: string, jobTitle: string, jobDescription: string) => `
You are evaluating whether an international student would get an interview for this Werkstudent role.

Student profile: ${userProfile}

Job: ${jobTitle}
Description: ${jobDescription.slice(0, 500)}

Score from 0–10: Would this student get an interview callback based on skill match and experience fit?
Return ONLY a JSON object: {"score": 7.5, "reason": "Strong Python match, but no FastAPI experience"}
`

async function rerankerScore(
  userProfile: { skills: string[]; experienceSummary: string },
  job: { title: string; description: string }
): Promise<number> {
  const profileStr = `Skills: ${userProfile.skills.join(", ")}. ${userProfile.experienceSummary}`

  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId: process.env.CLAUDE_HAIKU_MODEL_ID!,  // Haiku for cost efficiency
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: RERANK_PROMPT(profileStr, job.title, job.description),
      }],
    }),
    contentType: "application/json",
    accept: "application/json",
  }))

  const result = JSON.parse(new TextDecoder().decode(response.body))
  const content = JSON.parse(result.content[0].text)
  return content.score as number
}
```

### 5.5 Combine Scores & Build Deck

```typescript
export async function buildDeckForUser(userId: string) {
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  })
  if (!profile) throw new Error("Profile not found")

  // Step 1: SQL filter
  const eligible = await getLegallyEligibleJobs({
    visaType: profile.visaType,
    maxWeeklyHours: profile.weeklyHoursLimit,
    userId,
  })

  // Skip already-swiped jobs
  const swiped = await db.query.userJobActions.findMany({
    where: eq(userJobActions.userId, userId),
  })
  const swipedIds = new Set(swiped.map((s) => s.jobId))
  const unseen = eligible.filter((j) => !swipedIds.has(j.id))

  // Step 2: Vector similarity
  const vectorRanked = await vectorRankJobs(profile.profileEmbedding!, unseen.map((j) => j.id), 50)

  // Step 3: Keyword rerank (on top 50)
  const keywordRanked = await keywordRerankJobs(profile.skills, vectorRanked.map((j) => j.id))

  // Step 4: LLM reranker (on top 30 — Haiku is cheap but not free)
  const top30 = keywordRanked.slice(0, 30)
  const reranked = await Promise.all(
    top30.map(async (j) => {
      const job = unseen.find((u) => u.id === j.id)!
      const score = await rerankerScore(profile, job)
      return { ...j, matchScore: score }
    })
  )

  return reranked
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 25)
}
```

---

## 6. Swipe Deck UI

### 6.1 Card Component

```typescript
// apps/web/src/components/job-card.tsx
"use client"

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"

interface JobCardProps {
  job: {
    id: string
    title: string
    company: string
    hourlyRate: number | null
    hoursPerWeek: number | null
    matchScore: number
    location: string
  }
  onSwipe: (jobId: string, direction: "left" | "right" | "up") => void
}

export function JobCard({ job, onSwipe }: JobCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const rightOpacity = useTransform(x, [50, 150], [0, 1])
  const leftOpacity = useTransform(x, [-150, -50], [1, 0])

  function handleDragEnd(_: never, info: PanInfo) {
    if (info.offset.x > 100) onSwipe(job.id, "right")
    else if (info.offset.x < -100) onSwipe(job.id, "left")
    else if (info.offset.y < -80) onSwipe(job.id, "up")
  }

  return (
    <motion.div
      style={{ x, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute w-full cursor-grab active:cursor-grabbing"
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        {/* Match score badge */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
            <p className="text-gray-600">{job.company}</p>
          </div>
          <div className="bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-sm font-semibold">
            {job.matchScore.toFixed(1)}/10
          </div>
        </div>

        {/* Key details */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {job.hourlyRate && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Hourly rate</p>
              <p className="font-semibold">€{job.hourlyRate}/hr</p>
            </div>
          )}
          {job.hoursPerWeek && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Hours/week</p>
              <p className="font-semibold">{job.hoursPerWeek}h</p>
            </div>
          )}
        </div>

        {/* Legal eligibility ticks */}
        <div className="flex flex-wrap gap-2">
          {["Visa ✓", "Hours ✓", "Skills ✓", "German ✓"].map((check) => (
            <Badge key={check} variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <CheckCircle className="w-3 h-3 mr-1" />
              {check}
            </Badge>
          ))}
        </div>

        {/* Swipe indicators (opacity animated with drag) */}
        <motion.div style={{ opacity: rightOpacity }} className="absolute top-6 left-6 rotate-[-20deg] border-4 border-emerald-500 text-emerald-500 rounded-lg px-3 py-1 text-2xl font-black">
          APPLY
        </motion.div>
        <motion.div style={{ opacity: leftOpacity }} className="absolute top-6 right-6 rotate-[20deg] border-4 border-red-400 text-red-400 rounded-lg px-3 py-1 text-2xl font-black">
          PASS
        </motion.div>
      </div>
    </motion.div>
  )
}
```

---

## 7. Definition of Done (Phase 2)

- [ ] Scraper runs and ingests ≥50 real Werkstudent Berlin jobs
- [ ] Job embeddings generated and stored in `pgvector`
- [ ] Legal filter tested: §16b user sees 0 Vollzeit/overtime jobs
- [ ] Legal filter tested: EU citizen user sees wider job set
- [ ] Swipe deck renders on mobile (iPhone SE viewport)
- [ ] Right/left/up swipe gestures functional with haptic feedback (via CSS)
- [ ] Deck build completes in < 3 seconds (measure end-to-end)
- [ ] Already-swiped jobs do not reappear
- [ ] Daily scraper cron job enqueues at 3am and does not duplicate jobs (idempotent)
- [ ] Job detail view opens on card tap with full description
