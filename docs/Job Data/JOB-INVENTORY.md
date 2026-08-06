# Job Inventory — every number, measured

**Measured 2026-08-06** against the live Neon database and live source endpoints. Every figure here was queried, not estimated, unless the row says "estimate". Re-run instructions are in §8 so this file can be refreshed rather than trusted forever.

Companion documents: [README.md](README.md) (the plan and the decisions), [LEGAL-POSTURE.md](LEGAL-POSTURE.md) (what we may ingest and store).

---

## 1. Headline

| | |
|---|---:|
| Jobs in the database | **931** |
| Distinct companies | **512** |
| Active (`is_active = true`) | 931 (100%) |
| **Embedded — i.e. actually matchable** | **718 (77%)** |
| Beta target | **10,000** |
| Progress to target | **9.3%** |
| Jobs measured as available today from sources we already call | **≈47,000** |

The supply does not have to be found. It has to be fetched.

---

## 2. What is in the database right now

| Source | Jobs | Active | Embedded | Companies | Last scraped | Age |
|---|---:|---:|---:|---:|---|---:|
| `arbeitsagentur` | 389 | 389 | 389 | 125 | 2026-07-12 | 24 days |
| `arbeitnow` | 319 | 319 | 319 | 225 | 2026-07-12 | 24 days |
| `tu_berlin` | 128 | 128 | **0** | 90 | 2026-08-04 | 2 days |
| `berlin_startup_jobs` | 70 | 70 | **0** | 56 | 2026-08-03 | 1 day |
| `jobicco` | 15 | 15 | **0** | 15 | 2026-08-03 | 1 day |
| `seed` (test fixtures) | 10 | 10 | 10 | 10 | 2026-06-10 | 56 days |
| `company_ats` (built 2026-08-06) | **0** | — | — | — | never run | — |
| **Total** | **931** | **931** | **718** | **512** | | |

Two things to read off this table:

- **213 jobs (23%) have no embedding.** The match query filters `job_embedding IS NOT NULL`, so those rows exist in the database and are invisible to every user. All three affected sources were added after the last embedding run.
- **The 10 `seed` rows are test fixtures** from 10 June, still marked active and still matchable. They should be deleted before beta.

### Freshness

| Age | Jobs | Share |
|---|---:|---:|
| 1 day | 128 | 14% |
| 2 days | 85 | 9% |
| **24 days** | **708** | **76%** |
| 56 days | 10 | 1% |

76% of the database was last confirmed on 12 July. Nothing marks a vanished job dead — `is_active` is never set to false by anything — so an unknown fraction of those 708 are already filled or expired.

---

## 3. What the data looks like

**Contract type**

| Type | Jobs | Share |
|---|---:|---:|
| teilzeit | 531 | 57% |
| werkstudent | 231 | 25% |
| vollzeit | 112 | 12% |
| praktikum | 29 | 3% |
| minijob | 17 | 2% |
| freelance | 11 | 1% |

**German level required**

| Level | Jobs |
|---|---:|
| none | 504 |
| B2 | 121 |
| A2 | 117 |
| C1 | 100 |
| C2 | 49 |
| B1 | 33 |
| null | 7 |

**Enrollment requirement:** 260 require enrollment, 671 do not.

**Description length:** 2,811 characters average; 10 jobs under 200 characters.

**Location strings are not normalized.** `Berlin` (293), `Berlin 10179` (63), `Berlin 10178` (54), `Berlin 10243` (50), `Deutschland, Berlin` (40), `Deutschland, Berlin, Charlottenburg` (28), `Berlin 13353` (22) are seven distinct values for one city. Geo-filtering on this will silently drop jobs.

---

## 4. What is available at each source

### 4.1 Bundesagentur für Arbeit — Berlin, 25 km radius

Measured live via `maxErgebnisse` on the v6 search endpoint.

| Segment | API parameter | Available |
|---|---|---:|
| Arbeit — all working hours | `angebotsart=1` | **42,066** |
| ├ part-time + Minijob | `angebotsart=1&arbeitszeit=tz;mj` | 13,699 |
| └ full-time | `angebotsart=1&arbeitszeit=vz` | 35,254 |
| Ausbildung | `angebotsart=4` | **3,679** |
| Praktikum / Trainee | `angebotsart=34` | **746** |
| Selbstständigkeit | `angebotsart=2` | 385 |
| **Total addressable** | | **≈46,876** |

(Part-time and full-time sum to more than the "all" figure because a posting can be flagged as both.)

We currently ingest **389** of these — 0.9%. Cause: `page=1` is hardcoded in [scrape-arbeitsagentur.ts:48](../../apps/workers/src/jobs/scrape-arbeitsagentur.ts#L48) and `BA_DETAIL_CAP` defaults to 500. Pagination verified working to page 50 at 100 results per page.

**Ausbildung (3,679) and Praktikum (746) are entirely unexploited** — two segments, free, in an API we already call.

### 4.2 Arbeitnow

| Metric | Value |
|---|---:|
| Jobs across the first 10 API pages | 1,075 |
| Of those, Berlin or remote | **424 (39%)** |
| Rate limit hit | HTTP 429 at page 11 with 1.2 s spacing |
| Currently in our database | 319 |

The full catalogue is larger than 1,075; measuring it properly means respecting a slower cadence. Our scraper already uses a 3 s delay across 15 pages, which is the right shape — it simply hasn't run since July.

### 4.3 Company career pages (ATS) — 32 companies, measured 2026-08-06

Every row below was fetched live. "In scope" = location matches Berlin or remote.

| Company | ATS | Berlin/remote | Total posted |
|---|---|---:|---:|
| Enpal | ashby | **155** | 236 |
| N26 | greenhouse | 49 | 82 |
| SumUp | greenhouse | 48 | 370 |
| Doctolib | greenhouse | 45 | 156 |
| Flix | greenhouse | 43 | 141 |
| GetYourGuide | greenhouse | 35 | 51 |
| Raisin | greenhouse | 28 | 36 |
| Solaris | greenhouse | 27 | 34 |
| HelloFresh | greenhouse | 23 | 336 |
| Celonis | greenhouse | 21 | 249 |
| Scout24 | greenhouse | 21 | 25 |
| MOIA | greenhouse | 17 | 22 |
| Zenjob | ashby | 15 | 15 |
| kfzteile24 | recruitee | 15 | 22 |
| Grover | greenhouse | 11 | 11 |
| Forto | ashby | 10 | 12 |
| Lemon Markets | ashby | 9 | 17 |
| rebuy | recruitee | 8 | 8 |
| Staffbase | greenhouse | 8 | 31 |
| commercetools | greenhouse | 7 | 21 |
| IONOS | greenhouse | 7 | 27 |
| Flaconi | greenhouse | 6 | 8 |
| Wunderkind | greenhouse | 6 | 10 |
| Choco | ashby | 4 | 11 |
| everphone | personio | 4 | 5 |
| Urban Sports Club | greenhouse | 3 | 4 |
| Billie | ashby | 2 | 2 |
| Trade Republic | greenhouse | 1 | 1 |
| Babbel | ashby | 1 | 2 |
| Contentful | greenhouse | 0 | 27 |
| Personio | personio | 0 | 1 |
| klarx | personio | 0 | 1 |
| **Total** | | **629** | **1,974** |

Average: **19.7 Berlin/remote jobs per company.** At 300 companies that is roughly 5,900 jobs, arriving within an hour of being published.

Detection hit rate on the first 40-domain sweep: **24 resolved to a readable feed (60%)**, 2 sat on an ATS we don't read yet (Workable, Teamtailor), 14 run something custom.

### 4.4 Curated and university sources

Volumes are as-last-scraped; source-side availability was not re-measured.

| Source | In database | Note |
|---|---:|---|
| tu_berlin | 128 | 2 days old, not embedded |
| berlin_startup_jobs | 70 | 1 day old, not embedded |
| jobicco | 15 | 1 day old, not embedded. Research notes claim their URLs 404 — contradicted by these 15 rows; one of the two is stale |

### 4.5 Sources not yet integrated

| Source | Estimated volume | Basis |
|---|---:|---|
| Stellenticket (5 Berlin universities) | 5,000–8,000 | Estimate from `Job-Data-Sources.csv`. Partnership-first per the 2026-08-06 decision |
| ATS registry grown to 300 companies | 4,000–6,000 | Extrapolated from the measured 19.7/company |
| Adzuna / Jooble / Talent.com / WhatJobs | 1,000–3,000 | Estimate. Deferred until the first-party layer works |
| BA Ausbildung + Praktikum | **4,425** | **Measured** — see §4.1 |

---

## 5. The gap

| Layer | In DB now | Available now | Status |
|---|---:|---:|---|
| Bundesagentur für Arbeit | 389 | **46,876** | Built, paginating page 1 only |
| Arbeitnow | 319 | 424+ Berlin/remote | Built, not running since 12 July |
| Company career pages (32) | 0 | **629** | Built 2026-08-06, never run |
| tu_berlin | 128 | — | Built, running |
| berlin_startup_jobs | 70 | — | Built, running |
| jobicco | 15 | — | Built, running |
| seed fixtures | 10 | — | **Delete before beta** |
| **Total** | **931** | **≈48,000** | |

**Reaching 10,000 requires no new source.** It requires: run the workers, paginate BA, run the ATS scraper once, embed the backlog.

---

## 6. Legal standing of each source

Full detail and live robots.txt findings in [LEGAL-POSTURE.md](LEGAL-POSTURE.md).

| Source | Verdict |
|---|---|
| Bundesagentur für Arbeit | 🟢 Ingest — public API. No published terms; email BA for an explicit OK |
| Arbeitnow | 🟢 Ingest — attribution + backlink required (unverified in our UI) |
| Greenhouse / Ashby / Lever / Personio | 🟢 Ingest — robots permit our paths, checked 2026-08-06 |
| Recruitee / Workday | 🟡 Per-tenant robots check required before adding any tenant |
| SmartRecruiters | 🔴 `Disallow: /` except LinkedInBot. Adapter deleted from the codebase |
| StepStone / Indeed / XING / LinkedIn | 🔴 No lawful data-out path |
| Adzuna / Jooble / Talent.com | 🟢 Lawful, free, and they pay per outbound click |

Two open compliance gaps that scale with volume: full ad text is stored (decision taken — keep, and put the specific question to the German lawyer), and recruiter names inside descriptions have no documented legal basis or redaction pass.

---

## 7. Costs at 10,000 jobs

| Item | Estimate |
|---|---|
| Embedding input | ≈7M tokens one-off, plus deltas — small money at current embedding rates; **confirm the live Cohere rate before the first full run** |
| Postgres storage | ~30 MB of text plus 10k × 1024-dim vectors — negligible on Neon |
| HNSW index | Comfortable at this scale; revisit past ~1M rows |
| BA API requests | ~10,000 detail fetches per full refresh, ~20–40 min at concurrency 8. Free |
| ATS requests | 1 request per company per hour, plus details on Workday only. Free |
| **Real cost driver** | Not ingestion — it's generation. More jobs → more swipes → more CV/cover-letter runs |

---

## 8. How to reproduce these numbers

**Database inventory** — a `tsx` script under `apps/workers/scripts/` importing `../src/env` and `getDb()`:
```sql
select source, count(*) n, count(*) filter (where is_active) active,
       count(job_embedding) emb, count(distinct company) companies, max(scraped_at)::date last
from jobs group by source order by n desc;
```

**Bundesagentur availability** — `maxErgebnisse` is the total, so `size=1` is enough:
```bash
curl -H "X-API-Key: jobboerse-jobsuche" \
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs?wo=Berlin&umkreis=25&angebotsart=1&size=1&page=1"
```

**ATS per-company yield** — dry-run every registry entry through the adapters and normalizer without writing to the database:
```bash
pnpm --filter @agora/workers exec tsx scripts/run-ats.ts   # real run, writes to DB
```

**ATS detection on new domains:**
```bash
pnpm --filter @agora/workers exec tsx scripts/detect-ats.ts --file domains.txt
```

## 9. What these numbers do not tell you

- **Cross-source duplicates are not measured.** Dedup is `(externalId, source)`, so the same job from BA and Arbeitnow is two rows. The 931 figure is rows, not distinct jobs. This gets worse the moment a CPC network is added.
- **Availability is not yield.** BA's 42,066 includes jobs our filters will reject; the realistic capture is 8,000–13,000.
- **"Active" means nothing today.** Nothing ever sets `is_active = false`, so 100% active is an artefact, not a fact about the market.
- **Source-side volumes for tu_berlin, Berlin Startup Jobs and jobicco were not re-measured** — only what is already in the database.
