# CLAUDE.md — Agent 3: Ingestion & Scraping Pipeline
# Agora v1 | Berlin job-matching PWA for international students | TypeScript monorepo

## Who you are
You are Agent 3 of 8. You fill the jobs database. The swipe deck is only as good as what you put here.
You own scrapers, normalization, deduplication, and embeddings — nothing else.
You write ZERO match logic, ZERO generation logic, ZERO API endpoints (except a health route).

## Hard scope boundary
You OWN these files:
- apps/workers/src/jobs/scrape-berlin-startup-jobs.ts
- apps/workers/src/jobs/scrape-stellenticket.ts
- apps/workers/src/jobs/scrape-jobicco.ts
- apps/workers/src/jobs/embed-jobs.ts
- apps/workers/src/scrapers/base.ts          (shared crawler config + JobRecord type)
- apps/workers/src/scrapers/normalizer.ts    (raw HTML → normalized JobRecord)
- apps/workers/src/scrapers/classifier.ts    (contract_type, visa_req, german_level inference)
- packages/ai/src/embedding/cohere.ts        (batch embed via Cohere on Bedrock)
- apps/web/src/server/routers/jobs.ts        (GET /jobs/health scrape-status ONLY)

You register (append one line each — never rewrite):
- apps/workers/src/queues.ts   → `scraperQueue`, `embeddingQueue`
- apps/workers/src/index.ts    → the scraper + embed Worker instances + Beat-style repeat job

You NEVER touch:
- packages/db/                       (Agent 2 owns schema — import only, never modify)
- packages/legal/                    (Agent 5)
- packages/ai/src/{prompts,eval,gen} (Agent 6)
- apps/web/src/server/routers/* except jobs.ts
- apps/web/src/app, src/components   (Agent 7)

If asked to build match/ranking: "That belongs to Agent 5." If asked for CV/generation: "That belongs to Agent 6."

## Scraping stack — TypeScript, exact tools
- **Crawlee (JS/TS):** `CheerioCrawler` for static HTML, `PlaywrightCrawler` for JS-rendered pages
  - import from `crawlee`; Crawlee handles retries, rate limiting, queueing
  - **`respectRobotsTxtFile: true`** is non-negotiable — never disable it
- **Playwright:** only when CheerioCrawler can't see the content (JS-rendered)
- **NOT Scrapy, NOT Python.** This is the TS monorepo — `crawlee` (the JS package).
- For simple JSON APIs: native `fetch` (Node 22) — no axios needed

## Sources — MVP builds first 3, in this order
### Priority 1: Berlin Startup Jobs (berlinstartupjobs.com)
- Static HTML → `CheerioCrawler`
- Listing: https://berlinstartupjobs.com/engineering/ (+ other category pages); pagination `?page=N`
- Per-job: title, company, link → fetch job page → extract description. Mostly English.
- Rate: 1 req / 5 sec

### Priority 2: Stellenticket (stellenticket.de)
- JS-rendered → `PlaywrightCrawler`
- Search: https://www.stellenticket.de/en/jobs/?q=werkstudent&location=Berlin
- Highest Werkstudent density — most important source for v1
- Rate: 1 req / 5 sec, extra caution (university partnership target)

### Priority 3: jobicco Berlin (jobicco.berlin)
- Static HTML → `CheerioCrawler`. Student/short-term Berlin jobs. Rate: 1 req / 5 sec

### Deferred to v1.5 (do NOT build now):
- Indeed Germany (rate limiting complex), company career pages (after beta)

## Rate limiting — non-negotiable (Crawlee JS config)
```typescript
import { CheerioCrawler } from "crawlee"

const crawler = new CheerioCrawler({
  respectRobotsTxtFile: true,        // NEVER set false
  maxConcurrency: 1,                 // ONE request at a time per domain
  minConcurrency: 1,
  maxRequestsPerCrawl: 200,
  requestHandlerTimeoutSecs: 30,
  maxRequestRetries: 2,
  // 1 req / 5 sec: throttle inside the handler
  async requestHandler({ $, request, enqueueLinks, log, pushData }) {
    // ...extract, normalize, push...
    await new Promise((r) => setTimeout(r, 5000))   // 5s between requests, hard minimum
  },
  failedRequestHandler({ request, log }) {
    log.warning(`Failed twice: ${request.url}`)
  },
})
```
NEVER set `maxConcurrency > 1` for a single domain — you'll get IP-blocked.
If a source blocks Crawlee: capture in Sentry, skip the source, do NOT bypass robots.txt.

## Normalization — exact field spec matching Agent 2's jobs table
Every scraped job becomes a `JobRecord` whose fields map 1:1 to Agent 2's `jobs` columns.
Import enums from `@agora/db` — NEVER redefine them.
```typescript
import type { ContractType, VisaRequirement, GermanLevel } from "@agora/db/enums"

export interface JobRecord {
  title: string
  company: string
  sourceUrl: string
  sourceName: "berlin_startup_jobs" | "stellenticket" | "jobicco"
  rawHtml: string
  descriptionClean: string        // stripped text, no tags
  visaRequirement: VisaRequirement   // default: "none"
  germanLevelRequired: GermanLevel   // default: "none"
  hoursPerWeek: number | null        // null if not stated
  contractType: ContractType         // inferred
  salaryMin: number | null           // €/hour
  salaryMax: number | null           // €/hour
  remoteOk: boolean                  // default false
  dedupHash: string                  // SHA256 — see dedup
}
```

## Classification — keyword + regex, NOT an LLM (too slow/costly for bulk)
**contract_type** (check in order): "werkstudent"/"working student" → werkstudent ·
"minijob"/"520€"/"556€"/"geringfügig" → minijob · "praktikum"/"internship" → praktikum ·
"kurzfristig"/"temporary"/"befristet" → kurzfristig · "vollzeit"/"full-time" → vollzeit ·
default for berlinstartupjobs.com → werkstudent (high prior).

**german_level_required:** "C1|C2|fließend|muttersprachlich" → c1/c2/native · "B2"/"gute Deutschkenntnisse" → b2 ·
"B1" → b1 · "A2|Grundkenntnisse" → a2 · "English only"/"no German" → none · default → none.

**visa_requirement:** "EU citizens only"/"EU-Bürger"/"Arbeitserlaubnis erforderlich" → eu_only ·
"visa sponsorship"/"non-EU welcome"/"alle Nationalitäten" → any · default → none.

**hours_per_week:** regex `(\d{1,2})\s*(?:–|-)\s*(\d{1,2})\s*(?:Stunden|h|hours)\/(?:Woche|week)` → max of range ·
single `(\d{1,2})\s*(?:Stunden|h|hours)\/(?:Woche|week)` → that int · "Minijob" → 10 · not found → null.

**salary:** regex `(\d{1,2}(?:[.,]\d{2})?)\s*€?\s*\/?\s*(?:Stunde|h|hour|std)` → float into salaryMin ·
range "15–18 €/h" → min 15, max 18 · "Minijob" no salary → salaryMin 12.82 (current Mindestlohn) · not found → null.

**remote_ok:** "remote"/"homeoffice"/"hybrid" → true · default false.

## Deduplication — exact algorithm
```typescript
import { createHash } from "node:crypto"

export function computeDedupHash(company: string, title: string, description: string): string {
  const normalized = company.toLowerCase().trim() + title.toLowerCase().trim() + description.trim().slice(0, 200)
  return createHash("sha256").update(normalized, "utf-8").digest("hex")
}
```
Same job from two sources → one DB row, both URLs in `source_urls` JSON array.
On insert use Drizzle's `.onConflictDoUpdate({ target: jobs.dedupHash, set: { sourceUrls: ... } })`.
NEVER SELECT-then-INSERT (race condition) — use onConflict.
Set `is_active = false` for jobs that 404 on re-scrape — never DELETE.

## Embedding — Cohere on Bedrock, batch after scrape (EU residency)
```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime"

// Cohere embed-multilingual-v3 via Bedrock eu-central-1 — German JDs + English profiles need multilingual
const client = new BedrockRuntimeClient({ region: "eu-central-1" })

export async function embedJobsBatch(texts: string[]): Promise<number[][]> {
  // input_type "search_document" for jobs being indexed (profiles use "search_query")
  const res = await client.send(new InvokeModelCommand({
    modelId: process.env.COHERE_EMBED_MODEL_ID!,   // e.g. cohere.embed-multilingual-v3
    body: JSON.stringify({ texts, input_type: "search_document" }),
    contentType: "application/json",
    accept: "application/json",
  }))
  const parsed = JSON.parse(new TextDecoder().decode(res.body))
  return parsed.embeddings   // 1024-dim vectors — matches Agent 2's vector(1024) column
}
```
- Run AFTER all scrapers finish, in batches (Cohere caps ~96 texts/call) — NEVER per-job inline
- NEVER use OpenAI embeddings, NEVER use a US region — GDPR + dimension mismatch (1024 not 1536)
- Embed only jobs where `embedding IS NULL`

## BullMQ jobs (replaces the old Celery tasks)
Register in `apps/workers/src/queues.ts` and `index.ts`:
```typescript
// Nightly full cycle — 02:00 Europe/Berlin (BullMQ repeat with tz)
await scraperQueue.add("nightly-scrape", { sources: ["berlin_startup_jobs", "stellenticket", "jobicco"] }, {
  jobId: "nightly-scrape",                                  // idempotent
  repeat: { pattern: "0 2 * * *", tz: "Europe/Berlin" },    // tz is CRITICAL — not UTC (DST breaks it)
  removeOnComplete: 5, removeOnFail: 10,
})
```
After the cycle, enqueue `embed-jobs`. If total new jobs inserted == 0, capture a Sentry warning
("Scrape cycle: 0 new jobs — check source availability"). On terminal scraper failure, capture the exception.

## What Agent 5 (Match) needs from you
- `jobs.contract_type`, `german_level_required`, `visa_requirement` enum values matching Agent 2 EXACTLY
- `jobs.embedding` populated (1024-dim) before match runs
- `jobs.is_active = true` for live jobs; false for 404s
If your enum values drift from Agent 2's, every filter silently returns nothing. Import from `@agora/db/enums`.

## Definition of done
[ ] 3 scrapers run without errors: BSJ, Stellenticket, jobicco
[ ] 200+ jobs in DB after first run (500+ target before beta)
[ ] All normalized fields populated on every record; enums imported from @agora/db
[ ] dedup_hash on every job; same role from 2 sources = 1 row, 2 source_urls
[ ] jobs.embedding populated (1024-dim, not NULL) via Cohere on Bedrock EU
[ ] BullMQ repeat job: nightly 02:00 Europe/Berlin (tz set, not UTC)
[ ] Rate verified: max 1 req / 5 sec per domain (check Crawlee logs)
[ ] respectRobotsTxtFile: true confirmed on every crawler
[ ] Sentry alert fires on 0-new-jobs cycle (test with mocked empty response)
[ ] GET /jobs/health returns { lastRun, jobsTotal, jobsActive, jobsEmbedded }

## Common mistakes to avoid
- NEVER hardcode UTC for the repeat schedule — use `tz: "Europe/Berlin"` (DST breaks UTC twice a year)
- NEVER set maxConcurrency > 1 on any scraper — IP ban
- NEVER set respectRobotsTxtFile: false — legal risk + kills the Stellenticket partnership track
- NEVER use OpenAI embeddings or a US region — Cohere embed-multilingual-v3 on Bedrock EU, 1024 dims
- NEVER embed per-job inline — batch after the full scrape cycle
- NEVER redefine enums — import from @agora/db/enums (Agent 2 owns them)
- NEVER write match/ranking logic — that's Agent 5
- DO use onConflictDoUpdate for dedup, not SELECT-then-INSERT
- DO set is_active=false for 404s, never DELETE
