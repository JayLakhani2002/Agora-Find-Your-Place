# Job Data Sources — Full Research Reports (2026-08-03)

Three parallel research passes behind [PROJECT-SCOPE.md §8.4](PROJECT-SCOPE.md). All HTTP statuses were live-tested on 2026-08-03. Anything unconfirmed is marked UNVERIFIED.

- Report 1 — Official & aggregator job APIs (Germany)
- Report 2 — Direct ATS endpoints + enumeration + German/EU legality
- Report 3 — Backfill economy + student/internship/Ausbildung sources

---

## Report 1 — Official & aggregator job APIs (Germany/DACH)

**Recommended core stack: BA Jobsuche API (all segments incl. Ausbildung/Praktikum) + Arbeitnow (English-speaking/startup jobs) + Adzuna or Jooble as redundancy.** The big boards (StepStone, Indeed, XING, LinkedIn) offer nothing a startup can pull jobs FROM — plan without them.

| Source | Access model | Cost | Segments (DE) | Freshness | Commercial/redistribution | Confidence |
|---|---|---|---|---|---|---|
| BA Jobsuche API | Open; public key `jobboerse-jobsuche` in `X-API-Key` header; no registration | Free | ALL: Arbeit (1), Selbständigkeit (2), Ausbildung/Duales Studium (4), Praktikum/Trainee (34); Werkstudent via keyword — **live-verified** | Live DB, largest in DE | No published API terms; general portal ToU free for any person. No explicit commercial grant — UNVERIFIED, tolerated in practice | High (tech), Med (legal) |
| BA Ausbildungssuche API | Open; key `infosysbub-absuche` | Free | Training/Bildungsangebote (courses, Umschulung, BvB) — NOT company apprenticeship vacancies (those are in Jobsuche angebotsart=4) | Live — verified 200 | Same as above — UNVERIFIED | High (tech), Med (legal) |
| EURES | No official public API; reverse-engineered portal API (anonymous), community docs current to Apr 2026 | Free | 2M+ EU postings; German inventory = BA-fed, so overlaps Jobsuche | Near-live (BA syncs national vacancies under Reg. 2016/589) | ELA legal notice: reuse authorized with attribution; API unofficial/unstable — no SLA | Medium |
| Adzuna API | Self-serve API key | Free tier: 25/min, 250/day, 2,500/mo; commercial license after 14-day trial | Germany covered (adzuna.de); categories incl. part-time/graduate; student depth thin | Aggregated, daily-ish | Display allowed with mandatory "Jobs by Adzuna" attribution + backlinks; bulk extraction/resale prohibited | High |
| Jooble API | Free key via form (instant GUID); POST JSON | Free | 69 countries incl. DE; all types, student jobs present | Aggregated, daily | Display with backlinks; monetized via affiliate/CPC | Medium |
| Careerjet | Partner account + affiliate ID; public search API + XML feeds | Free (CPC revenue share, 20% commission) | de_DE, de_AT, de_CH; broad aggregate incl. student roles | Aggregated | Display with affiliate links back to Careerjet | Medium |
| Talent.com | Publisher program; self-serve backfill API + XML feed | Free, CPC payout | 30M+ jobs, 79 countries incl. DE | Real-time claimed | Backfill/display with tracked links | Medium |
| Arbeitnow | Fully open REST API, no key — **live-verified** (200, 50 req/min) | Free | German-focused: verified Praktikum, Werkstudent, visa-sponsorship tags; English-speaking + startup skew | Verified: newest posting = same day | Free use with attribution/backlink — exact license text UNVERIFIED | High |
| The Muse API | Public; 500 req/h anon, 3,600 req/h with free key | Free | Levels incl. Internship/Entry; DE locations exist but US-centric — thin for DACH | Daily | Public commercial integration per their API terms | High (access), Low (DE depth) |
| WhatJobs | Publisher program; FeedAPI (REST JSON/XML) + daily XML dump | Free, CPC per valid click | de.whatjobs.com; aggregate incl. student — depth UNVERIFIED | Must pull ≥4×/24h per terms | Display with tracked links | Medium |
| Jobrapido | Partner program is XML INTO Jobrapido; no data-out API | n/a | n/a | n/a | Outbound data not offered — drop | Medium |
| StepStone | **No outbound API.** api.stepstone.com = inbound only (feeds, ATS connectors, Apply API) | n/a | n/a | n/a | Pulling listings = scraping, not licensed | High |
| Indeed | Publisher API dead (2023). Remaining: partner-gated GraphQL (Job Sync, Indeed Apply) — sales-led, aimed at ATS/staffing | Gated | n/a | n/a | No self-serve keys; startups realistically excluded | High |
| XING / onlyfy | Public XING API closed to new registrations (~2018); onlyfy = ATS, partners post INTO it | n/a | n/a | n/a | No data-out path | Med-High |
| LinkedIn | Job Posting API = partner program for established ATS vendors; no job-search/read API | Gated | n/a | n/a | Scraping prohibited; only path is Talent Solutions partnership | High |

### Key notes

1. **BA Jobsuche API** — `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs` (v4 now 404, v6 live; v3/v7 → 403). Header `X-API-Key: jobboerse-jobsuche`. Detail endpoint uses base64-encoded refnr. `angebotsart=4` returns real Ausbildung vacancies (verified); `=34` = Praktikum/Trainee; Werkstudent appears under PRAKTIKUM_TRAINEE via keyword (verified). Germany's largest job DB; the only single source covering every segment. Legal caveat: the key is BA's own app's public client key; bund.dev/bundesAPI is community documentation; BA publishes no API-specific commercial terms — email BA for explicit OK, architect so a key change can't kill discovery. Also exists: Bewerberbörse API (candidate profiles) — interesting later, higher GDPR stakes.
2. **BA Ausbildungssuche API** — `https://rest.arbeitsagentur.de/infosysbub/absuche/pc/v1/ausbildungsangebot`, key `infosysbub-absuche`, verified 200. Returns *Bildungsangebote* (provider courses), not company vacancies — for Ausbildungsstellen use Jobsuche `angebotsart=4`.
3. **EURES** — community docs: github.com/rorar/EURES-API-Documentation. German inventory is BA-fed → adds EU-wide coverage, not extra German jobs. Redundancy only.
4. **Aggregators** — Adzuna: only one with published free-tier numbers + clean self-serve (developer.adzuna.com); free tier covers a nightly Berlin sync in beta. Jooble (jooble.org/api/about) and Careerjet are free CPC-model backfills. Talent.com: talent.com/publishers. **Arbeitnow (arbeitnow.com/api/job-board-api) is the best free German-specific source** — open, same-day fresh, tagged internship/student/visa-sponsorship, English-speaking skew matches the launch persona exactly. The Muse: skip for DACH. Jobrapido: drop.
5. **Big boards** — all inbound-only or partner-gated. What Agora CAN do later is *post* or receive applications as ATS-side partner — not pull inventory. Competitor apps showing their inventory scrape (ToS breach) or buy resold data (e.g. Techmap/jobdatafeeds.com — paid).

**UNVERIFIED:** BA commercial-use permission (cheap to resolve — ask BA); Arbeitnow exact license text; WhatJobs DE depth; onlyfy partner specifics; Adzuna DE probe (auth-fail masked live test; adzuna.de exists).

Sources: [bundesAPI/jobsuche-api](https://github.com/bundesAPI/jobsuche-api) · [bundesAPI/ausbildungssuche-api](https://github.com/bundesAPI/ausbildungssuche-api) · [AndreasFischer1985/arbeitsagentur-apis](https://github.com/AndreasFischer1985/arbeitsagentur-apis) · [bund.dev](https://bund.dev/) · [EURES-API-Documentation](https://github.com/rorar/EURES-API-Documentation) · [EURES legal notice](https://eures.europa.eu/legal-notice_en) · [Adzuna ToS](https://developer.adzuna.com/docs/terms_of_service) · [Jooble API](https://jooble.org/api/about) · [Careerjet client](https://github.com/careerjet/careerjet-api-client-python) · [Talent.com publishers](https://www.talent.com/publishers) · [Arbeitnow API](https://www.arbeitnow.com/api/job-board-api) · [The Muse API v2](https://www.themuse.com/developers/api/v2) · [WhatJobs publisher terms](https://www.whatjobs.com/info/legal/publisher-program-terms/) · [Jobrapido partner program](https://corporate.jobrapido.com/partner-program/) · [api.stepstone.com](https://api.stepstone.com/) · [docs.indeed.com](https://docs.indeed.com/) · [LinkedIn Job Posting API](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview)

---

## Report 2 — Direct ATS endpoints, enumeration, and German/EU legality

### 2.1 ATS endpoint matrix (all live-curled 2026-08-03)

| ATS | Public endpoint pattern | Documented vs reachable | Observed | robots.txt / terms signal | Conf. |
|---|---|---|---|---|---|
| **Greenhouse** | `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true` (+ `/jobs/{id}?questions=true&pay_transparency=true`) | **Documented, explicitly public** — "Job Board data is publicly available, so authentication is not required for any GET endpoints" | 200 JSON, 133 KB (`gitlab`) | API path allowed in robots (`Disallow: /embed/` only). ToU page 404s — UNVERIFIED | High |
| **Greenhouse EU** | `boards-api.eu.greenhouse.io` | — | DNS fail; EU hosts 301 to greenhouse.com | No separate EU public board API | High (negative) |
| **Lever** | `GET https://api.lever.co/v0/postings/{site}?mode=json`; EU: `api.eu.lever.co` | **Documented** (github.com/lever/postings-api) | 200, 1.4 MB (`leverdemo`); EU host 200 | `api.lever.co` robots: `Allow: /, Crawl-delay: 1`. `jobs.lever.co` HTML board blocks named AI crawlers but allows `*` | High |
| **Personio** | `GET https://{tenant}.jobs.personio.de/xml` (also `.com`, `?language=`) | **Documented** (developer.personio.de) | 200 text/xml, `<workzag-jobs>` → `<position>`; bad tenant → 307 | No real robots on tenant hosts. **Feed is opt-in per customer** (Med conf.) | High (endpoint) / Med (opt-in) |
| **SmartRecruiters** | `GET https://api.smartrecruiters.com/v1/companies/{id}/postings` | Reachable anonymously; documented Job Board API needs **Partner API Key** | 200 unauth (`smartrecruiters`, `Bosch`) | **Highest terms risk:** robots = `Allow /v1/companies/` for LinkedInBot only, then `User-agent: * / Disallow: /` — explicit machine-readable opt-out | High |
| **Recruitee (Tellent)** | `GET https://{tenant}.recruitee.com/api/offers` | **Documented** — Careers Site API, no auth | 200 live tenant; 404 non-tenant | `tellent.recruitee.com` robots = blanket `Disallow: /` — **per-tenant robots, check each** | High |
| **Workday** | `POST https://{tenant}.wd{n}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` body `{"appliedFacets":{},"limit":20,"offset":0}` | **Merely reachable — zero public docs** | 200: salesforce (total 808), nvidia, adobe; wrong site → 422; siemens → 401 | Workday ToS bans scraping but its scope = workday.com, pages referencing the terms, Community, Workday APIs — tenant career sites not named, no terms link in career-site HTML. Tenant robots permissive + publishes sitemaps | High (endpoint) / Med (ToS scope) |
| **Ashby** | `GET https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true` | **Documented, no auth** | 200, 524 KB | api host serves no robots; HTML board disallows its own `/api/` but not the API host | High |
| **Workable** | `GET https://apply.workable.com/api/v1/widget/accounts/{shortcode}?details=true` | **Documented** (job-widget article) | 200 (`deel`, `gorillas`) | robots Content-Signal: `search=yes, ai-input=yes, ai-train=no`; empty Disallow | High |
| Workable SPI | `www.workable.com/spi/v3/jobs` | Documented, auth-gated | 401 | Partner Bearer token | High |
| **Teamtailor** | `GET https://{co}.teamtailor.com/jobs.json` and `/jobs.rss` | **Documented** (RSS how-to), no auth | 200 JSON Feed 1.1 with full descriptions | JSON-LD JobPosting on detail pages; authenticated api.teamtailor.com separate | High |
| **Join.com** | No public JSON API (`/api/companies/{slug}` → 401) | Reachable HTML + JSON-LD only | JobPosting JSON-LD on job detail pages | Advertised jobs sitemap is **Cloudflare-403-challenged — fetching = circumvention, do not** | High |
| **d.vinci** | `GET https://{co}.dvinci.de/jobPublication/list.json` (also .xml, RSS) | **Documented** — "job publication api is always public" since ATS 2022.11 | 200 full job array (`momox-jobs`) | Best-documented German-native option | High |
| **softgarden** | `api.softgarden.io/api/rest/v2/frontend/jobboards/{channelID}/jobs` | Documented, **token-gated** | Unauth guesses → 404; HTML board = SPA, 0 JSON-LD | Anonymous per-tenant feed UNVERIFIED — needs browser network capture | Med |
| **onlyfy one / XING (Prescreen)** | `{tenant}.onlyfy.jobs`; detail `content.prescreen.io/...` | Reachable HTML only, undocumented | 200 but 0 JSON-LD (client-rendered React); `/api/jobs` → 404 | No public feed; headless render required | Med |
| **rexx systems** | `{tenant}.rexx-systems.com` portal | Reachable HTML only | `/rss` → 404; `?output=xml` returns HTML; 0 JSON-LD | XML export exists only as configured B2B multiposting feed | Med |
| HeavenHR | — | UNVERIFIED — no public feed located | — | — | Low |
| Jobvite | Per-customer XML feed, opt-in, off by default | Documented as gated | not public | request via careers@jobvite.com | Med |
| Zoho Recruit | getRecords is OAuth; career pages 0 JSON-LD | — | — | — | Med |
| Factorial / Concludis / Talention / BITE | — | UNVERIFIED — no public feed found | — | — | Low |

**JSON-LD JobPosting in raw (non-JS) HTML — measured:** emitted server-side by Lever, Ashby, Workday, Teamtailor, Join.com job detail pages; **absent** on Greenhouse (no schema.org at all), Personio, SmartRecruiters, Workable, softgarden, onlyfy, rexx. Consequence: JSON-LD is only the fallback for Join.com/onlyfy/rexx/softgarden — the rest have clean JSON/XML endpoints.

### 2.2 Company enumeration per ATS

- **Sitemaps:** Workday tenant robots publish per-career-site `siteMap.xml` (verified: full job URL list) — solves jobs-within-tenant, not tenant discovery. Greenhouse has no sitemap (all variants 404). Join.com's is Cloudflare-gated — leave it.
- **Tenant-slug probing (works, cheap):** every platform gives a clean exists/doesn't signal (Personio 200 vs 307; Recruitee/Workable 200 vs 404; Greenhouse/Lever/Ashby 200 vs 404). Seed slugs from company names (Handelsregister, Crunchbase DACH, Kununu/XING employer lists), normalize (strip GmbH/AG, umlaut-fold), probe at 1 req/s with identifying User-Agent + contact URL.
- **Certificate Transparency — dead:** Personio uses a wildcard cert (crt.sh returns 2 names total). Don't build on it.
- **Common Crawl:** index live (CC-MAIN-2026-30) but CDX HTTP API 504'd on wildcard host queries; the columnar index (Parquet via Athena/DuckDB) is the reliable route. UNVERIFIED at test time.
- **Reverse-link discovery (best):** crawl a DACH company-domain list, extract outbound hrefs matching the ATS host patterns (`boards.greenhouse.io|jobs.lever.co|jobs.ashbyhq.com|*.jobs.personio.de|*.recruitee.com|*.teamtailor.com|apply.workable.com|*.myworkdayjobs.com|*.dvinci.de|*.softgarden.io|*.onlyfy.jobs|join.com/companies|jobs.smartrecruiters.com`) → tenant slug + employer identity in one pass. Highest precision, lowest legal profile.
- **Google for Jobs:** Jobs Indexing API restricted to authorized partners (2025); useful as validator only.
- **Tech-detection vendors:** BuiltWith / Wappalyzer sell "sites using X" lists covering the major ATSes. Paid, license-restricted; DACH depth/pricing UNVERIFIED.

### 2.3 German/EU legal summary

- **§44b UrhG (commercial TDM):** permits reproductions of lawfully accessible works for automated analysis (implements Art. 4 DSM 2019/790); copies deleted when no longer needed. Covers crawl-and-index; does **not** license republishing full ad text — republish facts, link out. Opt-out must be **machine-readable** (robots.txt, W3C TDMRep).
- **Kneschke v. LAION:** LG Hamburg 310 O 227/23 dismissed; appeal dismissed OLG Hamburg 10.12.2025 (5 U 104/24) relying cumulatively on §44b and §60d; natural-language reservation held ineffective (secondary sources diverge on exact ratio — read the judgment before relying). BGH revision allowed; pendency as of Aug 2026 UNVERIFIED.
- **Database rights §§87a–e UrhG:** protection needs substantial investment in *obtaining/verifying/presenting*, not creating (BHB v William Hill C-203/02) — individual employer career pages usually fail the threshold; large aggregators clear it. §87b(1) s.2 catches repeated systematic extraction of insubstantial parts. **Innoweb v Wegener (C-202/12):** dedicated meta-search piping user queries into the source's search = re-utilising the whole DB → infringement; don't build that architecture. **CV-Online Latvia v Melons (C-762/19)** — the on-point job-aggregator case: indexing job ads is extraction/re-utilisation but only prohibitable where it risks the maker's ability to recoup investment; linking out and driving applicants to the source cuts against harm. **Ryanair v PR Aviation (C-30/14):** no DB right → contractual restrictions governed by national law.
- **Browsewrap ToS:** under §305 BGB, AGB bind only via concluded contract — fetching a public page concludes none. **BGH "Automobil-Onlinebörse" (I ZR 159/10):** publishing data without technical protection means expecting automated retrieval; no "virtual house right" against bots. **BGH "Flugvermittlung im Internet" (I ZR 224/12):** screen scraping not unfair competition even against clickwrapped AGB; the unfairness threshold is **circumventing technical protection** (IP blocks, CAPTCHAs, bot detection).
- **No EU hiQ:** no ruling affirmatively protecting scraping — the functional equivalents are the three cases above. AI Act Art. 53(1)(c) cements robots.txt/TDMRep as *the* recognized opt-out channel.
- **GDPR:** postings aren't personal data; **recruiter names/emails are**. Basis Art. 6(1)(f) (commercial interests qualify — CJEU C-621/22 KNLTB). **EDPB Guidelines 03/2026 on web scraping** (adopted 07.07.2026, consultation to 30.10.2026): three-step test, precise collection criteria, exclude sites that clearly oppose scraping. Art. 14 applies; Art. 14(5)(b) disproportionate-effort exemption requires documented assessment + public privacy notice naming scraped source categories.

**Operational rule set:**
1. Honor observed machine-readable signals: SmartRecruiters robots = the strongest opt-out in the set — do not ingest (partner key is the legal path). Recruitee robots are per-tenant — check each. Lever: 1 req/s. Workable: `ai-train=no` (we don't train on it).
2. Never evade bot protection (Join.com sitemap) — evasion is the UWG unfairness trigger.
3. Index-and-link, never live meta-search (Innoweb); attribution + outbound links (CV-Online).
4. Store facts (title/location/salary/dates/apply-URL); link for full prose.
5. Rate-limit ≤1 req/s per host, identifying User-Agent with contact URL.
6. Workday: vendor ToS is the weakest claim against us, but the endpoint is undocumented — treat each tenant's robots.txt as governing.
7. Document Art. 6(1)(f) balancing, minimize recruiter personal data, publish an Art. 14(5)(b) notice.

**Open risks to monitor:** BGH revision from OLG Hamburg 5 U 104/24; finalization of EDPB Guidelines 03/2026 after 30.10.2026.

Sources — endpoints: [Greenhouse Job Board API](https://developers.greenhouse.io/job-board.html) · [Lever postings-api](https://github.com/lever/postings-api) · [Personio get_xml](https://developer.personio.de/v1.0/reference/get_xml) · [SmartRecruiters Job Board API](https://developers.smartrecruiters.com/docs/partners-job-board-api.md) · [Recruitee Careers Site API](https://docs.recruitee.com/reference/intro-to-careers-site-api) · [Ashby public job posting API](https://developers.ashbyhq.com/docs/public-job-posting-api) · [Workable job widget](https://help.workable.com/hc/en-us/articles/115012801727) · [Teamtailor RSS](https://support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide) · [d.vinci job publication API](https://static.dvinci-easy.com/files/d.vinci%20job-publication-api.html) · [softgarden dev](https://dev.softgarden.de/career-websites-api/) · [Workday site terms](https://www.workday.com/en-us/legal/site-terms.html). Enumeration: [Google JobPosting](https://developers.google.com/search/docs/appearance/structured-data/job-posting) · [Google Jobs indexing restrictions 2025](https://dstribute.io/job-boards/google-jobs-shake-up-2025-navigating-the-new-indexing-api-restrictions/) · [Common Crawl](http://index.commoncrawl.org/collinfo.json) · [crt.sh](https://crt.sh/). Legal: [§44b UrhG](https://www.gesetze-im-internet.de/urhg/__44b.html) · [§87a UrhG](https://www.gesetze-im-internet.de/urhg/__87a.html) · [§305 BGB](https://www.gesetze-im-internet.de/bgb/__305.html) · [§4 UWG](https://www.gesetze-im-internet.de/uwg_2004/__4.html) · [DSM 2019/790](https://eur-lex.europa.eu/eli/dir/2019/790/oj) · [C-202/12 Innoweb](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A62012CJ0202) · [C-762/19 CV-Online](https://acr.amsterdam/en/ecj-database/c-762-19) · [C-30/14 Ryanair](https://ipkitten.blogspot.com/2015/01/breaking-cjeu-says-that-owner-of-online.html) · [C-621/22 KNLTB](https://curia.europa.eu/juris/liste.jsf?num=C-621/22) · [OLG Hamburg 5 U 104/24 — Bird & Bird](https://www.twobirds.com/en/insights/2025/germany/higher-regional-court-hamburg-confirms-ai-training-was-permitted-(kneschke-v,-d-,-laion)) · [BGH I ZR 159/10](https://dejure.org/dienste/vernetzung/rechtsprechung?Text=I+ZR+159%2F10) · [BGH I ZR 224/12](https://openjur.de/u/691648.html) · [EDPB Guidelines 03/2026 (PDF)](https://www.edpb.europa.eu/system/files/2026-07/edpb_guidelines_2020603_webscraping_v1_en_0.pdf) · [CNIL web scraping](https://www.cnil.fr/en/legal-basis-legitimate-interest-focus-sheet-measures-implement-case-data-collection-web-scraping) · [W3C TDMRep](https://www.w3.org/community/tdmrep/)

---

## Report 3 — Backfill economy + student/internship/Ausbildung sources

### 3.1 Backfill networks (pay publishers per click/application)

| Source | What they provide | How to access | Cost / revenue | German/DACH coverage | Confidence |
|---|---|---|---|---|---|
| **Appcast Exchange** (StepStone-owned) | Employer-paid ads to 30k+ partner sites, 138 countries; XML feeds; CPC/CPA payouts | Partner inquiry; traffic thresholds (not published) | CPC/CPA negotiated | Strong EU via StepStone/Axel Springer; German publisher inventory UNVERIFIED | Medium |
| **Jobg8** | CPC/CPA job traffic exchange; XML feeds | Min ~5,000 uniques/day; quality review; ~$350 integration fee (third-party figure) | ~$0.49/click US avg (third-party); publisher sets sell-side CPC | DE, CH, AT among its largest countries | High (coverage), Med (rates) |
| **Talent.com Publishers** | Custom XML feeds + real-time search API, 78 countries | Self-serve signup, consultant-assisted | CPC, monthly | DE included | High |
| **Jooble Affiliate** | Custom feeds + REST API | Form application | CPC and CPA, Net45 | DE, CH, AT in top-13 markets | High |
| **Adzuna Partners** | Sponsored feeds, white-label, free search API | Self-serve key; partnership team for paid feeds | ~€0.12/valid click for adzuna.de (third-party listing) | adzuna.de ~900k listings; DE + AT | High (program), Med (rate) |
| **WhatJobs Publisher** | Job feed + FeedAPI (JSON/XML); backfill explicitly supported | whatjobs.com/affiliates; public terms | CPC per valid click | DE ops (works with StepStone, Stellenonline, Jobvector); 70+ countries | High |
| **Jobrapido** | XML feed integration | Partner program | Commission/CPC | 58 countries incl. DE | Medium |
| Joveo | Advertiser-side; no public publisher program | Direct inquiry only | UNVERIFIED | Global via clients | Low |
| Veritone Hire (PandoLogic + Broadbean) | PandoExchange "2,000+ publishers"; no self-serve onboarding | Direct inquiry | UNVERIFIED | Broadbean strong in EU | Low |
| Recruitics Reach | Direct-from-employer jobs, unified XML | Partner inquiry form | CPC/CPA negotiated | US-centric; DACH UNVERIFIED | Medium |
| Textkernel Jobfeed (data) | Crawled, deduped, structured postings; dedicated Jobfeed Germany incl. PDF-vacancy parsing | Sales cycle | "From €100/mo" claim is from a competitor site — UNVERIFIED; realistically mid-4-to-5 figures/yr | Excellent DE coverage | High (coverage), Low (pricing) |
| Index Anzeigendaten (data) | DE market leader; 38M+ ads/yr incl. print + BA | Sales; negotiated licenses | Not public; B2B sales tool positioning | Best-in-class DE incl. print | High |
| Lightcast (data) | Global postings dataset, API | Sales; usage-priced | Enterprise; likely infeasible for startup | 165 countries; US-strongest | Medium |

**Takeaway:** open self-serve doors for a new German platform = **Talent.com, Jooble, WhatJobs, Adzuna** (low/no traffic bar) → **Jobg8** at ~5k pageviews/day → **Appcast/Recruitics** at sales-conversation scale. Joveo/Veritone are advertiser-side. The dataset vendors are analytics products, not monetizable backfill.

### 3.2 Student / internship / Ausbildung sources (Germany)

| Source | What they provide | How to access | Cost / revenue | Segment | Confidence |
|---|---|---|---|---|---|
| **BA APIs** | Jobsuche API (Ausbildung + Praktikum via `angebotsart`), Ausbildungssuche, Studiensuche, Weiterbildungssuche; free clientId as X-API-Key | bund.dev / github.com/bundesAPI | Free | Largest Ausbildung DB in DE; community-documented, stability risk | High (free), Med (stability) |
| Ausbildung.de (TERRITORY Embrace) | Syndicates employer ads OUT to "200+ partner websites"; interfaces "generally possible" | No public pull-API; receiving-partner status = contact only, UNVERIFIED | Employers pay | #1 commercial Ausbildung board | Medium |
| Praktikum.info (Funke Works) | Premium postings syndicated into partner network | No public feed; partner inquiry | Unknown | Internships | Medium |
| StudentJob.de / YoungCapital | Employer ads syndicated to partner sites | No public API; direct contact | Unknown | Student jobs, 9 EU countries | Medium |
| Workwise (ex-Campusjäger) | Application-platform model | **No public API or partner program found** | — | Werkstudent/intern/entry | Medium |
| Stellenwerk | 14 university career-center boards | Inbound via multiposting (GOhiring); no outbound feed | Employers pay per post | Student jobs at major universities | Medium |
| Unicum | Multiposts OUT to ~80 partner sites | Receiving-partner status not documented; contact | Employers pay | Students/graduates/Azubis | Medium |
| Berlin Startup Jobs | WordPress board; standard RSS feed exists | RSS | Free | Berlin startup/tech niche | Medium |
| GermanTechJobs.de | No official API; third-party Apify scrapers exist | Scraper (ToS risk) or partnership ask | Apify fees | DE IT niche, salary-transparent | Medium |
| Absolventa (Funke Works) | Inbound multiposting ecosystem; partner portals | No public pull-feed | Employers pay | Graduates/trainees | Medium |
| Jobteaser | Public APIs exist but only for its partner network (800+ universities) | School/company partner only | Employer-paid | Dominant EU university channel | High |

**Takeaway:** the only open, free, programmatic Ausbildung/Praktikum source is the **BA**. All commercial student boards syndicate outward on negotiated terms; none self-serve. Practical stack: BA base layer + CPC backfill filtered to intern/entry + direct receiving-partner asks to **Ausbildung.de** and **Unicum** (both already run partner networks). Niche: Berlin Startup Jobs RSS; GermanTechJobs partnership-or-skip.

**UNVERIFIED:** Appcast DE publisher onboarding; Jobg8 fee/CPC figures (from jobcopilot.com); Adzuna €0.12 (from affi.io); Textkernel €100/mo (from jobdatafeeds.com); Joveo/Veritone/Recruitics publisher terms; Ausbildung.de/Unicum receiving-partner option.

Sources: [Appcast partners](https://www.appcast.io/partners/jobsites/) · [Jobg8](https://www.jobg8.com/AboutUs.aspx) · [Jobg8 member criteria](https://jobg8.com/jobg8member.aspx) · [jobcopilot comparison](https://jobcopilot.com/programmatic-job-ad-platforms-compared/) · [Talent.com publishers](https://www.talent.com/publishers) · [Jooble affiliate](https://jooble.org/affiliate/) · [Adzuna partners](https://www.adzuna.com/hire/partners/) · [Adzuna DE affiliate listing](https://affi.io/m/adzuna) · [WhatJobs affiliates](https://www.whatjobs.com/affiliates) · [Jobrapido partner program](https://corporate.jobrapido.com/partner-program/) · [Recruitics partner inquiry](https://info.recruitics.com/partner-inquiry) · [PandoExchange](https://pandologic.com/solutions/pandoexchange/) · [Joveo distribution](https://www.joveo.com/blog/joveo-recruitment-advertising-job-distribution/) · [Textkernel Jobfeed](https://www.textkernel.com/jobfeed/) · [Jobfeed Germany](https://www.textkernel.com/newsroom/new-jobfeed-germany/) · [Index Anzeigendaten](https://anzeigendaten.index.de/vorteile/) · [Lightcast](https://lightcast.io/products/data/overview) · [BA Ausbildungssuche API](https://ausbildungssuche.api.bund.dev/) · [Ausbildung.de products](https://recruiting.ausbildung.de/produkte) · [Unicum employers](https://karriere.unicum.de/recruiter/unternehmen) · [GOhiring API](https://gohiring.com/api/) · [Jobteaser university network](https://www.jobteaser.com/en/corporate/network-of-schools-and-universities) · [Berlin Startup Jobs RSS](https://feedreader.com/observe/berlinstartupjobs.com) · [GermanTechJobs scraper](https://apify.com/unfenced-group/germantechjobs-scraper/api)
