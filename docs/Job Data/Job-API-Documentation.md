# Agora Jobs — Job API Documentation
**Document type:** Technical Reference  
**Covers:** All 7 job data sources integrated in the Job Explorer  
**Last updated:** June 2026  
**Explorer location:** `docs/Job Data/job-explorer/`

---

## How to Run the Explorer

```bash
# Navigate to the folder
cd "docs/Job Data/job-explorer"

# Start the server (Node.js v18+ required)
node server.js

# Open in browser
open http://localhost:3333

# Stop the server
Ctrl + C
```

The server runs on port **3333** and proxies all API calls server-side, which avoids browser CORS restrictions. The HTML page (`index.html`) is served by the same server.

---

## Source Map — All 7 Sources at a Glance

| # | Source | Type | Auth | Cost | Jobs available |
|---|---|---|---|---|---|
| 1 | Bundesagentur für Arbeit | Official REST API | Static public key | Free | 13,000+ Berlin |
| 2 | Arbeitnow | Public JSON API | None | Free | 10,000+ Germany |
| 3 | Greenhouse ATS | Public JSON endpoints | None | Free | 15 Berlin companies |
| 4 | Ashby ATS | Public JSON endpoints | None | Free | 5 companies |
| 5 | Recruitee ATS | Public JSON endpoints | None | Free | 2 companies |
| 6 | BA Odd Jobs | Official REST API (keyword mode) | Static public key | Free | 265+ Berlin odd jobs |
| 7 | Hotelcareer.com | HTML scraping | None | Free | 25+ Berlin hospitality |

---

## Source 1 — Bundesagentur für Arbeit (BA)

### Where we found it
Germany's federal employment agency runs the largest job database in Germany. Their web app uses a publicly reverse-engineered REST API documented by the open-source community at:
- GitHub: `https://github.com/bundesAPI/jobsuche-api`
- Docs mirror: `https://jobsuche.api.bund.dev`

There is no official developer program — the key is static and public. It is widely used in production by German researchers, startups, and data companies.

### Base URL
```
https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs
```

### Authentication
```
Header: X-API-Key: jobboerse-jobsuche
```
No registration. No signup. The key is hardcoded and permanent.

### Key query parameters

| Parameter | Values | Description |
|---|---|---|
| `wo` | `Berlin` | City or region |
| `umkreis` | `25` | Radius in km around `wo` |
| `angebotsart` | `1` | Job type: 1=job, 2=apprenticeship, 4=internship |
| `arbeitszeit` | `vz;tz;mj` | Employment type — see table below |
| `was` | `Küchenhilfe` | Keyword search (job title or description) |
| `page` | `1` | Page number (starts at 1) |
| `size` | `25` to `100` | Results per page |

**`arbeitszeit` values:**

| Code | Meaning |
|---|---|
| `vz` | Vollzeit (full-time) |
| `tz` | Teilzeit (part-time) |
| `mj` | Minijob (≤€556/month) |
| `snw` | Shift / night / weekend |
| `ho` | Remote / home office |

Multiple codes are joined with `;` — e.g. `arbeitszeit=tz;mj` returns both part-time and Minijob listings.

### Live curl examples

```bash
# Werkstudent + Minijob jobs in Berlin (25km radius)
curl -H "X-API-Key: jobboerse-jobsuche" \
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs\
?wo=Berlin&umkreis=25&arbeitszeit=tz;mj&angebotsart=1&page=1&size=25"

# Kitchen helper Minijobs specifically
curl -H "X-API-Key: jobboerse-jobsuche" \
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs\
?wo=Berlin&umkreis=25&arbeitszeit=mj&angebotsart=1&size=25&was=K%C3%BCchenhilfe"

# Warehouse jobs part-time
curl -H "X-API-Key: jobboerse-jobsuche" \
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs\
?wo=Berlin&umkreis=25&arbeitszeit=tz;mj&angebotsart=1&size=25&was=Lagerhelfer"
```

### Response structure (key fields)

```json
{
  "ergebnisliste": [
    {
      "stellenangebotsTitel": "Küchenhilfe (m/w/d)",
      "firma": "Restaurant XYZ GmbH",
      "referenznummer": "10000-1234567-S",
      "stellenlokationen": [
        { "adresse": { "ort": "Berlin", "plz": "10179" } }
      ],
      "datumErsteVeroeffentlichung": "2026-06-16",
      "externeURL": "https://company.com/apply",
      "arbeitszeitVollzeit": false,
      "istGeringfuegigeBeschaeftigung": true,
      "arbeitszeitTeilzeitFlexibel": true,
      "homeofficemoeglich": false
    }
  ],
  "maxErgebnisse": 13248,
  "page": 1,
  "size": 25
}
```

### Efficiency tips
- **Paginate**: use `page=1` through `page=N` until `ergebnisliste` is empty. Max `size=100` per request.
- **Deduplicate** by `referenznummer` — the same job can appear across keyword searches.
- **Refresh every 4 hours** — new jobs appear on BA within minutes of posting.
- **Don't URL-encode the semicolon** in `arbeitszeit=tz;mj` — the BA API expects the raw `;`.
- **Two-step detail fetch** (optional): `GET /pc/v4/jobdetails/{base64(referenznummer)}` returns the full description and salary. Not needed for the explorer but required for production ingestion.

---

## Source 2 — Arbeitnow

### Where we found it
Arbeitnow (`arbeitnow.com`) is a German job board specifically built for international talent. Founded by an Indian expat in Berlin — exact demographic overlap with Agora's users. They offer a completely free public JSON API with no auth required.

### Base URL
```
https://www.arbeitnow.com/api/job-board-api
```

### Authentication
None. No key, no signup, no header needed.

### Key query parameters

| Parameter | Values | Description |
|---|---|---|
| `page` | `1`, `2`, `3`… | Pagination (100 jobs per page) |

No location or job-type filter is available at the API level. Filtering happens client-side after fetching.

### Live curl example

```bash
curl "https://www.arbeitnow.com/api/job-board-api?page=1"
```

### Response structure

```json
{
  "data": [
    {
      "slug": "werkstudent-hr-berlin-270001",
      "title": "Werkstudent Human Resources (m/w/d)",
      "company_name": "Acme GmbH",
      "location": "Berlin, Germany",
      "remote": false,
      "url": "https://www.arbeitnow.com/jobs/...",
      "tags": ["HR", "Management"],
      "job_types": ["Working student", "hilfstätigkeit / student"],
      "description": "<p>...</p>",
      "created_at": 1718534400
    }
  ]
}
```

### How filtering works (important — `tags` vs `job_types`)
The `tags` field contains **job category labels** (e.g. `"Marketing"`, `"IT"`) — NOT employment type. Do not filter by tags for Werkstudent jobs.

Filter by `job_types` instead:

| Target | Filter for `job_types` containing |
|---|---|
| Werkstudent | `"working student"`, `"student"`, `"hilfstätigkeit"` |
| Minijob | `"mini"` |
| Part-time | `"part"` |
| Full-time | `"full"` |

Also check job **title** for keywords: `"werkstudent"`, `"studentenjob"`, `"minijob"`, `"teilzeit"`.

### Efficiency tips
- Fetch **3 pages** (300 jobs) for a good sample without overloading. Full dataset is ~10,000+ jobs across ~100 pages.
- Apply **client-side filtering** — the API has no server-side filter params beyond pagination.
- Refresh every **6 hours**.
- Use `created_at` (Unix timestamp) for sorting by recency: `new Date(job.created_at * 1000)`.
- **Partnership opportunity**: contact `contact@arbeitnow.com` (founder: Adithya Srinivasan) for a private API endpoint with location/type filtering — available for a small monthly fee.

---

## Source 3 — Greenhouse ATS

### Where we found it
Greenhouse is an Applicant Tracking System (ATS) used by hundreds of Berlin tech companies. When any company posts a job through Greenhouse, it is automatically published to a public JSON endpoint — no auth, no scraping, no robots.txt concerns. This is how professional job boards fill their inventory.

### Confirmed Berlin companies (15 verified slugs)

| Company | Slug | URL |
|---|---|---|
| HelloFresh | `hellofresh` | boards-api.greenhouse.io/v1/boards/hellofresh/jobs |
| Wooga | `wooga` | boards-api.greenhouse.io/v1/boards/wooga/jobs |
| Contentful | `contentful` | boards-api.greenhouse.io/v1/boards/contentful/jobs |
| Commercetools | `commercetools` | boards-api.greenhouse.io/v1/boards/commercetools/jobs |
| Trade Republic | `traderepublic` | boards-api.greenhouse.io/v1/boards/traderepublic/jobs |
| Wunderkind | `wunderkind` | boards-api.greenhouse.io/v1/boards/wunderkind/jobs |
| N26 | `n26` | boards-api.greenhouse.io/v1/boards/n26/jobs |
| Solarisbank | `solarisbank` | boards-api.greenhouse.io/v1/boards/solarisbank/jobs |
| Raisin | `raisin` | boards-api.greenhouse.io/v1/boards/raisin/jobs |
| Staffbase | `staffbase` | boards-api.greenhouse.io/v1/boards/staffbase/jobs |
| Scout24 | `scout24` | boards-api.greenhouse.io/v1/boards/scout24/jobs |
| Flaconi | `flaconi` | boards-api.greenhouse.io/v1/boards/flaconi/jobs |
| Grover | `grover` | boards-api.greenhouse.io/v1/boards/grover/jobs |
| HeyCAR | `heycar` | boards-api.greenhouse.io/v1/boards/heycar/jobs |
| GetYourGuide | `getyourguide` | boards-api.greenhouse.io/v1/boards/getyourguide/jobs |

### URL pattern
```
GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=false
```

Use `content=true` for full job description HTML (slower).

### Authentication
None.

### Live curl example

```bash
curl "https://boards-api.greenhouse.io/v1/boards/hellofresh/jobs?content=false"
```

### Response structure

```json
{
  "jobs": [
    {
      "id": 7981877,
      "title": "Werkstudent Marketing (all genders)",
      "location": { "name": "Berlin, Germany" },
      "absolute_url": "https://careers.hellofresh.com/global/en/job/7981877",
      "company_name": "HelloFresh",
      "first_published": "2026-06-05T09:00:04-04:00",
      "updated_at": "2026-06-05T09:00:04-04:00"
    }
  ]
}
```

### Efficiency tips
- Fetch all 15 companies **in parallel** (`Promise.allSettled`) — total time equals the slowest single request (~1–2 sec), not 15x that.
- Filter by `location.name` containing your search city, `"Germany"`, or `"Remote"` — Greenhouse companies post globally so location filtering is required.
- Handle **404s gracefully** — some company slugs become inactive when companies stop using Greenhouse. The server logs a warning and skips them.
- **How to find new company slugs**: check any company's career page URL. If it contains `boards.greenhouse.io/{slug}`, that is the slug.
- Use `content=false` for listing pages (faster). Only fetch `content=true` when you need the full job description.
- Refresh every **6 hours**.

---

## Source 4 — Ashby ATS

### Where we found it
Ashby is a modern ATS used by newer Berlin and European tech startups. Like Greenhouse, every company using Ashby automatically gets a public job board endpoint. It has the best **compensation data** of any ATS (clean salary ranges when companies choose to disclose).

### Confirmed companies (5 verified slugs)

| Company | Slug | URL |
|---|---|---|
| Lemon Markets | `lemon-markets` | api.ashbyhq.com/posting-api/job-board/lemon-markets |
| Preply | `preply` | api.ashbyhq.com/posting-api/job-board/preply |
| Choco | `choco` | api.ashbyhq.com/posting-api/job-board/choco |
| Enpal | `enpal` | api.ashbyhq.com/posting-api/job-board/enpal |
| Billie | `billie` | api.ashbyhq.com/posting-api/job-board/billie |

### URL pattern
```
GET https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
```

### Authentication
None.

### Live curl example

```bash
curl "https://api.ashbyhq.com/posting-api/job-board/enpal?includeCompensation=true"
```

### Response structure

```json
{
  "jobs": [
    {
      "id": "c5d48e7f-b563-4c56-8476-cd4cc6960457",
      "title": "Werkstudent Operations (f/m/d)",
      "department": "Operations",
      "employmentType": "PartTime",
      "location": "Berlin (Hybrid)",
      "isRemote": false,
      "workplaceType": "OnSite",
      "jobUrl": "https://jobs.ashbyhq.com/enpal/c5d48e7f",
      "applyUrl": "https://jobs.ashbyhq.com/enpal/c5d48e7f/application",
      "publishedAt": "2026-06-03T10:05:11.574+00:00",
      "compensation": {
        "compensationTierSummary": "€30,000–€40,000/year",
        "compensationTiers": []
      }
    }
  ],
  "apiVersion": "1.0"
}
```

### `employmentType` values

| Value | Meaning |
|---|---|
| `FullTime` | Vollzeit |
| `PartTime` | Teilzeit / Werkstudent |
| `Intern` | Praktikum |
| `Contractor` | Freelance |

### Efficiency tips
- Filter by `employmentType === "PartTime"` or `"Intern"` for Werkstudent/Teilzeit roles.
- Use `includeCompensation=true` — it adds salary data at no cost and is unique among ATS APIs.
- `workplaceType` values: `OnSite`, `Remote`, `Hybrid` — useful for remote filtering.
- **How to find new company slugs**: check career page URL for `app.ashbyhq.com/{slug}` or `jobs.ashbyhq.com/{slug}`.
- Refresh every **6 hours**.

---

## Source 5 — Recruitee ATS

### Where we found it
Recruitee is an ATS popular with German SMEs. Each company gets a public API endpoint at their subdomain. Uniquely, Recruitee exposes `max_hours_per_week` and `salary` data directly in the listing response.

### Confirmed companies (2 verified slugs)

| Company | Slug | URL |
|---|---|---|
| Rebuy | `rebuy` | rebuy.recruitee.com/api/offers/ |
| KFZ-Teile24 | `kfzteile24` | kfzteile24.recruitee.com/api/offers/ |

### URL pattern
```
GET https://{slug}.recruitee.com/api/offers/
```

### Authentication
None.

### Live curl example

```bash
curl "https://rebuy.recruitee.com/api/offers/"
```

### Response structure

```json
{
  "offers": [
    {
      "title": "Werkstudent E-Commerce (m/f/x)",
      "location": "Berlin, Germany",
      "country_code": "DE",
      "postal_code": "10999",
      "max_hours_per_week": "20",
      "on_site": true,
      "salary": {
        "min": null,
        "max": "15000",
        "period": "year",
        "currency": "EUR"
      },
      "careers_apply_url": "https://rebuy.recruitee.com/o/werkstudent/c/new",
      "updated_at": "2026-06-16 14:47:23 UTC"
    }
  ]
}
```

### Efficiency tips
- Use `max_hours_per_week < 36` as a heuristic to filter part-time roles.
- `on_site: false` means remote.
- **How to find new company slugs**: check career page URL for `{slug}.recruitee.com`.
- Refresh every **6 hours**.

---

## Source 6 — BA Odd Jobs (Keyword Mode)

### What it is
The same Bundesagentur API as Source 1, but used in **keyword search mode** with 16 specific German job title keywords relevant to hospitality, logistics, and odd jobs. Each keyword runs as a parallel search request.

### The 16 keywords and their domains

| Keyword | Domain | Typical jobs |
|---|---|---|
| `Küchenhilfe` | Kitchen | Kitchen helper |
| `Küchenhelfer` | Kitchen | Kitchen helper (alt. spelling) |
| `Hilfskoch` | Kitchen | Chef assistant |
| `Spüler` | Kitchen | Dishwasher |
| `Spülkraft` | Kitchen | Dishwasher (alt.) |
| `Servicekraft` | Service | Service staff |
| `Kellner` | Service | Waiter |
| `Barkeeper` | Bar | Bartender |
| `Housekeeping` | Hotel | Hotel room cleaning |
| `Reinigungskraft` | Cleaning | Cleaning staff |
| `Zimmermädchen` | Hotel | Hotel housekeeper |
| `Lagerhelfer` | Warehouse | Warehouse helper |
| `Kommissionierer` | Warehouse | Order picker |
| `Paketzusteller` | Delivery | Package delivery (DHL etc.) |
| `Zusteller` | Delivery | Delivery person |
| `Aushilfe` | General | General assistant / temp work |

### Job counts confirmed (Berlin, Minijob+Teilzeit, June 2026)

| Keyword | Jobs available |
|---|---|
| Reinigungskraft | 396 |
| Servicekraft | 199 |
| Aushilfe | 265 |
| Küchenhilfe | 53 |
| Küchenhelfer | 60 |
| Zusteller | 44 |
| Kommissionierer | 37 |
| Lagerhelfer | 26 |
| Paketzusteller | 17 |
| Kellner | 17 |
| Spüler | 15 |
| Spülkraft | 14 |
| Housekeeping | 12 |
| Barkeeper | 11 |

**Total: ~1,200+ unique Berlin odd jobs available** via keyword searches. The explorer fetches 25 per keyword (adjustable).

### How it runs
All 16 keyword searches execute in parallel. Results are deduplicated by `referenznummer` before being returned to the UI. A blank keyword search runs all 16. A specific keyword (e.g. "Kitchen") narrows to only matching domain groups.

### Efficiency tips
- Run keyword searches **in parallel** — all 16 complete in ~2–3 seconds total.
- **Deduplicate within the source** — the same DHL Paketzusteller job may appear under both `Paketzusteller` and `Zusteller`.
- The `arbeitszeit=mj;tz` filter is applied globally — you only get Minijob and Teilzeit results, not Vollzeit.
- DHL / Deutsche Post posts hundreds of `Paketzusteller` Minijob positions constantly via BA — this is the single biggest Berlin employer of students in the logistics category.
- Refresh every **4 hours**.

---

## Source 7 — Hotelcareer.com

### Where we found it
Hotelcareer.com is an international hospitality job board with strong German coverage. It lists temporary/part-time positions and Minijob roles for hotels and restaurants in Berlin. The page returns fully server-rendered HTML — no JavaScript rendering needed — making it parseable via standard HTTP fetch.

### Target URL
```
https://www.hotelcareer.com/jobs/temporary-job-berlin
```

### Authentication
None. Standard HTTP GET with a browser User-Agent header.

### How parsing works
The page contains job cards in this HTML structure:

```html
<a href="/jobs/{company-slug}/{job-slug}?rltr=mb" class="link-blue-none">
  <h2 class="font-size-l">Servicemitarbeiter (m/w/d) Minijob/Nebenjob</h2>
</a>
<em>Restaurant Solar</em>
<div class="ycg-job-metadata">
  <span><i class="ycg-i ycg-i-location"></i>Berlin</span>
  <span><i class="ycg-i ycg-i-info"></i>Temporary job</span>
  <span><i class="ycg-i ycg-i-calendar"></i>06/16/2026</span>
</div>
```

Extracted fields: title, company, location, job type, posted date, apply URL (`https://www.hotelcareer.com` + href).

### Live curl example

```bash
curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  "https://www.hotelcareer.com/jobs/temporary-job-berlin" | grep "font-size-l"
```

### More Berlin hospitality URLs to add later

```
https://www.hotelcareer.com/jobs/kitchen-helper-berlin
https://www.hotelcareer.com/jobs/waiter-berlin
https://www.hotelcareer.com/jobs/housekeeping-berlin
https://www.hotelcareer.com/jobs/chef-berlin
```

### Efficiency tips
- Always send a browser `User-Agent` header — the server may block or rate-limit bot requests without it.
- Parse with **regex on the HTML** (not a DOM parser) since the page is simple and consistent.
- Date format in response is `MM/DD/YYYY` — convert to `YYYY-MM-DD` for storage.
- Refresh every **12 hours** — hospitality listings turn over slower than tech ATS feeds.
- **Partnership opportunity**: email `info@hogapage.de` or the hotelcareer contact form. Proposing attribution + click tracking may get you a data feed or priority access.

---

## Sources That Were Investigated and Ruled Out

| Source | Reason ruled out |
|---|---|
| HOGAPAGE | API requires login (HTTP 401). Jobs are not in server-rendered HTML — loaded via authenticated AJAX. |
| jobicco Berlin | All category URLs return 404 — website restructured or offline. |
| Studyheads.de | Main jobs page returns 404. |
| Lever ATS | All tested Berlin company slugs return 404 — these companies have migrated to other ATS platforms. |
| Personio XML feed | Returns 307 redirect → Vercel Security Checkpoint (429 rate-limit on server-side fetch). |
| LinkedIn | ToS prohibits scraping. Active legal enforcement. |
| JSearch / Google for Jobs | Requires RapidAPI key (free tier available — not integrated yet, can be added). |

---

## Adding a New Company to an ATS Source

### Step 1 — Identify the ATS
Visit the company's career page. The URL pattern tells you which ATS they use:

| URL pattern | ATS |
|---|---|
| `boards.greenhouse.io/{slug}` | Greenhouse |
| `jobs.lever.co/{slug}` | Lever |
| `app.ashbyhq.com/{slug}` | Ashby |
| `jobs.ashbyhq.com/{slug}` | Ashby |
| `{slug}.jobs.personio.de` | Personio |
| `{slug}.recruitee.com` | Recruitee |
| `apply.workable.com/{slug}` | Workable |

### Step 2 — Verify the endpoint is live

```bash
# Greenhouse
curl -s -o /dev/null -w "%{http_code}" \
  "https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=false"

# Ashby
curl -s -o /dev/null -w "%{http_code}" \
  "https://api.ashbyhq.com/posting-api/job-board/{slug}"

# Recruitee
curl -s -o /dev/null -w "%{http_code}" \
  "https://{slug}.recruitee.com/api/offers/"
```

A `200` response means the endpoint is live. A `404` means the company slug is wrong or the company does not use this ATS.

### Step 3 — Add to server.js

Open `server.js` and add the company to the appropriate array:

```javascript
// Greenhouse
const GREENHOUSE_COMPANIES = [
  ...existing entries...,
  { slug: 'newcompany', name: 'New Company Name' },  // ← add here
];

// Ashby
const ASHBY_COMPANIES = [
  ...existing entries...,
  { slug: 'newcompany', name: 'New Company Name' },
];

// Recruitee
const RECRUITEE_COMPANIES = [
  ...existing entries...,
  { slug: 'newcompany', name: 'New Company Name' },
];
```

No other changes needed — the server fetches all companies in the array automatically.

---

## Adding a New Odd Jobs Keyword

Open `server.js` and add to `BA_ODD_JOB_KEYWORDS`:

```javascript
const BA_ODD_JOB_KEYWORDS = [
  ...existing entries...,
  { kw: 'Eventhelfer', domain: 'events' },   // ← add here
  { kw: 'Promoter',    domain: 'events' },
  { kw: 'Kassierer',   domain: 'retail' },
];
```

The keyword (`kw`) is the German job title sent to the BA API `was=` parameter. The `domain` is a label used for filtering and tagging — use any descriptive string.

---

## Cost Summary

| Source | Monthly cost |
|---|---|
| Bundesagentur für Arbeit | €0 |
| Arbeitnow | €0 (or small fee for private API) |
| Greenhouse ATS | €0 |
| Ashby ATS | €0 |
| Recruitee ATS | €0 |
| BA Odd Jobs | €0 (same API) |
| Hotelcareer.com | €0 |
| **Total** | **€0** |

---

## Refresh Schedule (for production use)

| Source | Recommended cadence | Reason |
|---|---|---|
| Bundesagentur für Arbeit | Every 4 hours | New jobs appear within minutes |
| Arbeitnow | Every 6 hours | Board refreshes daily |
| Greenhouse (all companies) | Every 6 hours | Companies post weekly |
| Ashby (all companies) | Every 6 hours | Companies post weekly |
| Recruitee (all companies) | Every 6 hours | Companies post weekly |
| BA Odd Jobs | Every 4 hours | Minijob listings turn over quickly |
| Hotelcareer.com | Every 12 hours | Hospitality listings are slower |

---

*This document covers the Job Explorer prototype tool only. For the production Agora ingestion pipeline, see the Drizzle schema and Celery task specifications in the Agents documentation.*
