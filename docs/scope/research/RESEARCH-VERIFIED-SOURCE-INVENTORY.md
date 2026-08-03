# Research — Verified Job Data Source Inventory

Backing research for [PROJECT-SCOPE.md](../PROJECT-SCOPE.md) §8 (Job data & trust posture). Verified 2026-08-03, live-tested where noted.

## Layers 2–3 — official + aggregator APIs

| Source | Access | Cost | Segments (DE) | Verdict |
|---|---|---|---|---|
| **BA Jobsuche API** | Open REST v6 (`rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs`), public key `jobboerse-jobsuche` — live-tested ✅ | Free | **All of them**: Arbeit, Ausbildung (`angebotsart=4`, real company vacancies), Praktikum/Trainee (`=34`), Werkstudent via keyword | **The anchor source.** Germany's largest job DB, the only single source spanning student → senior. Caveat: no published API terms — email BA for an explicit commercial OK, and architect so a key change can't kill us |
| **BA Ausbildungssuche API** | Open, key `infosysbub-absuche` — live-tested ✅ | Free | *Bildungsangebote* (courses/Umschulung), **not** company apprenticeship vacancies — those live in Jobsuche | Secondary; useful for the learning-paths feature, not job supply |
| **Arbeitnow** | Fully open REST, no key, 50 req/min — live-tested ✅ (newest posting: same-day) | Free, attribution + backlink | German-focused, English-speaking/startup skew; tagged Praktikum, Werkstudent, **visa sponsorship** | **Best free German source** — the tags match our exact launch persona |
| **Adzuna API** | Self-serve key | Free tier 2,500 req/mo; commercial license after trial | Germany (adzuna.de), broad; student depth thin | Redundancy backfill; free tier covers a nightly Berlin sync in beta. Mandatory "Jobs by Adzuna" attribution |
| **Jooble / Careerjet / Talent.com** | Free keys / partner programs, CPC-linkback model | Free (they pay CPC) | DE covered, all types | Breadth backfill — they *want* us displaying their links |
| **EURES** | No official API; community-documented portal API, attribution to ELA | Free | German inventory = BA-fed (overlap, not additive) | Nice-to-have for EU expansion, no SLA — never load-bearing |
| **StepStone / Indeed / XING·onlyfy / LinkedIn** | **No data-out path exists** (verified: inbound feeds, partner-gated ATS APIs, or closed) | — | — | Confirmed: reachable only via **Layer 5 user-initiated capture**. Competitors showing their inventory are scraping (ToS breach) or paying resellers (e.g. Techmap) |

## Layer 1 — direct ATS endpoints

Full detail + citations in [RESEARCH-JOB-DATA-SOURCES.md](RESEARCH-JOB-DATA-SOURCES.md).

| ATS | Endpoint | Verdict |
|---|---|---|
| **Greenhouse** | `boards-api.greenhouse.io/v1/boards/{token}/jobs` | 🟢 Documented, explicitly public, no auth — core source |
| **Lever** | `api.lever.co/v0/postings/{site}` (+ EU host) | 🟢 Documented; robots allow with `Crawl-delay: 1` — respect 1 req/s |
| **Personio** | `{tenant}.jobs.personio.de/xml` | 🟢 Documented, but **opt-in per customer** — expect partial coverage |
| **Ashby** | `api.ashbyhq.com/posting-api/job-board/{board}` | 🟢 Documented, no auth |
| **Teamtailor** | `{co}.teamtailor.com/jobs.json` / `.rss` | 🟢 Documented, full descriptions |
| **d.vinci** | `{co}.dvinci.de/jobPublication/list.json` | 🟢 Documented "always public" — best German-native option |
| **Workable** | `apply.workable.com/api/v1/widget/accounts/{shortcode}` | 🟢 Documented; robots signal `ai-train=no` (we don't train on data anyway) |
| **Recruitee** | `{tenant}.recruitee.com/api/offers` | 🟡 Documented, but robots are **per-tenant** (some `Disallow: /`) — check each tenant before polling |
| **Workday** | `POST {tenant}.wd{n}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` | 🟡 Reachable but undocumented; vendor ToS doesn't name tenant career sites; tenant robots are permissive and publish sitemaps — obey each tenant's robots, throttle hard |
| **SmartRecruiters** | anonymous `/postings` responds, **but** robots = `Disallow: /` for everyone except LinkedInBot | 🔴 **Explicit machine-readable opt-out — do not ingest.** The legal path is their Partner API key |
| **softgarden** | frontend API is token-gated; anonymous path unresolved | ⚪ **Open item — launch-six member.** Needs a browser network capture, or partner conversation |
| **SAP SuccessFactors** | not yet probed | ⚪ **Open item — launch-six member.** Verify before Phase 2 planning hardens |
| onlyfy / rexx / Join.com | no public feed (client-rendered or Cloudflare-gated) | 🔴 for crawling (Join's sitemap sits behind a bot challenge — evasion is the legal trigger). Reach via employer career pages or Layer 5 |

**Enumeration strategy:** primary = **reverse-link discovery** — crawl DACH companies' own `/karriere` pages and extract links matching the ATS host patterns (highest precision, lowest legal profile, yields employer identity + tenant slug in one pass). Secondary = rate-limited tenant-slug probing (every platform gives a clean exists/doesn't signal) with an identifying User-Agent and contact URL, seeded from Handelsregister/Kununu/Crunchbase company lists. Workday adds per-tenant sitemaps. Certificate-transparency is a dead end (wildcard certs); BuiltWith/Wappalyzer are the paid shortcut.

## The legal rulebook (German/EU case law — citations in RESEARCH-JOB-DATA-SOURCES.md)

1. **robots.txt is law for us.** §44b UrhG permits commercial crawl-and-index of lawfully accessible pages; the legally recognized opt-out is machine-readable (robots.txt/TDMRep). We honor it per host *and* per tenant — that's what makes SmartRecruiters red and Greenhouse green.
2. **Browsewrap ToS don't bind a crawler** under German law (BGH *Automobil-Onlinebörse*, *Flugvermittlung*): what flips scraping into unfair competition is **circumventing technical protection** — CAPTCHAs, bot challenges, IP blocks. We never cross that line, anywhere.
3. **Index-and-link, never live meta-search.** Crawling into our own index with outbound apply-links is the posture EU case law favors (*CV-Online*); proxying user queries into a source's own search is the architecture it forbids (*Innoweb*).
4. **Store facts, link for prose.** Title, company, location, salary, dates, apply-URL are unprotected facts; full ad text stays out of our database.
5. **Recruiter names are personal data** even in postings: documented Art. 6(1)(f) balancing, minimization, and a public Art. 14(5)(b) notice — feeds PROJECT-SCOPE.md §8.3.

## Layer 4 — backfill networks

| Network | Door for us | Revenue | Note |
|---|---|---|---|
| **Talent.com, Jooble, WhatJobs, Adzuna** | Self-serve / form signup, low-or-no traffic bar | CPC paid to us (DE context: ~€0.10–0.50/click; Adzuna DE ~€0.12 reported) | **Day-one doors** — join at launch |
| **Jobg8** | ~5,000 uniques/day minimum, quality review, ~$350 integration fee (third-party figure) | CPC/CPA, we set sell-side CPC | Join once traffic clears the bar; DE/AT/CH among its largest markets |
| **Appcast** (StepStone-owned) / Recruitics | Sales conversation, traffic thresholds; German publisher inventory unverified | Negotiated CPC/CPA | Later-stage; Appcast's StepStone ownership makes it strategic |
| Joveo / Veritone Hire | Advertiser-side for us — no self-serve publisher path | — | Skip |
| Textkernel Jobfeed / Index Anzeigendaten / Lightcast | Enterprise data licenses (best DE coverage anywhere, incl. print) | Costs money — realistically 4–5 figures/yr | Not for supply; revisit for the analytics moat once funded |

## Student / Praktikum / Ausbildung segment

The only open, free, programmatic source is the **BA Jobsuche API** (Ausbildung + Praktikum via `angebotsart`) — every commercial student board (Ausbildung.de, Praktikum.info, StudentJob, Workwise, Stellenwerk, Unicum, Absolventa, Jobteaser) syndicates outward on negotiated terms only, no self-serve feeds. Practical stack: BA as the base layer + CPC backfill filtered to intern/entry-level + direct receiving-partner asks to **Ausbildung.de** and **Unicum** (both already run 80–200-site partner networks, so the ask is plausible). Niche extras: Berlin Startup Jobs has a plain RSS feed; GermanTechJobs has no API (partnership ask or skip).

**Standing caveat:** the BA endpoints are community-documented (bund.dev), not an officially supported API — a fallback (aggregator layer) must always be able to carry discovery alone.
