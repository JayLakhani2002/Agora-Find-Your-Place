# Agora Jobs — Odd Jobs & Part-Time Sourcing Strategy
**Document type:** Technical & Business Strategy  
**Category:** Hospitality · Logistics · Gig Economy · Blue-Collar  
**Status:** Phase 2–3 planning  
**Date:** June 2026

---

## The Problem This Solves

Werkstudent roles are the primary niche (v1), but they have a ceiling — they require field-adjacent work, and getting one takes weeks of applications. For international students who need income **now** — a student who just arrived in Berlin and has €0 in rent money — Werkstudent jobs are not the answer. They need:

- A dishwasher shift at a restaurant starting Saturday
- A warehouse helper day at DHL for €16.70/hour
- A Wolt delivery slot for the evenings
- A hotel room cleaning job three mornings a week

This segment is **the bread and butter of international student survival income**. It's also where Agora can win on supply richness in a way no other platform does, because the job categories below are fragmented across German-only platforms, gig economy apps, and staffing agencies — none of which are indexed in a single international-student-aware, eligibility-filtered place.

---

## Critical UX Decision: Two Types of "Jobs" Here

Before the sourcing strategy, you need to understand a fundamental architectural difference in this segment.

### Type A — Traditional Job Listings (Posted, Applied For, Filled)
These work like Werkstudent jobs. An employer posts "Küchenhilfe, 15 hrs/week, starts Monday, Minijob, Berlin-Mitte." A student applies. The employer reviews. Hire happens.

**Sources:** Arbeitsagentur, HOGAPAGE, hotelcareer, Absolventa, jobicco, DHL/Amazon career pages

**UI treatment:** Goes into the regular swipe deck. Standard job card with match score, apply flow.

### Type B — Gig Platform Signups (Always Open, No Individual Application)
Wolt, Lieferando, Amazon Flex, and Uber Eats do not post individual "jobs." They run rolling recruitment where students sign up as a platform worker, pass a quick document check, and start taking shifts. There is no employer reviewing your CV. There is no posting that expires.

**Sources:** Platform signup pages only — no scraping, no API, no traditional job listing exists

**UI treatment:** These should NOT be in the swipe deck. They belong in a dedicated **"Gig Work" section** — a permanent card per platform showing: pay rate, vehicle requirements, language requirement, estimated weekly earnings, and a direct "Sign Up" button that opens the platform's registration flow. Think of it like an onboarding directory, not a job board.

This distinction matters architecturally. Mixing Type B gig platform cards into a swipe deck of individual Type A job listings would break the user experience because there's nothing to "apply" for — just a signup link.

---

## Domain Breakdown

The following are the specific job categories mentioned, with German vocabulary, typical pay, language requirements, and key sources for each.

| Category | German title(s) | Typical pay | German needed | Type |
|---|---|---|---|---|
| Kitchen helper | Küchenhilfe, Küchenhelfer | €13.90–€15/hr | No (A1–A2 useful) | A |
| Dishwasher | Spüler, Abwäscher, Spülkraft | €13.90–€14.50/hr | No | A |
| Bar work | Barkeeper, Bar-Aushilfe | €14–€17/hr | A2–B1 | A |
| Waiting / Service | Kellner/in, Servicekraft, Servicehilfe | €13.90–€16/hr | B1 useful | A |
| Hotel room cleaning | Housekeeping, Zimmermädchen, Reinigungskraft | €13.90–€15/hr | No–A1 | A |
| Cook / Chef assist | Koch, Hilfskoch, Commis de Cuisine | €14–€18/hr | No | A |
| Warehouse (Amazon etc.) | Lagerhelfer, Kommissionierer | €14–€17/hr | No–A1 | A |
| DHL delivery | Paketzusteller, Zusteller, Postbote | €16.70–€17.40/hr | B2 (for DHL) | A |
| Amazon Flex | Amazon Flex Lieferpartner | ~€25/hr est. | A1–A2 (app) | B |
| Wolt courier | Wolt Courier Partner | ~€12–€15/hr + tips | No (English app) | B |
| Lieferando courier | Scoober/Lieferando Fahrer | €13.90+/hr + bonuses | A2 (basic) | B |
| Uber Eats / delivery | Uber Eats partner (via fleet) | Variable | No | B |

---

## Sourcing Strategy: Type A — Traditional Job Listings

### Source 1: Bundesagentur für Arbeit (Still Your Foundation)

The BA API covers all of these categories with specific `arbeitszeit` filters. The key filters for this segment:

**Minijob specifically:**
```bash
curl -H "X-API-Key: jobboerse-jobsuche" \
"https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs\
?wo=Berlin&umkreis=25&arbeitszeit=mj&angebotsart=1&size=25&page=1"
```

**Part-time (non-Minijob):**
```bash
curl -H "X-API-Key: jobboerse-jobsuche" \
"https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs\
?wo=Berlin&umkreis=25&arbeitszeit=tz&angebotsart=1&size=25&page=1"
```

**Keyword-specific searches to schedule daily:**

| Category | German keyword for `was=` param |
|---|---|
| Kitchen helper | `Küchenhilfe` |
| Dishwasher | `Spüler` OR `Spülkraft` |
| Service/waiter | `Servicekraft` OR `Kellner` |
| Bar | `Barkeeper` OR `Barhilfe` |
| Hotel cleaning | `Housekeeping` OR `Reinigungskraft` OR `Zimmermädchen` |
| Warehouse | `Lagerhelfer` OR `Kommissionierer` |
| DHL/delivery | `Paketzusteller` OR `Zusteller` |

Run each keyword search as a separate scheduled Celery task. Deduplicate by `dedup_hash`. The BA API returns ~20–200 results per keyword per Berlin search — this alone will give you thousands of relevant listings.

**Important BA note for DHL:** DHL / Deutsche Post posts hundreds of Minijob Paketzusteller positions directly via the BA portal. These are always available, rotate frequently, and are well-paid. They are the single biggest employer of students in the logistics category in Berlin. The BA API is the direct pipeline for these.

---

### Source 2: jobicco Berlin — Casual Jobs Specialist

Already identified in the Werkstudent strategy. For odd jobs specifically, jobicco is even more important — it is explicitly designed for short-term, non-study-related casual work in Berlin.

**Direct URL for type-specific crawling:**
```
https://www.jobicco.berlin/en/jobs/gastronomy
https://www.jobicco.berlin/en/jobs/events
https://www.jobicco.berlin/en/jobs/service
https://www.jobicco.berlin/en/jobs/logistics
```

**Partnership target:** Same contact as Stellenticket (`info@jobicco.berlin`). jobicco is explicitly the platform for non-study-related student casual work; Agora is a direct distribution partner for their target demographic. Offer attribution + click tracking in exchange for a data feed.

**Crawl spec (if partnership not secured):**
- Tool: Crawlee `HttpCrawler`
- Rate: 1 req/8 sec
- Robots.txt: check and respect
- Frequency: Every 6 hours
- Fields: title, company, location, description, pay, hours, posted_at, apply_url

---

### Source 3: HOGAPAGE — The Hospitality Specialist

HOGAPAGE (hogapage.de) is Germany's top-rated specialist job board for hotel, restaurant, and catering — voted "Beste Jobbörse für Hotel und Gastronomie" multiple years running. It covers Berlin extensively.

**Why this matters:** HOGAPAGE specifically attracts mid-tier restaurants, hotel chains, catering companies, and event venues — exactly the employers posting Küchenhilfe, Servicekraft, Barkeeper, and Housekeeping Minijobs. These employers don't use Greenhouse or Lever; HOGAPAGE is their primary hiring channel.

**Crawl approach:**
```
https://www.hogapage.de/jobs/stadt/berlin?page=1
https://www.hogapage.de/jobs/gastronomie/stadt/berlin
https://www.hogapage.de/jobs/hotellerie/stadt/berlin
```

HOGAPAGE pages are standard HTML with structured job cards. Crawlee `HttpCrawler` handles this well.

**Partnership option:** Email `info@hogapage.de` — propose Agora as a distribution partner. HOGAPAGE gets a young, international audience for their employer listings; Agora gets curated hospitality job data.

---

### Source 4: hotelcareer.com — Hotel and Hospitality Specialist

hotelcareer.com is an international hospitality job board with strong German coverage. It explicitly lists temporary/part-time positions and Minijob roles for hotels and restaurants in Berlin.

**Crawl target URLs:**
```
https://www.hotelcareer.com/jobs/temporary-job-berlin
https://www.hotelcareer.com/jobs/kitchen-helper-berlin
https://www.hotelcareer.com/jobs/waiter-berlin
```

**Crawl spec:** Standard Crawlee HTML scraper. Rate: 1 req/10 sec. Frequency: Every 12 hours.

---

### Source 5: Zenjob — The Most Important Partnership in This Segment

Zenjob is a Berlin-founded staffing platform that works exclusively with enrolled students to fill shifts for companies in logistics, retail, hospitality, gastronomy, events, and e-commerce. Their job inventory is almost entirely odd-jobs/part-time — exactly this segment.

**What Zenjob is:**
- 40,000+ active students on platform
- 1,000+ partner companies (Amazon, REWE, Lidl, DHL, Zalando, Marriott, Hilton, and hundreds of restaurants)
- Same-day booking for shifts
- No CV required — students just tap to book a shift
- They handle all payroll as the employer of record (students are employed by Zenjob, not the company)

**The challenge:** Zenjob's jobs are not scraped from public pages. Their inventory is proprietary to their platform and only accessible to registered students inside their app. There is no public job listing feed.

**The opportunity — two angles:**

**Angle 1: Partnership for listing feed.** Zenjob has an API — but it is a B2B API for companies that want to request staff, not for candidates browsing jobs. To get job listing data, you would need a **data sharing agreement** with Zenjob's BD team. The business case: Agora sends verified, pre-screened international students to Zenjob → Zenjob gets high-quality new platform members → Agora gets a curated job feed to show users. Contact: `partnerships@zenjob.com`.

**Angle 2: Referral card (Type B treatment).** Even without a data feed, Agora can have a permanent "Zenjob" card in the Gig Work section: brief explanation of how it works, sectors, pay range, how to sign up, language requirements. The call to action is "Download Zenjob App" (referral-tracked link). This provides immediate value to students even before a data partnership.

---

### Source 6: Studyheads — Student Staffing Agency

Studyheads is described as "one of Germany's largest student employers" with 44 locations including Berlin. They place students into exactly these job categories: hospitality, events, logistics, retail, office support.

**Website:** studyheads.de
**Berlin contact:** `berlin@studyheads.de`

**Their job board:** `studyheads.de/jobs/` — crawlable with standard Crawlee. Jobs are listed publicly.

**Partnership pitch:** Studyheads gets additional candidate visibility; Agora gets their curated student-specific job inventory. A mutual link exchange and attribution model would work here.

---

### Source 7: Gigport / Tempton Student / DEKRA / Adecco

Temporary staffing agencies (Zeitarbeitsfirmen) in Germany regularly post Minijob and part-time positions for students in warehouses, hotels, and events. The largest with Berlin presence:

| Agency | URL | Focus |
|---|---|---|
| Tempton | tempton.de/jobs | Logistics, warehouse, hospitality |
| Adecco Germany | adecco.de/jobs | All sectors, large hotel chains |
| Randstad | randstad.de/jobs | Warehouse, retail, events |
| Manpower | manpower.de/jobs | Warehouse, logistics, office |

All of these post publicly on their websites AND on the Bundesagentur. You get them from the BA API automatically (agencies post via BA at high volume). But targeted crawling of their Berlin student category pages provides faster freshness and more detail.

---

### Source 8: Craigslist Berlin / eBay Kleinanzeigen / Marktplaats

Do not underestimate informal listings. Many small restaurants, cleaning companies, private households, and events companies in Berlin post Minijob and casual work on:

- `berlin.craigslist.org/search/fbh` (Gastronomy/Hospitality section)
- `kleinanzeigen.de` (search "Minijob Berlin" or "Aushilfe Berlin")

These are lower quality (no structured data, higher spam rate) but surface jobs that never appear on formal job boards — the restaurant looking for a dishwasher for 3 evenings a week, the private family looking for a babysitter, the event needing 20 helpers for Saturday.

**Crawl with caution:** These sources require more aggressive deduplication and LLM quality filtering (Claude Haiku 4.5 to classify "is this a legitimate employer or spam?") before entering your DB.

---

### Source 9: Direct Major Employer Career Pages

For specific large employers that hire hundreds of students in this segment, go directly to their career pages rather than waiting to scrape them from aggregators:

| Employer | ATS / Career page | Job type |
|---|---|---|
| Amazon Fulfillment Berlin | amazon.jobs + flex.amazon.de | Warehouse, flex delivery |
| Deutsche Post / DHL | careers.dhl.com | Paketzusteller Minijob |
| REWE / PENNY Berlin | rewe-group.com/karriere | Cashier, shelf stocker |
| Kaufland Berlin | karriere.kaufland.de | Retail Minijob |
| Lidl Berlin | careers.lidl.de | Retail, warehouse Minijob |
| Marriott Hotels Berlin | marriott.com/careers | Housekeeping, service |
| Hilton Berlin | jobs.hilton.com | Housekeeping, kitchen, service |
| Mercure / ibis Berlin | all.accor.com/jobs | Hotel staff Minijob |

Most of these use Workday (Amazon), Taleo (Marriott), or Greenhouse-adjacent systems. Use the multi-ATS scraper approach from the Werkstudent strategy. DHL uses their own careers portal but also posts every single role to the BA API — easiest to pull from BA.

---

## Sourcing Strategy: Type B — Gig Platform Cards

These platforms have **no job listing data to scrape.** Their "jobs" are always-open signup invitations, not individual vacancies. The correct treatment is a **permanent static card** in the Agora UI, maintained by you, not sourced from any API.

### What a Gig Platform Card Contains

Each card is authored once and updated manually when conditions change (pay rates, requirements, wait times). It shows:

```
Platform name + logo
Type: Delivery / Warehouse / Retail
Approximate earnings: €12–€15/hour + tips
Vehicle needed: Bike / Scooter / Car / None
German required: No / A1 / B2
Work permit needed: Yes (any valid German work permit)
Typical response time: 3–7 days
How it works: 3-sentence explanation
[Sign Up Now →]  (deep link with Agora referral tracking)
Current availability: Active / Waitlist
```

### The Five Gig Platform Cards to Build

**1. Wolt (Food delivery)**
- Pay: ~€12–€15/hour (base) + tips + peak bonuses
- Vehicle: Bike (free eBike rental in Berlin) OR scooter/car (own)
- Language: No German needed — app is in English
- Work permit: Any valid work permit accepted
- Minimum age: 18
- Signup time: 30 minutes, approval in 1–7 days
- International student note: Very popular with Indian and other international students specifically because NO German is required. Wolt explicitly targets internationals.
- Signup URL: `explore.wolt.com/en/deu/couriers`
- Waiting list: Yes — currently can take 1–4 weeks in Berlin. Flag this clearly in the UI.

**2. Lieferando (Scoober — Food delivery)**
- Pay: €13.90+/hour fixed + order bonuses (€0.25–€2.00 extra per delivery tier)
- Vehicle: Bike (employer-provided in some hubs)
- Language: Basic German (A2) useful — app is German
- Work permit: Valid work permit required
- Minimum age: 18
- Note: Student-specific — marketed explicitly as a Minijob option
- Signup URL: `lieferando.de/fahrer` (→ then `lieferando.de/en/courier/berlin` for English)
- Contact for Berlin: `driver-recruitment-de@takeaway.com`

**3. Amazon Flex (Independent package delivery)**
- Pay: €25+/hour (self-reported by Amazon; varies by delivery block)
- Vehicle: Own car required (minimum 4 doors)
- Language: A1–A2 sufficient — app guides with simple instructions
- Work permit: Required (freelance status — Gewerbeschein needed)
- Important legal note: Amazon Flex in Germany is **self-employment (freiberuflich)**, not regular employment. This affects social insurance differently from a Minijob or student contract. Students need to declare this income separately. Flag this clearly in Agora UI — students must understand this is not a Werkstudent or Minijob status.
- Minimum age: 18
- Signup URL: `amazon-flex.de`

**4. Uber Eats (via fleet partner — not direct signup)**
- Pay: Variable per delivery + surge pricing
- Vehicle: Bike or scooter
- Language: Minimal German needed
- Work permit: Required
- Important note: In Germany, Uber does NOT allow direct freelance driver signup the way it does in the US. Drivers must sign with a **Uber fleet partner** (a local company that employs drivers and contracts with Uber). The signup process goes through a fleet partner, not Uber directly. This means:
  - Go to: `uber.com/de/en/e/deliver/berlin-be-de/`
  - Find the Berlin fleet partners listed there
  - Apply through them (these ARE individual job listings, closer to Type A)
  - Crawl these fleet partner Greenhouse/Personio pages

**5. Amazon Warehouse Direct (Flex seasonal)**
- Pay: ~€14–€15/hour, often higher for night shifts
- Vehicle: None — warehouse is in Berlin area (Schönefeld, Großbeeren)
- Language: Minimal — international warehouse teams common
- Work permit: Required
- Note: Amazon hires warehouse workers on fixed-term student contracts too, not just Flex. These DO appear on the BA API and amazon.jobs — these are Type A listings, not gig cards.

---

## The Legal Complexity Specific to This Segment

Odd jobs and gig work have **different legal exposure** than Werkstudent roles. You need to model this in your eligibility engine.

### Minijob and the 140-day rule — which one applies?

| Job type | Legal framework | Key constraint |
|---|---|---|
| Minijob (Küchenhilfe, DHL Aushilfe etc.) | Minijob | €603/month earnings cap. No 20hr/week cap if structured as Minijob |
| Odd-job / Part-time (non-Minijob, casual) | Kurzfristige Beschäftigung OR regular part-time | 70-day OR 140-day rule depending on contract structure |
| Gig/Flex (Amazon Flex) | Self-employment (Gewerbe) | Not subject to Minijob or 140-day rules — but BAföG/tax implications |
| Zenjob platform job | Regular employment via Zenjob as employer | Subject to student contract rules (20hr/week cap during semester) |

**For Agora's eligibility engine:** When classifying jobs in this segment, Claude Haiku 4.5 needs to output the correct legal framework, not just employment type. Add `legal_framework` as an enrichment field:

```json
{
  "legal_framework": "minijob|kurzfristige_beschaeftigung|student_contract|self_employed|unknown",
  "monthly_earnings_cap_applies": true,
  "weekly_hours_cap_applies": false,
  "day_count_rule_applies": true
}
```

### Language requirements reality check

This is often undersold in job descriptions. From the data:

- **DHL Paketzusteller:** Explicitly requires "B2 German" to communicate with customers and follow route instructions
- **Kitchen helper / Spüler / Warehouse:** Often requires NO German — these are international-dominant workforces in Berlin
- **Bar / Service / Waitstaff:** A2–B1 useful, B1 required for formal restaurants
- **Hotel housekeeping:** Often no German required in international hotel chains (Marriott, Hilton, Accor)
- **Wolt / delivery:** No German needed — app is English, customers communicate via app

Your Haiku classification prompt for this segment should specifically extract `minimum_german_level` with high sensitivity — it matters enormously for your target users.

---

## Implementation Plan: Phase by Phase

### Phase 2 — Month 4–5 (Parallel with beta launch)

**Week 1:**
1. Add hospitality/logistics keyword searches to existing BA API Celery tasks
   - Add 8 keyword combinations: Küchenhilfe, Spüler, Kellner, Servicekraft, Housekeeping, Lagerhelfer, Paketzusteller, Barkeeper
   - Confirm results coming in and being enriched correctly
   - Expected new jobs in DB: 2,000–5,000 Berlin-area

2. Build Gig Platform card data model in DB:
   ```sql
   CREATE TABLE gig_platforms (
     id UUID PRIMARY KEY,
     name TEXT,
     logo_url TEXT,
     category gig_category_enum,  -- delivery | warehouse | retail | events
     pay_description TEXT,
     vehicle_required vehicle_enum,  -- none | bike | scooter | car
     min_german_level german_level_enum,
     work_permit_required BOOLEAN,
     min_age SMALLINT,
     signup_url TEXT,
     referral_url TEXT,
     is_self_employed BOOLEAN,
     availability_status TEXT,  -- active | waitlist | paused
     avg_hourly_estimate NUMERIC,
     notes TEXT,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
3. Seed 5 gig platform cards manually (Wolt, Lieferando, Amazon Flex, Uber Eats, Amazon Warehouse)

**Week 2:**
1. Build jobicco Berlin crawler (Crawlee HttpCrawler)
2. Build HOGAPAGE Berlin crawler
3. Build hotelcareer Berlin crawler
4. Integrate all three into enrichment pipeline

**Week 3:**
1. Email Zenjob BD team (partnerships@zenjob.com) — data feed partnership pitch
2. Email HOGAPAGE — distribution partnership pitch
3. Email Studyheads Berlin — data feed + mutual referral pitch
4. Add Studyheads job board crawler as fallback

**Week 4:**
1. Build large employer direct career page crawlers: REWE, Kaufland, Marriott, Hilton
2. DHL/Amazon — confirm already covered by BA API; add direct careers.dhl.com crawl as supplement
3. QA audit: sample 50 odd-job listings, verify enrichment accuracy (is employment_type correct? is German level correct? is Minijob cap flag correct?)

### Phase 3 — Month 7–9

1. Uber Eats fleet partner crawl (identify Berlin fleet partners, hit their career pages)
2. Craigslist / Kleinanzeigen crawler with LLM spam filter
3. Add event-specific platforms: jobvector.de (event jobs), crewmeister.de (shift scheduling for small employers who post directly)
4. Tempton, Adecco, Randstad targeted Berlin student/Minijob page crawls
5. Full Zenjob integration (if partnership secured) — live job feed from their B2B API

---

## Recommended DB Schema Additions for This Segment

```sql
-- Add to the jobs table from the Werkstudent strategy
ALTER TABLE jobs ADD COLUMN legal_framework TEXT;
-- 'minijob' | 'student_contract' | 'kurzfristige_beschaeftigung' | 'self_employed' | 'unknown'

ALTER TABLE jobs ADD COLUMN physical_demands TEXT;
-- 'low' | 'medium' | 'high' — useful for matching (student with back problems shouldn't get warehouse jobs)

ALTER TABLE jobs ADD COLUMN vehicle_required vehicle_enum;
-- 'none' | 'bike' | 'scooter' | 'car' | 'license_only'

ALTER TABLE jobs ADD COLUMN shift_pattern TEXT;
-- 'fixed' | 'flexible' | 'on_call' | 'weekend_only' — extracted by LLM

ALTER TABLE jobs ADD COLUMN domain job_domain_enum;
-- 'hospitality' | 'logistics' | 'retail' | 'event' | 'cleaning' | 'delivery' | 'kitchen' | 'tech' | ...
```

---

## Enrichment Prompt for This Segment

Extend the Haiku classification prompt to cover physical job metadata:

```
Classify this German job listing. Return JSON only:
{
  "employment_type": "werkstudent|minijob|teilzeit|vollzeit|odd_job|gig",
  "domain": "kitchen|bar|service|hotel|cleaning|warehouse|delivery|retail|event|other",
  "estimated_weekly_hours": number|null,
  "minimum_german_level": "none|A1|A2|B1|B2|C1|C2",
  "legal_framework": "minijob|student_contract|kurzfristige_beschaeftigung|self_employed|unknown",
  "vehicle_required": "none|bike|scooter|car|license_only",
  "shift_pattern": "fixed|flexible|on_call|weekend_only|unknown",
  "physical_demands": "low|medium|high",
  "is_field_related": false,
  "monthly_earnings_cap_applies": true|false
}
```

---

## Cost Estimate for This Segment

| Source | Cost |
|---|---|
| BA API new keyword searches | €0 — same API, more queries |
| jobicco crawler | €0 |
| HOGAPAGE crawler | €0 |
| hotelcareer crawler | €0 |
| Studyheads crawler | €0 |
| Haiku enrichment (~15,000 new jobs/month) | ~€0.40/month |
| Gig platform cards (manual, one-time) | 2 hours of time |
| Zenjob partnership | TBD — possibly free or small monthly fee |
| **Total added cost** | **~€1/month** |

---

## Summary: Priority Order

**Do immediately (adds 2,000–5,000 jobs in 24 hours, no new code needed):**
1. Add hospitality/logistics keywords to existing BA API Celery tasks
2. Seed Gig Platform card table manually for 5 platforms
3. Update LLM enrichment prompt with `domain` and `legal_framework` fields

**Do in week 2 (adds 3,000–8,000 more jobs, requires Crawlee work):**
4. Build jobicco Berlin crawler
5. Build HOGAPAGE crawler
6. Build hotelcareer crawler

**Pursue in parallel (high-leverage partnerships):**
7. Email Zenjob BD team
8. Email HOGAPAGE
9. Email Studyheads Berlin

**Do in month 2 (completes the segment):**
10. Large retail employer crawlers (REWE, Kaufland, Lidl)
11. Hotel chain direct career pages (Marriott, Hilton, Accor)
12. Craigslist/Kleinanzeigen with spam filter
13. Uber fleet partner crawls

Within one week of starting this plan, you will have Berlin's most comprehensive, eligibility-filtered odd-jobs and part-time index for international students — covering every domain in your original list.

---

*This document pairs with the Werkstudent job sourcing strategy. Together they cover the full Agora job supply pipeline for v1 and Phase 2.*
