# ADR-0001 — Parallel.ai as a Supplementary Job-Discovery & Enrichment Source

- **Status:** Proposed
- **Date:** 2026-06-10
- **Deciders:** Founder (Jay), Agent 5/6 (Ingestion) owner
- **Supersedes / Related:** Crawlee ingestion (Agent 5/6), Cohere embeddings (Agent 3), GDPR & EU-data-residency constraints (`CLAUDE.md`)

---

## 1. Context

Agora Jobs ingests Werkstudent / student-eligible job postings (primarily Berlin/EU),
embeds them with Cohere, and matches them against student profiles. Today, ingestion
is handled by **Crawlee** scraping a fixed set of known job boards.

Two gaps motivate this ADR:

1. **Coverage** — Crawlee targets boards we explicitly configure. The long tail of
   company career pages, niche EU boards, and newly-posted roles is poorly covered.
2. **Enrichment** — When we surface a match, we have thin employer context
   (company size, visa-sponsorship friendliness, English-OK culture). This is
   public data we currently don't collect.

**Parallel.ai** (Parallel Web Systems — "infrastructure for intelligence on the web")
offers per-request web-research APIs that could address both gaps. This ADR evaluates
it and defines **exactly where it may and may not be used**, gated by our
GDPR / EU-data-residency rules.

---

## 2. What Parallel.ai provides

| API            | Capability                                                        | Pricing (public)                          |
|----------------|-------------------------------------------------------------------|-------------------------------------------|
| **Search API** | Ranked URLs + token-dense excerpts, sync, <5 s; agent tool-call   | $0.005 / 10 results; $1 / 1k extra results|
| **FindAll API**| Builds a **structured dataset from a natural-language query**     | usage-based                               |
| **Task API**   | Async deep research → structured output w/ inline citations       | $5–$1,200 / 1k requests (Lite → Ultra4x)  |
| **Monitor API**| Continuous monitoring for web events                              | usage-based                               |
| **Extract API**| Clean content extraction from a known URL                         | usage-based                               |
| **Chat API**   | Web-grounded LLM completions with citations                       | usage-based                               |

- Pricing is **per-request, not per-token**; cost is known before a query runs.
- ~16,000 free requests, then pay-as-you-go.
- Access via **REST** and as an **MCP server**.
- **SOC 2 Type II** certified; **Zero Data Retention (ZDR)** available for enterprise.

---

## 3. Documented use cases (every intended use)

Each use is tagged with a data-classification: **PUBLIC** (no personal data leaves our
stack) or **PII** (personal data). Per §5, **PII uses are prohibited** unless the
residency gate in §6 is cleared.

### UC-1 — Long-tail job discovery (PUBLIC) ✅ primary
- **API:** FindAll (primary), Search (fallback).
- **Flow:** Agent 5/6 issues queries like
  *"Werkstudent software engineering jobs in Berlin, ≤20h/week, English OK"* →
  receives structured rows (title, company, URL, location) → normalized → de-duped
  against existing postings → embedded with **Cohere (our EU stack)** → stored.
- **Data sent:** Only the search query (no user data). **PUBLIC.**
- **Value:** Fills coverage gaps Crawlee misses without writing a scraper per site.

### UC-2 — New-posting monitoring (PUBLIC)
- **API:** Monitor.
- **Flow:** Standing monitors for target queries/companies emit "new posting" events;
  Agent 5/6 ingests deltas instead of full re-scrape cycles.
- **Data sent:** Query/company terms only. **PUBLIC.**
- **Value:** Fresher inventory, lower scrape load.

### UC-3 — Employer enrichment (PUBLIC)
- **API:** Task (Lite/Core tier).
- **Flow:** For a matched job's employer, run a research task →
  company size, sector, visa-sponsorship signals, English-working-culture signals,
  Glassdoor-style reputation — **citation-grounded**, public data only.
- **Data sent:** Company name + job URL (public). **No student data.** **PUBLIC.**
- **Value:** Richer match cards; better student decisions.

### UC-4 — Posting detail extraction (PUBLIC)
- **API:** Extract.
- **Flow:** When we have a job URL but a thin scrape, pull clean full text for
  better embedding/skills extraction.
- **Data sent:** Public job URL. **PUBLIC.**
- **Value:** Higher-quality embeddings → better matches.

### UC-5 — Visa/labour-rule research aid, build-time only (PUBLIC, internal)
- **API:** Task (Deep Research).
- **Flow:** Internal/founder use to compile/refresh German student-work-hour and
  visa rules into our own reviewed reference data. **Never** on the live user path;
  outputs are human-reviewed before they inform product logic.
- **Data sent:** Generic research questions. **PUBLIC.**
- **Value:** Keeps eligibility rules current without manual trawling.

### ❌ Explicitly OUT OF SCOPE (PII — prohibited under §5)
- **UC-X1** Sending a student **CV / profile / skills / visa status** to Parallel for
  matching, ranking, or "find jobs for this person." → personal data export.
- **UC-X2** Any **per-user** query that embeds identifiable info (name, email, IP-linked
  profile) in the request.
- **UC-X3** Using Parallel's **Chat API in the user request path** with user content.
- These remain **inside the EU stack** (Cohere + pgvector + our matching logic).
- Does **not** touch **Mode 3** (server-side auto-submission) — still permanently prohibited.

---

## 4. Architecture fit

```
            ┌─────────────────── EU STACK (fra1) ───────────────────┐
 PUBLIC     │                                                       │
 queries    │   Agent 5/6 Ingestion ──► normalize ──► de-dupe       │
 only       │        ▲                                   │          │
   ─────────┼────────┘                                   ▼          │
            │                               Cohere embed (EU)       │
 ┌──────────┴───────────┐                          │               │
 │   Parallel.ai (US)    │  ◄── company name/URL ──┤ (UC-3 enrich)  │
 │  FindAll/Search/      │      job URL  ──────────┘               │
 │  Monitor/Extract/Task │                                          │
 │  PUBLIC DATA ONLY     │   ──── NEVER: CV, profile, visa, PII ──X │
 └───────────────────────┘                                          │
            │                          pgvector + matching (EU)     │
            └────────────────────────────────────────────────────────┘
```

Parallel sits **beside** Crawlee as a second discovery/enrichment source. The boundary
is hard: only public job/company text crosses to the US API; all personal data and all
matching stay in the EU.

---

## 5. EU data-residency & GDPR analysis (the gating question)

**Parallel.ai is a US company** (Parallel Web Systems Inc., 2261 Market Street #5578,
San Francisco, CA 94114). Findings from their public legal pages (2026-06-10):

> **Note on document scope:** The public **Terms of Use** govern browsing `parallel.ai`
> (and even prohibit scraping/storing significant Content *from their website*). They do
> **not** govern API data handling — that lives in the separate **Customer Terms** + a
> **DPA**, which is where residency/SCCs/training commitments must be obtained. The gate
> below therefore cannot be cleared from public docs alone.

| Question                                   | Finding                                                                 |
|--------------------------------------------|-------------------------------------------------------------------------|
| Governing law / jurisdiction               | **California, USA** (Terms of Use, "Choice of Law"). No EU forum.       |
| Liability cap                              | **$100 aggregate** (Terms of Use, "Limitation of Liability").          |
| EU data residency / region hosting         | **Not stated publicly.** No EU region option documented.                |
| GDPR mentioned in privacy policy           | EEA users "have certain rights under GDPR" — no processing specifics.   |
| Public DPA / Art. 28 processor terms       | **Not published.** Must be requested (Customer Terms / enterprise).     |
| Standard Contractual Clauses (SCCs)        | **Not stated publicly.**                                                |
| International-transfer mechanism           | **Not stated publicly.**                                                |
| Data retention                             | "As long as necessary…"; **Zero Data Retention available for enterprise.** |
| Security posture                           | **SOC 2 Type II** certified.                                            |
| Inputs used to train models?               | **Not addressed** in public policy — must confirm contractually.        |
| Sub-processors list                        | Not published (generic "service providers" only).                       |
| Minimum age (COPPA)                         | Under-16 not served — N/A (our users are 18+ students).                 |

### GDPR reasoning
- **Public job/company data (UC-1…UC-5):** Job titles, company names, public posting
  text are **not personal data** about *our users*. Sending these queries to a US API
  is **low GDPR risk** — there is no transfer of a data subject's personal data.
  *(Caveat: a posting may incidentally contain a named contact person; queries must be
  phrased to avoid sending such PII, and we don't re-publish incidental PII.)*
- **Any user PII (UC-X1…X3):** Sending a student's CV/profile/visa status to a US
  processor is a **restricted international transfer** under GDPR Chapter V. Without a
  signed **DPA + SCCs (or adequacy) + ZDR**, this would breach our `EU-only data
  residency` rule and GDPR-first design. → **Prohibited.**

### Conclusion of the gate
- ✅ **PUBLIC use cases are permissible now**, treated as a build/ingestion tool, with
  the query-hygiene guardrail (no incidental PII in queries).
- ⛔ **PII use cases stay prohibited** until *all* of the following are obtained and
  reviewed: signed **DPA (Art. 28)**, **SCCs** or other valid transfer mechanism,
  **Zero Data Retention**, and a **no-training** commitment. Even then, a separate ADR
  is required before any user PII touches Parallel.

---

## 6. Decision

**Adopt Parallel.ai as a supplementary, PUBLIC-data-only job-discovery and enrichment
source (UC-1…UC-5), running beside Crawlee — NOT as a core dependency and NOT in the
user request path.** All matching, embeddings, and personal data remain in the EU stack.

PII use (UC-X1…X3) is **deferred/prohibited** pending the §5 residency gate.

### Conditions of adoption
1. **PoC first** — benchmark FindAll/Search vs. Crawlee on identical Berlin Werkstudent
   queries for coverage, freshness, dedupe rate, and cost. Adopt only if it beats or
   meaningfully complements Crawlee.
2. **Query hygiene** — ingestion code must never place user-identifying data in a
   Parallel request; add a lint/test guard on the Parallel client wrapper.
3. **Isolation** — Parallel calls live in Agent 5/6 ingestion workers only; no Parallel
   client is importable from user-facing tRPC routers.
4. **Cost guardrail** — per-request budget cap + monitoring; fail closed to Crawlee.
5. **Legal artifacts on file** before any spend beyond the free tier: request the DPA,
   confirm ZDR + no-training in writing, store under compliance docs.
6. **Re-open this ADR** before any UC-X (PII) use is ever considered.

---

## 7. Consequences

**Positive**
- Broader, fresher job coverage without per-site scrapers.
- Citation-grounded employer enrichment improves match-card quality.
- Predictable per-request pricing; MCP integration is low-effort.
- Clear, documented GDPR boundary reduces compliance risk.

**Negative / risks**
- New external dependency (US vendor) → vendor-lock and availability risk; mitigated by
  Crawlee fallback.
- Public legal docs are thin on EU specifics → enrichment/PII paths blocked until DPA
  obtained.
- Incidental-PII-in-results risk → requires result-handling discipline.
- Cost can scale with volume → needs budget caps.
- **California governing law + $100 liability cap** → effectively no contractual
  recourse if the service fails or mishandles data; reinforces "supplementary, not
  core" posture and the Crawlee fallback requirement.

---

## 8. Open questions / follow-ups
- [ ] Obtain the **API Customer Terms** (distinct from the website Terms of Use reviewed here).
- [ ] Obtain Parallel **DPA** + confirm **SCCs / transfer mechanism** in writing.
- [ ] Negotiate / accept the **$100 liability cap** consciously, or seek enterprise terms.
- [ ] Confirm **Zero Data Retention** terms and **no-training-on-inputs** commitment.
- [ ] Ask whether an **EU processing region** is on the roadmap.
- [ ] Run the UC-1 **PoC** and record results (coverage/cost/freshness) here.
- [ ] Add the Parallel-client **PII guard** test to the ingestion package.

---

## 9. Sources
- Parallel Search product — https://parallel.ai/products/search
- Parallel Task API — https://parallel.ai/products/task
- Parallel pricing — https://parallel.ai/pricing · https://docs.parallel.ai/getting-started/pricing
- Task API Deep Research quickstart — https://docs.parallel.ai/task-api/task-deep-research
- Parallel privacy policy — https://parallel.ai/privacy-policy
- Parallel terms of service — https://parallel.ai/terms-of-service
- Parallel customer terms — https://parallel.ai/customer-terms
</content>
