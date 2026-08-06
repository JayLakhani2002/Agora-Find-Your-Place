# Job Data — the single folder for job supply

Everything about where Agora's jobs come from lives here. Measured against the live database and live endpoints on **2026-08-06**; every number below was checked, not estimated, unless it says "estimate".

## Index

| File | What it is |
|---|---|
| **README.md** (this file) | Status, the plan to 10,000 jobs, decisions taken |
| **JOB-INVENTORY.md** | **Every number, measured**: what we hold per source, what each source has available, the gap, costs, how to re-measure |
| **LEGAL-POSTURE.md** | The operating rulebook: what we may ingest, what we may store, where we currently break our own rules |
| **RESEARCH-VERIFIED-SOURCE-INVENTORY.md** | Source-by-source verdicts + robots.txt findings (research, 2026-08-03) |
| **RESEARCH-JOB-DATA-SOURCES.md** | Full research reports incl. German/EU case-law citations |
| **Job-API-Documentation.md** | Endpoint reference: URLs, auth, params, curl examples, response shapes |
| **Job-Data-Sources.csv** | Source matrix: priority, cost, volume, refresh cadence, outreach contacts |
| **Data Mining.md** | The original sourcing strategy (tiers 1–4) |
| **agora-oddjobs-sourcing-strategy.md** | Odd-jobs / gig segment: hospitality, warehouse, gig-platform cards |
| **job-explorer/** | Standalone prototype server for poking at sources by hand |

Related, deliberately left where they are: [`docs/Agents/CLAUDE_ingestionagent.md`](../Agents/CLAUDE_ingestionagent.md) (Agent 3 spec), [`docs/Prototype/04-Phase-2-Job-Ingestion.md`](../Prototype/04-Phase-2-Job-Ingestion.md) (phase plan), [`docs/scope/research/TSENTA-KEY-FINDINGS.md`](../scope/research/TSENTA-KEY-FINDINGS.md) (competitor teardown).

---

## 1. Where we are today

**931 jobs. 512 companies. 718 embedded. Target for beta: 10,000.**

Full per-source breakdown, availability at every source, and the cost model: **[JOB-INVENTORY.md](JOB-INVENTORY.md)**.

| Source | Rows | Embedded | Last scraped |
|---|---:|---:|---|
| arbeitsagentur | 389 | 389 | 2026-07-12 |
| arbeitnow | 319 | 319 | 2026-07-12 |
| tu_berlin | 128 | **0** | 2026-08-04 |
| berlin_startup_jobs | 70 | **0** | 2026-08-03 |
| jobicco | 15 | **0** | 2026-08-03 |
| seed (fixtures) | 10 | 10 | 2026-06-10 |
| **company_ats** (new) | **0 — built, never run** | — | — |

Three things this table says out loud:

1. **The workers are not running.** The two biggest sources were last touched on 12 July. The nightly BullMQ repeat exists in code; nothing is executing it. Every freshness claim we make is currently false.
2. **213 jobs have no embedding.** They cannot appear in any match result — the vector query filters `job_embedding IS NOT NULL`. A fifth of the database is invisible to the product.
3. **We are at 9.3% of the beta target**, and the reason is not a lack of sources. It is one hardcoded line — see below.

Other measured facts: average description length 2,811 characters; 10 jobs have descriptions under 200 chars; location strings are inconsistent (`Berlin`, `Berlin 10179`, `Deutschland, Berlin, Charlottenburg` are all separate values), which will hurt filtering.

---

## 2. The gap to 10,000 — the volume math

Live counts from the Bundesagentur für Arbeit API today, Berlin + 25 km:

| Query | Available jobs |
|---|---:|
| `arbeitszeit=tz;mj` (part-time + Minijob) | **13,699** |
| `arbeitszeit=vz` (full-time) | **35,254** |

**The 10,000 target is reachable from one source we already have working.** Our BA scraper pulls 389 of those 13,699 — because [`scrape-arbeitsagentur.ts:48`](../../apps/workers/src/jobs/scrape-arbeitsagentur.ts#L48) hardcodes `page=1` and never paginates, and `BA_DETAIL_CAP` stops at 500 detail fetches per run. I verified pagination works to page 50 at 100 results per page (5,000 rows deep, no degradation).

Everything else is diversification, resilience and quality — not volume. Which matters, because a database that is 95% one source dies the day that source changes its API.

Realistic contribution per source once each is running properly:

| Layer | Source | Est. Berlin volume | Confidence |
|---|---|---:|---|
| Official API | Bundesagentur für Arbeit | 8,000–13,000 | **Measured** (13,699 available) |
| Official API | Arbeitnow | 300–800 | Measured 319 at current caps |
| Career pages | ATS registry, 32 companies | ~630 | **Measured** (365 verified + 264 from newly added slugs) |
| Career pages | ATS registry at 300 companies | 4,000–6,000 | Estimate at ~20 jobs/company measured average |
| University | tu_berlin | 128 | Measured |
| Curated | berlin_startup_jobs, jobicco | 85 | Measured |
| CPC backfill | Adzuna / Jooble / Talent.com | 1,000–3,000 | Estimate — not yet integrated |

---

## 3. The plan, step by step

Ordered by jobs-per-hour-of-work. Steps 1–3 get us past 10,000; the rest is durability.

### Step 1 — Deploy and actually run the workers *(blocker, half a day)*
Nothing below matters until the BullMQ scheduler is running somewhere permanent. The nightly repeat (02:00 Europe/Berlin) and the new hourly ATS repeat are already registered in [`index.ts`](../../apps/workers/src/index.ts); they need a host and a Redis instance that stays up. **Impact: the difference between a live product and a July snapshot.**

### Step 2 — Paginate the BA scraper *(one file, ~1 hour, +8,000–12,000 jobs)*
Loop `page` until `maxErgebnisse` is exhausted or a configured ceiling is hit, and raise `BA_DETAIL_CAP` to match. Cost is one detail request per job; at concurrency 8 with a polite delay, 10,000 details run in roughly 20–40 minutes — a nightly job, not a real-time one. **This single change is the 10,000-job plan.** Needs a decision first: full-time too, or student segments only (question 2 below).

### Step 3 — Embed the backlog and keep it embedded *(~1 hour, unlocks 213 jobs + everything new)*
`embedPendingJobs()` exists and works; it has not run since the last two scrapers landed. Chain it after every scrape cycle (already wired) and run it once manually for the backlog. At 10,000 jobs the embedding input is roughly 7M tokens — small money at any current embedding price, but confirm the live rate before the first full run rather than after.

### Step 4 — Grow the ATS registry from 32 to 300+ companies *(ongoing, +4,000–6,000 jobs)*
The machinery is built and running: [`detect-ats.ts`](../../apps/workers/scripts/detect-ats.ts) takes company domains and returns verified registry rows. The input it needs is a list of DACH company domains — Handelsregister exports, Kununu/Crunchbase Berlin lists, the Berlin Partner company directory, IHK member lists. Measured hit rate on the first sweep: **24 of 40 domains** resolved to a readable feed. At ~20 Berlin/remote jobs per company, 300 companies ≈ 6,000 jobs, arriving within an hour of being posted.

### Step 5 — Freshness and expiry *(~2 hours)*
Nothing currently marks a job dead. A job that vanishes from its source stays `is_active = true` forever, so the deck slowly fills with expired listings — the single fastest way to lose user trust. Rule from the source matrix: deactivate when a job has not been seen in a source response for 60 days. Cheaper and better: mark inactive when a full successful scrape of its source no longer returns it.

### Step 6 — Normalize locations *(~2 hours)*
`Berlin 10179` and `Deutschland, Berlin, Charlottenburg` should both filter as Berlin. Parse to `{ city, postcode, district, remote }` at ingest. Blocks clean geo-filtering in the swipe deck.

### Step 7 — CPC backfill networks *(~1 day each, +1,000–3,000 jobs, and they pay us)*
Adzuna, Jooble, Talent.com and WhatJobs want publishers to display their listings and pay per outbound click. Free keys, attribution required, and they are a hedge: if BA changes its API, discovery still works. This is also the only lawful route to StepStone-class inventory.

### Step 8 — Partnerships *(weeks, highest quality)*
Stellenticket (all five Berlin universities, 5,000–8,000 pre-qualified student listings) is the highest-value target in the entire plan — employers there explicitly want students. Contacts are already researched in `Job-Data-Sources.csv`: `info@jobicco.berlin` for Stellenticket/jobicco, `contact@arbeitnow.com` for Arbeitnow.

---

## 4. What we capture per job

Current schema ([`packages/db/src/schema.ts`](../../packages/db/src/schema.ts)): `externalId`, `source`, `sourceUrl`, `title`, `company`, `location`, `contractType`, `hourlyRate`, `hoursPerWeek`, `germanLevelRequired`, `requiredSkills[]`, `requiresEnrollment`, `allowedVisaTypes[]`, `description`, `jobEmbedding` (1024-dim), `scrapedAt`, `isActive`.

Dedup is `(externalId, source)` where `externalId` is a SHA-256 of company + title + first 200 chars of description. **Note the limitation: the same job from two different sources produces two rows**, because `source` is part of the unique key. Cross-source dedup does not exist yet and will matter once BA, Arbeitnow and a CPC network all carry the same listing. Budget for it before step 7.

Segments covered today: Werkstudent, Minijob, Teilzeit, Vollzeit, Praktikum, Freelance. Not covered: Ausbildung (BA `angebotsart=4` — a whole segment we are ignoring), gig-platform signup cards (see the odd-jobs strategy doc).

---

## 5. What this changes downstream

Going from 931 to 10,000+ jobs is not a free upgrade — it moves load onto four other systems:

- **Matching (Agent 5).** HNSW over 10k vectors is comfortable; the risk is relevance, not speed. With 35k full-time roles in the pool, a Werkstudent's deck fills with jobs they cannot legally take unless `requiresEnrollment` and the contract-type filters are strict. Test the deck at volume before launch.
- **Classification quality.** Every job is classified by regex, not an LLM. Two bugs surfaced the moment company career pages were added: unmatched postings defaulted to `werkstudent` (which flips `requiresEnrollment`, a legal filter, on Director-level roles), and substring skill matching tagged jobs with Go from "goals" and Rust from "trust". Both are fixed. At 10,000 jobs from more varied sources, expect more of this class of bug — the classifier deserves an eval set.
- **Cost.** Embeddings are cheap. Storage is cheap. The real cost is generation: more jobs means more swipes means more CV/cover-letter runs.
- **Legal exposure scales with volume.** 931 jobs is a prototype. 10,000 jobs published to users is a product, and the posture in `LEGAL-POSTURE.md` has to be real by then, not aspirational.

---

## 6. Missing links found in the repo

Things that were built or researched and then lost track of:

1. **`scrape-stellenticket.ts` is deleted** (uncommitted, still in git HEAD). A working Playwright crawler for the highest-value student source, gone with no note explaining why. Decision needed.
2. **22 verified ATS slugs sat unused in `Job-API-Documentation.md`** while the new registry was seeded from scratch. I re-verified all of them: 11 are live with Berlin/remote roles and are now in the registry; wooga, heycar and preply have live boards with zero Berlin roles today; Delivery Hero was dropped on robots.txt grounds.
3. **The research doc says Personio returns "307 → Vercel Security Checkpoint" and rules it out.** That is wrong — Personio feeds work fine. The 307 only happens for tenants that do not exist. We have three Personio companies ingesting today.
4. **The research doc says jobicco returns 404 for all category URLs** — yet the jobicco scraper has 15 live jobs in the database. One of the two is stale; worth five minutes to find out which.
5. **BA `angebotsart=4` (Ausbildung) is documented and never used.** An entire segment, free, in a source we already call.
6. **Two job-data research docs were filed under `docs/scope/research/`** instead of with the rest of the job-data material. Moved here; inbound links updated.

---

## 7. Decisions taken (Jay, 2026-08-06)

1. **Job text: keep it, get legal sign-off.** Full ad text stays in the database for embeddings and CV tailoring; only a snippet plus an apply-link is ever published. Rule 4 in `LEGAL-POSTURE.md` is amended accordingly, and Gap 1 becomes a named item for the German legal review rather than an engineering change.
2. **Volume mix: everything Berlin, full-time included.** ~49,000 BA jobs are in scope, not just the 13,699 student-eligible ones. **This makes `requiresEnrollment` and contract-type classification load-bearing** — a Werkstudent must never see a role they cannot legally take. The classifier eval set in §5 is now a prerequisite, not a nice-to-have.
3. **CPC backfill: after the first-party layer works.** Adzuna/Jooble/Talent.com wait until BA pagination, embeddings and ATS expansion are done. Cross-source dedup (§4) must land before the first backfill network is switched on.
4. **Stellenticket: partnership first.** The deleted crawler stays deleted — that deletion is now intentional, not an accident. Approach is an email to `info@jobicco.berlin` proposing attribution plus apply-clicks back to them. Revisit crawling only if the partnership is refused.

---

## 8. The Tsenta-class system — target architecture

Tsenta advertises a 2M+ job database. The [teardown](../scope/research/TSENTA-KEY-FINDINGS.md) infers a crawler fleet doing exactly what we are building: scheduled ATS/career-page polling with diffing into a jobs DB. The difference between us and them is coverage and time, not technique — and we have a legal posture that is harder to attack in the EU.

Target shape, in the order the layers should be built:

| Layer | What it is | Status |
|---|---|---|
| 1 — Career pages | ATS adapters + company registry + auto-detector | **Built.** 5 adapters, 32 companies, hourly |
| 2 — Official APIs | BA, Arbeitnow | Built, under-used (step 2) |
| 3 — Curated/university | tu_berlin, Berlin Startup Jobs, jobicco, Stellenticket | 3 of 4 built |
| 4 — CPC backfill | Adzuna, Jooble, Talent.com, WhatJobs | Not started (step 7) |
| 5 — User-initiated capture | The user's own browser fetches a listing they are looking at | Not started — the only lawful route to StepStone/Indeed/LinkedIn inventory |

The pieces that turn a set of scrapers into a crawler fleet, none of which exist yet:

- **A source registry table in the database** rather than constants in TypeScript, so a source can be paused, rate-limited or marked failing without a deploy.
- **Per-source health monitoring.** Right now a source returning zero jobs logs a warning that nobody reads. It should page: "arbeitnow returned 0 for 2 consecutive runs".
- **Diffing rather than re-upserting.** We rewrite every row every run. Diffing gives us "new since your last visit", which is the actual product feature behind the Google Alerts trick this started from.
- **Cross-source dedup** (see §4).
- **A robots.txt cache** consulted before every new host, so the SmartRecruiters class of mistake is caught by the machine and not by a human reading a table.
