# Legal Posture — job data ingestion

The operating rulebook. Research and case-law citations live in [RESEARCH-JOB-DATA-SOURCES.md](RESEARCH-JOB-DATA-SOURCES.md) and [RESEARCH-VERIFIED-SOURCE-INVENTORY.md](RESEARCH-VERIFIED-SOURCE-INVENTORY.md); this file says what we actually do, and where we currently fall short of it.

**None of this is legal advice, and none of it has been reviewed by a German lawyer.** A review is already on the roadmap for auto-submission ([CLAUDE.md](../../CLAUDE.md), UWG/ToS/GDPR). Ingestion belongs in the same review — arguably before it, because ingestion ships first.

## The five rules

1. **robots.txt is binding on us.** §44b UrhG permits commercial crawl-and-index of lawfully accessible pages; the legally recognized opt-out is machine-readable. We honor it per host *and* per tenant.
2. **Never circumvent a technical barrier.** Browsewrap terms alone don't bind a crawler under German law — what turns scraping into unfair competition is defeating CAPTCHAs, bot challenges or IP blocks. We don't, anywhere, ever. If a source needs evasion, the answer is a partnership or nothing.
3. **Index and link, never live meta-search.** We crawl into our own index and send users out via apply-links. We never proxy a user's query into someone else's search engine in real time — that architecture is what EU case law forbids (*Innoweb*), while indexing with outbound links is the posture it has favoured (*CV-Online*).
4. **Publish facts, link for prose.** Title, company, location, salary, dates and apply-URL are unprotected facts. Full ad text carries copyright and database-right risk, so **it is never rendered on our surfaces** — users see a snippet and an apply-link to the source. *Amended by Jay on 2026-08-06:* full text may be **stored** for internal processing (embeddings, classification, CV tailoring), subject to the German legal review confirming it. See Gap 1.
5. **Recruiter names in postings are personal data.** Art. 6(1)(f) balancing documented, data minimized, and a public Art. 14(5)(b) notice published. ⚠️ **Not implemented — see Gap 2.**

## Source verdicts

Robots.txt column re-checked live on 2026-08-06.

| Source | Access | robots.txt | Verdict |
|---|---|---|---|
| **Bundesagentur für Arbeit** | Open REST v6, static public key | n/a (API) | 🟢 Ingest. Caveat: community-documented, no published API terms and no formal agreement. Email BA for an explicit OK, and never let it be a single point of failure |
| **Arbeitnow** | Open REST, no key | permissive | 🟢 Ingest. Attribution + backlink required — confirm we render it |
| **Greenhouse** | `boards-api.greenhouse.io/v1/boards/{token}/jobs` | `Disallow: /embed/` only — our path is allowed | 🟢 Ingest. 20 companies live |
| **Ashby** | `api.ashbyhq.com/posting-api/job-board/{token}` | no robots.txt served | 🟢 Ingest, documented public posting API. 7 companies live |
| **Lever** | `api.lever.co/v0/postings/{token}` | `Allow: /`, `Crawl-delay: 1` | 🟢 Ingest at ≤1 req/s. We make one request per company |
| **Personio** | `{tenant}.jobs.personio.de/xml` | none at the feed host | 🟢 Ingest. Opt-in per customer, so coverage is partial by design. 3 companies live |
| **Recruitee** | `{tenant}.recruitee.com/api/offers/` | **per tenant** — checked rebuy and kfzteile24, both `Disallow: /v/` only | 🟡 Ingest only after checking that tenant's robots.txt. 2 companies live, both checked |
| **Workday** | `POST {tenant}.wd{n}.myworkdayjobs.com/wday/cxs/…` | per tenant | 🟡 Adapter built, **zero companies in the registry**. Undocumented endpoint — check the tenant's robots and throttle hard before adding any |
| **SmartRecruiters** | anonymous API responds | `User-agent: * / Disallow: /`, LinkedInBot exempted | 🔴 **Do not ingest.** Explicit machine-readable opt-out. Adapter deliberately removed from the codebase; the detector still reports these employers so we know who to ask. Lawful route: their Partner API key |
| **StepStone / Indeed / XING / LinkedIn** | no data-out path | ToS prohibit | 🔴 Do not scrape. Reachable only via CPC networks or user-initiated capture |
| **Adzuna / Jooble / Talent.com / WhatJobs** | free publisher keys | n/a | 🟢 Lawful and they pay us per click. Attribution mandatory |

## Where we currently break our own rules

### Gap 1 — we store full ad text
Rule 4 says full ad text stays out of the database. Reality: `jobs.description` is `NOT NULL`, averages 2,811 characters, and holds the complete posting for all 931 rows. The new career-page scraper does the same.

This is not an oversight that can simply be reverted — the product depends on the text. Embeddings are generated from it, the classifier reads it, and CV/cover-letter generation needs the requirements to tailor against.

**Decision (Jay, 2026-08-06): keep the text, and put it in front of the lawyer.** Storing full text for internal processing while publishing only a snippet plus an apply-link is the posture we are taking. Two obligations follow:

1. **The lawyer must be asked this specific question**, not a general "is scraping okay" — namely whether storing complete ad text for embedding and LLM tailoring, without republishing it, is defensible in Germany under copyright and the §87a UrhG database right.
2. **Snippet-only rendering has to be enforced in the product**, not just intended. What we publish matters more than what we store; republishing full ad text on our own pages is the version that draws letters. Audit every surface that shows a job before beta.

### Gap 2 — no PII handling for recruiter names
German postings routinely name a contact person ("Ihre Ansprechpartnerin: …"). That is personal data sitting in `jobs.description` with no legal basis documented, no minimization, and no Art. 14 notice. What is needed: a documented legitimate-interest balancing test, a redaction pass at ingest for contact names, emails and direct phone numbers, and a public notice explaining what we collect from postings. The GDPR cascade-delete work already done covers user data, not job data.

### Gap 3 — attribution is unverified
Arbeitnow requires attribution and a backlink; CPC networks will require it too. Nobody has checked whether the app renders it. One-line fix if it's missing, one-line breach if it stays missing.

## Before beta

- [ ] German lawyer reviews this document and Gap 1 specifically (the exact question is in Gap 1)
- [ ] Audit every job-rendering surface: snippet + apply-link only, never full ad text
- [ ] Redaction pass for contact-person PII at ingest
- [ ] Art. 14(5)(b) public notice covering job-posting data
- [ ] Attribution rendered for Arbeitnow and any CPC network
- [ ] robots.txt check automated, not manual, before any new host is added
- [ ] Email BA about the Jobsuche API and keep the reply
