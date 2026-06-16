# Agora Jobs — Job Data Sourcing Strategy
**Document type:** Technical & Business Strategy  
**Status:** Pre-build planning  
**Prepared for:** Founding team  
**Date:** June 2026

---

## The Core Question: How Do Other Platforms Get Jobs?

Before your strategy, you need to understand the landscape clearly. There are three fundamentally different methods every job platform uses, and most combine all three.

### Method 1 — Direct Employer Postings
Companies like StepStone, LinkedIn, and XING charge employers to post directly on their platform. The employer logs in, fills out a form, and pays per posting or per subscription. This is how a "job board" works in the traditional sense.

**For Agora in v1:** You should NOT do this. You have no employer relationships yet, you'd be competing against established names, and it takes years to build the supply side. Skip it for now.

### Method 2 — ATS Public API Feeds
This is the secret most people don't know. When a company posts a job using software like Greenhouse, Lever, Ashby, or Personio (the tools HR teams use internally), those systems automatically publish the job to a *public JSON endpoint* on the internet — no login, no payment, no permission required. Every job a company posts through Greenhouse is already sitting at a URL anyone can read. This is how Arbeitnow, many niche boards, and even LinkedIn initially filled their inventories.

**For Agora in v1:** This is your highest-quality source and should be your primary pipeline. It's direct from employers, always fresh, and completely legal.

### Method 3 — Web Scraping / Crawling
Platforms like Indeed built their entire empire by sending bots to crawl every company career page, every job board, every newspaper job section on the internet — exactly like Google indexes the web. They don't have permission. They just do it, and the data is public.

**For Agora in v1:** Legal in Germany for publicly available data (confirmed by German courts), but must comply with robots.txt and rate limits. Use Crawlee (already in your stack). This is your supplementary pipeline for sources that don't have APIs.

### Method 4 — Commercial Data APIs / Partnerships
Some platforms sell their job data via commercial APIs. Others form official partnerships. Adzuna has an official API. Bundesagentur für Arbeit has a semi-official REST API. Stellenticket has been identified in your own business plan as a direct partnership target.

**For Agora in v1:** Use the free/semi-official APIs immediately. Pursue commercial partnerships at month 2–3.

---

## Your Specific Problem as Agora

You are not building a generic job board. You need:

1. **Werkstudent-tagged jobs** in Berlin specifically
2. **Jobs with contract type metadata** (Minijob, Teilzeit, Werkstudent, Vollzeit)
3. **English-language jobs** or at minimum jobs that don't require German above a given level
4. **Jobs with hourly rate / salary** info (for the 20hr cap and Minijob ceiling checks)
5. **Apply URLs** so users go to the company's own page to apply

The challenge: most German job data sources don't have clean "Werkstudent = true" flags. You will need an enrichment layer — an LLM pass (Claude Haiku 4.5) that classifies job type from the description. This is standard practice and is already anticipated in your eval architecture.

---

## Tier 1 — Free Official / Semi-Official APIs (Start Here, Day 1)

These cost nothing, are legal, and give you immediate volume.

### 1a. Bundesagentur für Arbeit (Arbeitsagentur) — THE Most Important Source

Germany's federal employment agency. It is the largest job database in Germany with **1.5 million+ live listings**. Every employer in Germany who registers a job with the government posts here. This includes Minijob, Teilzeit, Werkstudent, and all categories.

**The API situation:** The BA has no *official* developer API. However, their web app uses a public REST endpoint that the community has reverse-engineered and documented thoroughly (GitHub: `bundesAPI/jobsuche-api`, official docs at `jobsuche.api.bund.dev`). This is widely used in production by German researchers, startups, and data companies. Apify has multiple commercial scrapers built on it. It is stable, not blocked, and the key is public.

**Base URL:**
```
https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs
```

**Authentication header:**
```
X-API-Key: jobboerse-jobsuche
```

**Example query for Berlin Werkstudent/Minijob jobs:**
```bash
curl -H "X-API-Key: jobboerse-jobsuche" \
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs\
?wo=Berlin&umkreis=25&arbeitszeit=tz;mj&angebotsart=1&page=1&size=25"
```

**Key filter parameters:**
| Parameter | Values | Meaning |
|---|---|---|
| `wo` | `Berlin` | Location |
| `umkreis` | `25` | Radius in km |
| `arbeitszeit` | `vz` = full-time, `tz` = part-time, `mj` = Minijob, `snw` = shift/night, `ho` = remote | Work time type |
| `angebotsart` | `1` = job, `2` = apprenticeship, `4` = internship | Job type |
| `was` | keyword string | Job title/keyword search |

**Two-step fetch pattern:**
1. Search → get `refnr` (reference number) from results
2. Fetch detail: `GET /pc/v4/jobdetails/{base64(refnr)}` — gives full description, contact, salary, apply URL

**Volume estimate:** ~50,000–100,000 Berlin-area jobs active at any time. After filtering for part-time and Minijob categories, expect 5,000–15,000 relevant listings.

**Refresh cadence:** Run every 4 hours. New jobs appear within minutes on the BA side.

---

### 1b. Arbeitnow — Best Source for International-Friendly Jobs

Arbeitnow (arbeitnow.com) is a job board built specifically for Germany's international tech and startup talent market. The founder moved from India to Berlin in 2018 — the exact demographic overlap with your users. It has a **completely free public JSON API** with no auth required.

**Why this matters for Agora:** Arbeitnow specifically indexes English-speaking roles, visa-sponsorship roles, and international-friendly companies. These are exactly the employers willing to hire international students.

**Free public API:**
```
GET https://www.arbeitnow.com/api/job-board-api
```

Returns paginated JSON with: title, description, tags (including "werkstudent", "minijob", "student"), location, remote flag, company name, apply URL, created_at timestamp.

**Filter for student jobs:**
The `tags` array contains terms like `werkstudent`, `student`, `minijob`, `teilzeit`. You can filter server-side after fetching.

**RSS feed also available:**
```
GET https://www.arbeitnow.com/feed
```

**Volume:** ~10,000–20,000 total jobs indexed, with a meaningful slice tagged student/Werkstudent. Quality is high because Arbeitnow manually vets listings.

**Partnership opportunity:** The Arbeitnow founder (Adithya Srinivasan, Indian, Berlin-based) offers a **custom private API endpoint for a monthly fee** — listed on their blog. This is an early partnership to pursue at month 1–2. Email: contact@arbeitnow.com. Given your overlapping target audience, there may be a data-sharing arrangement possible.

---

### 1c. Google for Jobs (via JSearch API — RapidAPI)

Google for Jobs is a search feature built into Google Search. When you search "Werkstudent Berlin" on Google, Google shows structured job cards aggregated from across the web. JSearch by OpenWeb Ninja (on RapidAPI) provides API access to this Google for Jobs index in real-time.

**Why this matters:** Google for Jobs indexes LinkedIn, Indeed, StepStone, company career pages, and hundreds of smaller sources simultaneously. One API call gives you aggregated data from all of them.

**JSearch API:**
- Sign up at `openwebninja.com` or RapidAPI
- Free tier available; paid plans start low
- Returns 30+ data points per job including: title, company, description, salary, job type, apply link, source platform, `job_required_experience`, `job_employment_type`

**Example query:**
```
GET /search?query=Werkstudent+Berlin&country=DE&employment_types=PARTTIME
```

**Caution:** Because this aggregates from many sources, you will get duplicates. Deduplication by (company + title + location) hash is essential.

---

## Tier 2 — ATS Public Feeds (Your Highest Quality Source)

These are public JSON endpoints that Greenhouse, Lever, Ashby, Personio, and Recruitee expose automatically for every company that uses them. No auth. No scraping. No robots.txt concerns. Just clean JSON.

**This is how professional job boards fill their inventory.** The data is real-time, comes directly from the employer, and includes the actual apply URL.

### How to use them

You need a list of Berlin companies using each ATS. This is a one-time research task, then automated. Sources:
- Crunchbase Berlin company list → check their career page URLs
- LinkedIn company search → Berlin tech/startup → check ATS from career page URL pattern
- Use Crawlee to auto-detect ATS type from career page URL (`boards.greenhouse.io`, `jobs.lever.co`, `app.ashbyhq.com`, etc.)

### Greenhouse
Used by: Delivery Hero, N26, HelloFresh, Zalando (some teams), Auto1, Wunderkind, and hundreds of Berlin tech companies.

```
GET https://boards-api.greenhouse.io/v1/boards/{company_slug}/jobs?content=true
```

Returns: title, location, department, description, updated_at, apply URL. No auth. No rate limit documented. Just HTTP GET.

**Example — HelloFresh:**
```
GET https://boards-api.greenhouse.io/v1/boards/hellofresh/jobs?content=true
```

### Lever
Used by: Personio itself, many Berlin scaleups and agencies.

```
GET https://api.lever.co/v0/postings/{company_slug}?mode=json&commitment=Part-time
```

Supports filtering by `commitment` (part-time, full-time), `location`, `team`, `level`. Direct filtering for part-time at the source level.

### Ashby
Used by many newer Berlin tech startups.

```
GET https://api.ashbyhq.com/posting-api/job-board/{company_slug}?includeCompensation=true
```

Best compensation data of any public ATS feed. Clean structured salary ranges.

### Personio
The dominant HR software for mid-size German companies (1,000+ customers). XML feed per company:

```
GET https://{company}.jobs.personio.de/xml?language=en
```

Also has a JSON variant. This is the ATS used by many traditional German Mittelstand companies that would post Werkstudent roles.

**For Personio specifically:** Given it's the dominant German HR platform, building a Personio company list and scraping all their public job feeds is a significant data moat. There are thousands of companies on Personio in Germany.

### Recruitee
Used by many German SMEs.

```
GET https://{company}.recruitee.com/api/offers/
```

### Workable
```
GET https://www.workable.com/api/accounts/{account_subdomain}?details=true
```

### Implementation Strategy for ATS Feeds

1. **Phase 1 (week 1):** Build a list of ~200 Berlin companies likely to post Werkstudent roles. Check their career page URLs to identify ATS type.
2. **Phase 2 (week 2):** Build a Crawlee crawler that: (a) detects ATS type from career page URL pattern, (b) hits the correct public API endpoint, (c) normalizes to your Drizzle schema.
3. **Phase 3 (ongoing):** Schedule this to run every 6 hours. New companies can be added to the list anytime.
4. **Enrichment (ongoing):** Claude Haiku 4.5 classifies each job: `is_werkstudent`, `is_minijob`, `required_german_level`, `estimated_hours_per_week`, `is_eligible_for_student_visa`. This is your legal eligibility enrichment layer.

---

## Tier 3 — Targeted Crawling (Partner-First, Crawl-Second)

These sources don't have clean public APIs but are important for Berlin student jobs specifically. Pursue a partnership first; crawl only if the partnership fails.

### Stellenticket — Highest Priority Partnership

Stellenticket is the official student job board for every major Berlin university: TU Berlin, HU Berlin, FU Berlin, HWR, HTW, Berliner Hochschule für Technik, and more. It is operated by jobicco. Every employer who wants to reach Berlin students posts here.

**Why this matters:** Stellenticket listings are already pre-qualified — employers who post there explicitly want student workers. This is your cleanest source of Werkstudent and Minijob roles.

**Partnership approach:**
1. Email: `info@jobicco.berlin` — introduce Agora as an AI-powered student job discovery platform
2. Propose: Agora displays Stellenticket listings with attribution and drives apply-clicks back to Stellenticket
3. Value proposition to them: Traffic + brand exposure to exactly their target demographic
4. Fallback: Crawl their public listings (they are publicly accessible, no login required) using Crawlee with 1 req/5 sec per domain

**Stellenticket portals to target:**
- `hu-berlin.stellenticket.de`
- `tu-berlin.stellenticket.de`
- `fu-berlin.stellenticket.de`
- `hwrberlin.stellenticket.de`
- `htw-berlin.stellenticket.de`

**Volume:** Each portal has 500–2,000 active listings. Combined Berlin-wide: ~5,000–8,000 relevant student roles.

### jobicco Berlin — Casual/Odd Jobs Source

jobicco.berlin is the companion to Stellenticket for non-study-related casual work (warehouse, events, retail, gastronomy). This maps to your "Odd-jobs / Part-time" category (Phase 2–3).

**Partnership approach:** Same contact as Stellenticket (both operated by jobicco).

### Berlin Startup Jobs

Your business plan already identifies this as a direct API partnership target for month 1. Berlin Startup Jobs (berlinstartupjobs.com) is a curated board of Berlin-specific startup roles.

**Action:** Email their team directly, propose a data feed exchange. Berlin Startup Jobs gets distribution via Agora's AI matching; Agora gets their curated listing data.

### StepStone

Germany's largest traditional job board. No public API. Has a publisher/partner program for media companies.

**Crawl approach:** StepStone allows crawling of their public search results. Use a Crawlee scraper with:
- Query: `Werkstudent Berlin`, `Minijob Berlin`
- Rate: 1 req/10 sec
- Robots.txt: respect fully
- Frequency: Once every 12 hours (listings don't change that fast)

**Note:** StepStone's data quality is very high because employers pay to post there. Worth the crawl complexity.

### Absolventa / Workwise / academics.de

Niche German student/graduate job boards. All have public search pages. Crawl with Crawlee as secondary sources.

---

## Tier 4 — Zenjob / Jobber / Staffing Platforms (Phase 2)

Zenjob, Jobber, and similar gig-work platforms connect students with one-off shift work. These platforms have their own app ecosystems and don't expose job data publicly — you'd need a commercial data arrangement.

**Action for Phase 2:** Contact Zenjob's BD team to explore listing data sharing. Frame it as a distribution partnership — Agora sends them students, they pay per placement or share listing data.

---

## The Enrichment Layer: How Raw Jobs Become Eligible Swipe Cards

Raw job data from any source is dirty. A job listed as "Teilzeit" might be 10 hours/week or 35 hours/week. "Student" in the title means nothing without context. You need an enrichment pipeline that runs on every ingested job.

### Enrichment Pipeline (per job, runs after ingestion)

```
Raw Job → Field Normalization → LLM Classification → Eligibility Tagging → Vector Embedding → DB Insert
```

**Step 1 — Field Normalization (deterministic)**
- Normalize location to coordinates + district + city
- Parse salary strings to min/max floats + currency
- Parse employment type to your enum: `WERKSTUDENT | MINIJOB | TEILZEIT | VOLLZEIT | ODD_JOB`
- Extract contract duration if mentioned
- Detect output language (DE or EN) using langdetect

**Step 2 — LLM Classification (Claude Haiku 4.5, ~€0.001/job)**
Send job title + description excerpt (first 500 chars) to Haiku with a structured prompt:

```
Classify this German job listing. Return JSON only:
{
  "employment_type": "werkstudent|minijob|teilzeit|vollzeit|odd_job|unknown",
  "estimated_weekly_hours": number|null,
  "minimum_german_level": "none|A1|A2|B1|B2|C1|C2",
  "is_field_related": true|false,  // requires degree-level knowledge
  "contract_type": "permanent|fixed_term|project|unknown",
  "visa_eligible": true|false|null  // null = cannot determine
}
```

**Step 3 — Eligibility Tagging (deterministic)**
Using the classified output + the job's raw fields, apply your legal filters:
- Tag for each visa type that can legally take this job
- Flag if the Minijob salary ceiling would be breached at stated hours
- Flag if the 20hr/week cap is at risk

**Step 4 — Vector Embedding (Cohere embed-multilingual-v3)**
Embed: `title + company + description[:800]` → store in pgvector with HNSW index

**Step 5 — Deduplication**
SHA-256 hash of `(company_name + title + location + apply_url)`. Skip if seen before. Update if `updated_at` is newer.

---

## Data Architecture: What Your Jobs Table Looks Like

```sql
CREATE TABLE jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source tracking
  source        TEXT NOT NULL,          -- 'arbeitsagentur' | 'arbeitnow' | 'greenhouse' | 'lever' | 'stellenticket' | etc.
  source_id     TEXT NOT NULL,          -- original ID from source
  apply_url     TEXT NOT NULL,
  
  -- Core fields
  title         TEXT NOT NULL,
  company       TEXT NOT NULL,
  description   TEXT NOT NULL,
  location_raw  TEXT,
  city          TEXT,
  district      TEXT,
  latitude      FLOAT,
  longitude     FLOAT,
  
  -- Classification (from enrichment)
  employment_type  job_type_enum,       -- werkstudent | minijob | teilzeit | vollzeit | odd_job
  weekly_hours_min SMALLINT,
  weekly_hours_max SMALLINT,
  salary_min    NUMERIC,
  salary_max    NUMERIC,
  salary_currency TEXT DEFAULT 'EUR',
  
  -- Eligibility flags (set by enrichment pipeline)
  eligible_student_visa      BOOLEAN,
  eligible_eu_citizen        BOOLEAN,
  eligible_chancenkarte      BOOLEAN,
  min_german_level           german_level_enum,   -- none | a1 | a2 | b1 | b2 | c1 | c2
  
  -- Freshness
  posted_at     TIMESTAMPTZ,
  scraped_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,            -- set to posted_at + 60 days if no explicit expiry
  is_active     BOOLEAN DEFAULT TRUE,
  
  -- ML
  embedding     VECTOR(1024),           -- Cohere embed-multilingual-v3
  dedup_hash    TEXT UNIQUE,            -- SHA-256(company+title+location+apply_url)
  
  -- Indexes
  CONSTRAINT jobs_source_unique UNIQUE (source, source_id)
);

CREATE INDEX ON jobs USING HNSW (embedding vector_cosine_ops);
CREATE INDEX ON jobs (city, is_active, employment_type);
CREATE INDEX ON jobs (eligible_student_visa, is_active);
```

---

## Implementation Roadmap: Step by Step

### Week 1 — Data Foundation

**Day 1–2: Arbeitsagentur Integration**
1. Test the API manually with curl (endpoints documented above — no setup needed)
2. Build a Crawlee `PuppeteerCrawler`-free HTTP fetcher (it's a JSON API, no browser needed)
3. Implement the two-step fetch: search → detail
4. Map BA fields to your jobs schema
5. Run first bulk fetch: Berlin, all part-time/Minijob types, store in DB
6. Target: 5,000+ jobs ingested on day 1

**Day 3–4: Arbeitnow Integration**
1. Hit the public API endpoint
2. Map fields, filter for student-tagged jobs
3. Implement deduplication against BA data
4. Target: additional 2,000–5,000 jobs

**Day 5: Enrichment Pipeline**
1. Build the Haiku classification job (Celery Beat task)
2. Run enrichment on all ingested jobs
3. Verify eligibility tagging logic with 20 manual spot-checks
4. Build pgvector embeddings for all enriched jobs

### Week 2 — ATS Feeds

**Day 1–2: Berlin Company List**
1. Export Berlin tech companies from Crunchbase (free tier)
2. For each company, check career page URL:
   - Contains `boards.greenhouse.io` → Greenhouse
   - Contains `jobs.lever.co` → Lever
   - Contains `app.ashbyhq.com` or `jobs.ashbyhq.com` → Ashby
   - Contains `.personio.de/jobs` → Personio
   - Contains `.recruitee.com` → Recruitee
3. Build a company_ats_registry table: `(company_slug, ats_platform, ats_identifier)`
4. Target: 200 Berlin companies catalogued

**Day 3–4: ATS Crawler**
1. Build one Crawlee actor per ATS platform (Greenhouse, Lever, Ashby, Personio)
2. Each actor reads from company_ats_registry, hits the public endpoint, normalizes, deduplicates, inserts
3. Schedule each to run every 6 hours via Celery Beat

**Day 5: Monitoring**
1. Set up a zero-job-cycle alert (Sentry) — if a scheduled scrape returns 0 jobs, alert immediately
2. Track `jobs_ingested_24h` in a metrics table
3. Build a simple internal dashboard showing source breakdown

### Week 3 — Partnerships + Crawling

**Day 1: Outreach**
1. Email Arbeitnow founder: propose custom API endpoint partnership
2. Email jobicco/Stellenticket: propose listing integration with attribution
3. Email Berlin Startup Jobs: propose data feed exchange

**Day 2–3: Crawlee Scrapers for Remaining Sources**
1. StepStone Berlin Werkstudent search (1 req/10 sec, respect robots.txt)
2. Absolventa Berlin student jobs
3. Workwise Werkstudent Berlin
4. Build a shared Crawlee base scraper that all crawlers extend

**Day 4–5: Quality Audit**
1. Sample 100 random jobs from DB
2. Check: is employment_type correct? Is eligibility_flag correct?
3. Refine Haiku classification prompt based on errors
4. Target: 90%+ classification accuracy

### Month 2 — Scale and Polish

1. Expand ATS registry from 200 to 1,000+ Berlin companies
2. Add Zenjob partnership conversation
3. Implement the learning loop: when users swipe left on a job, tag it; when right, tag it — feed this back into ranking
4. Add automated expiry: if a job has been in DB for 60 days and is no longer returned by source, mark is_active=false

---

## Cost Estimate

| Source | Cost |
|---|---|
| Bundesagentur für Arbeit API | €0 — public, no key required |
| Arbeitnow public API | €0 — completely free |
| ATS feeds (Greenhouse/Lever/Ashby/Personio) | €0 — public endpoints |
| Haiku enrichment (~10,000 jobs/month, 500 tokens each) | ~€0.25/month |
| Cohere embeddings (~10,000 jobs/month) | ~€0.10/month |
| Crawlee hosting (Railway) | Included in backend cost |
| JSearch RapidAPI (optional, for Google for Jobs) | Free tier: 500 req/month; Paid: ~€20/month |
| Stellenticket partnership | Likely free in exchange for attribution |
| **Total month 1** | **< €5/month** |

---

## What to NOT Do

| Temptation | Why to Avoid |
|---|---|
| Scrape LinkedIn at scale | LinkedIn actively blocks scrapers, sends legal threats, and their ToS prohibits it. The occasional crawl is low-risk; systematic scraping at scale is not. |
| Build a "post jobs directly to Agora" employer feature in v1 | No employer will post to a platform with zero users. Classic cold-start mistake. Solve supply with scraping first. |
| Buy a commercial job data feed on day 1 | Not needed. Free sources (BA + Arbeitnow + ATS feeds) will give you 10,000+ Berlin jobs in week 1. Buy commercial data only when free sources prove insufficient. |
| Try to get a "formal agreement" with Bundesagentur für Arbeit | Not necessary. The API is public and widely used. No agreement needed. |
| Store LinkedIn job descriptions in your DB | LinkedIn jobs redirect to LinkedIn to apply. You'd be storing their content without providing the apply URL (which requires LinkedIn login). Skips them. |

---

## Summary: Your Day 1 Action Items

1. **Test Arbeitsagentur API with curl** — copy the command from Section 1a, run it in terminal, verify you get Berlin job JSON back. This takes 2 minutes and proves the source works.
2. **Test Arbeitnow API** — `curl https://www.arbeitnow.com/api/job-board-api` and read the response. Also takes 2 minutes.
3. **Test one Greenhouse endpoint** — pick a Berlin company you know uses Greenhouse (e.g. HelloFresh: `curl https://boards-api.greenhouse.io/v1/boards/hellofresh/jobs`) and see their live jobs.
4. **Create the jobs table** in your Neon PostgreSQL DB using the schema above (with Drizzle migration).
5. **Draft email to Arbeitnow founder** — one paragraph, introduce Agora, ask about a custom private API arrangement.

Within 1 week of starting this, you can have 10,000+ Berlin jobs in your database. Within 3 weeks, you can have 30,000+. The data is there. The question is only engineering and prioritization.

---

*This document should be treated as a living reference. As partnerships are confirmed or denied, and as new sources are discovered, update the tier classification accordingly.*
