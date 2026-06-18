# ATS Rules — How Modern Applicant Tracking Systems Parse CVs

**Purpose:** Engineering reference for the Agora Jobs CV optimization engine. Defines what the ATS-safety checker must enforce, warn on, and ignore.

**Evidence legend:**
- ✅ **Verified** — survived adversarial fact-checking (3-of-3 independent verifiers, multiple sources)
- 📋 **Convention** — widely-followed industry practice; not independently proven but low-risk and consistent across reputable guides
- ❌ **Debunked** — a popular claim that **failed** verification. Do **not** build the tool around these.

> **Scope warning:** Every source verified here is US/UK-centric. None covered German/EU ATS behavior, `Tabellarischer Lebenslauf` conventions, or GDPR-relevant resume handling. Because Agora Jobs is Germany-first, treat the rules below as the **ATS-safe base layer** and layer German conventions on top (see `03-Universal-CV-Structure.md`).

---

## 1. How Parsing Actually Works (Mental Model)

An ATS does **not** "read" a CV the way a human does. It runs a **text-extraction pass** that converts the file into a linear stream of text, then a **field-mapping pass** that tries to bucket that text into structured fields (name, email, work history, dates, skills).

Two failure modes matter:
1. **Extraction failure** — text is lost or scrambled before mapping even starts (headers/footers dropped, columns interleaved, images ignored).
2. **Mapping failure** — text is extracted fine but lands in the wrong field (a job title read as a company, dates attached to the wrong role).

The tool's job is to minimize both. Most "ATS rejection" is really *extraction/mapping degradation* that lowers a recruiter-side match score — not a hard binary reject.

---

## 2. Formatting Requirements

### ✅ Single-column layout is the safe default
Many ATS systems misread multi-column layouts. A single-column, top-to-bottom flow is the most reliably parsed structure.
- **Do:** lay the CV out as one column, sections stacked vertically.
- **Don't:** use a sidebar for skills/contact with the main content beside it.
- **Nuance:** column count *alone* rarely triggers an outright auto-reject (see Debunked §7) — but single-column removes the risk entirely, so it's the correct default for a tool that optimizes for the worst case.
- *Source: Jobscan resume scanner criteria.*

### ✅ Remove tables, text boxes, headers, footers, and graphics
These elements are flagged by resume scanners as parsing hazards. Content inside text boxes and graphics is frequently skipped; tables can scramble cell order.
- **Do:** express everything as plain paragraphs and simple bulleted lists.
- **Don't:** put skills in a table grid, wrap a profile summary in a text box, or place a skills bar chart as an image.
- *Source: Jobscan resume scanner criteria.*

### 📋 Use standard, embedded fonts
- **Do:** use common sans-serif or serif fonts (Arial, Calibri, Helvetica, Georgia, Times New Roman).
- **Don't:** use decorative/display fonts or fonts that may not embed, which can render as missing glyphs on extraction.

### 📋 Avoid columns created by tabs/spaces or multi-column page layout
Even visually "single-column-looking" CVs can hide a two-column table underneath. The checker should inspect the underlying document structure, not just the visual.

---

## 3. Contact Information Placement

### ✅ Contact info must live in the document body — never the header/footer
Most ATS skip the header and footer layer entirely; it exists as a separate document layer from the main body text. A contact block placed in the Word header can cause the candidate's **name, email, and phone to silently vanish** from the parsed record.
- **Do:** put name, email, phone, city, and links as normal body text at the very top of page 1.
- **Don't:** use Word's Header/Footer area for any contact detail (or anything else you need parsed).
- **Why it matters:** this is one of the highest-leverage, most-overlooked rules — the failure is silent, and it kills the most important field.
- *Sources: Jobscan resume scanner criteria; cvcraft 2026 formatting guide.*

---

## 4. File Type Preferences

### ✅ DOCX parses more reliably than PDF
DOCX is XML with a guaranteed text-extraction order (`word/document.xml` stores runs sequentially). PDF text ordering depends on the producing application's internal text ordering and can be scrambled, especially for untagged PDFs.
- **Do:** default the tool's primary export to **DOCX** for ATS submission.
- **Do:** still offer PDF for human-facing / email / portal uploads where the recruiter reads it directly.
- **Don't:** assume PDF and DOCX are interchangeable for parsing (the "they're equal" claim was specifically refuted — see Debunked §7).
- **Caveat:** "guaranteed" is slightly overstated — a DOCX with tables/columns/text boxes can still scramble. DOCX is safer *only* when combined with the single-column, no-table rules above.
- *Source: resumeoptimizerpro parser mechanics; corroborated by W3C WCAG PDF reading-order docs.*

### 📋 Never submit images or scanned CVs
A scanned/photo CV requires OCR that most ATS don't run. Export real text, never a flattened image.

---

## 5. Section Naming Conventions

### 📋 Use conventional, literal section headings
The field-mapping pass keys off recognizable section labels. Creative labels can prevent a section from being mapped.
- **Do:** `Work Experience` / `Experience`, `Education`, `Skills`, `Summary`, `Certifications`.
- **Don't:** `Where I've Made Magic`, `My Journey`, `What I'm Good At`.

### 📋 Keep one heading concept per section
Don't merge "Skills & Interests & Awards" into one block — split them so each maps cleanly.

---

## 6. Keyword Matching Logic

### 📋 Match the job description's terminology, including exact phrasing and acronym+expansion
ATS/recruiter-side scoring favors resumes whose terms align with the posting.
- **Do:** mirror the JD's nouns and skill names; include **both** the acronym and the spelled-out form on first use ("Search Engine Optimization (SEO)") so either query matches.
- **Do:** place keywords naturally inside experience bullets and a skills list — context-bearing, not a dump.
- **Don't:** keyword-stuff. Hidden white text, repeated keyword walls, and stuffing are detectable and hurt with human reviewers (and stuffing was confirmed as an underperformer — see `02-Human-Psychology.md`).

> ⚠️ **Evidence caveat:** the specific *mechanism* often quoted — "recruiters type into a keyword search bar and only matching resumes surface" — **failed verification** (see Debunked §7). Keyword alignment still matters, but build the tool on "mirror the JD's language and place it naturally," not on an unverified search-bar model. Real systems mix exact and semantic matching; don't over-fit to exact-token logic.

---

## 7. ❌ Debunked Claims — Do NOT Build These In

These were popular claims that **failed** adversarial verification. Encoding them would make the tool wrong.

| Debunked claim | Verdict | What to do instead |
|---|---|---|
| "Multi-column **always breaks** parsing; ~34% of parse errors come from two columns; Lever returns an empty skills array on two columns" | Refuted (0–3) | Recommend single-column as *safer*, but don't claim multi-column is an automatic failure or cite fake percentages. |
| "Multi-column breaks because parsers read strictly left-to-right across both columns in one stream" | Refuted (0–3) | This *mechanism* is wrong. Don't explain column risk this way in user-facing copy. |
| "PDF parses nearly identically to DOCX (96% vs 95%)" | Refuted (0–3) | Keep DOCX as the safer default; don't tell users PDF is equivalent. |
| "Modern ATS parse double-column equal to or better than single (98–99% vs 95%)" | Refuted (0–3) | Don't reassure users that columns are fine. |
| "Skills sections are the weakest-parsed section (65% single / 46% double)" | Refuted (0–3) | Don't single out skills as uniquely fragile; no verified per-section parse rates exist. |
| "Specific table behavior: Taleo reads cells randomly, Workday merges same-row cells, iCIMS skips tables" | Refuted (1–2) | Avoid tables generally, but don't make per-vendor claims you can't source. |
| "ATS keyword matching = recruiter search bar; only matching resumes surface" | Refuted (1–2) | Use "mirror JD language naturally," not the search-bar model. |

> **Why this table exists:** a CV tool's credibility dies the moment a user catches it repeating a debunked statistic. The verified middle ground is conservative: *single-column + DOCX + no tables/headers/footers are safer defaults; no single format guarantees parsing; column count alone rarely auto-rejects.*

---

## 8. Implementation Checklist (for the ATS-safety checker)

Hard checks (block/strong-warn):
- [ ] Contact details present in body text, not in header/footer
- [ ] No content in document header or footer layer
- [ ] No tables, text boxes, or images containing text
- [ ] Single-column underlying structure (not just visually)
- [ ] Standard section headings recognized (Experience, Education, Skills…)
- [ ] Real selectable text (not a scanned image)
- [ ] DOCX available as the ATS export format

Soft checks (advise):
- [ ] JD keywords mirrored naturally in experience + skills
- [ ] Acronyms given with expansion on first use
- [ ] No keyword stuffing / hidden text
- [ ] Common embedded font
- [ ] Dates in a consistent, parseable format (see Universal Structure)

---

## Sources

- Jobscan — Resume Scanner criteria: https://www.jobscan.co/resume-scanner *(secondary; vendor)*
- cvcraft — Can ATS Read Tables/Columns/Formatting 2026: https://cvcraft.roynex.com/blog/can-ats-read-tables-columns-formatting-2026 *(blog)*
- ResumeOptimizerPro — How Resume Parsers Actually Work: https://resumeoptimizerpro.com/blog/how-resume-parsers-actually-work *(blog)*
- Jobscan — Resume Keyword Stuffing: https://www.jobscan.co/blog/resume-keyword-stuffing/ *(blog)*
- W3C WCAG — PDF reading order (corroborating mechanism for DOCX-vs-PDF)

*Refuted-claim sources (cited for transparency, not as rules): enhancv "Busting ATS Myths"; resumeoptimizerpro; cvcraft.*

*Compiled from the Agora Jobs deep-research run (6 angles, 25 sources fetched, 114 claims extracted, 25 adversarially verified, 11 confirmed / 14 killed). Last updated June 2026.*
