# Universal CV Structure — A Master Template for ATS + Human Reviewers

**Purpose:** The canonical CV structure the Agora Jobs generation engine produces by default. It satisfies the **ATS parsing layer** (`01-ATS-Rules.md`) and the **human first-glance layer** (`02-Human-Psychology.md`) at the same time — these two audiences want the *same* clean, single-column, clearly-sectioned document, which is why one template can serve both.

**Evidence legend:** ✅ Verified · 📋 Convention · ❌ Debunked

> **Germany / EU adaptation:** the verified research is US/UK-centric. The Agora Jobs market is Germany-first, where the `Tabellarischer Lebenslauf` has its own conventions. The structure below is the **ATS-safe universal base**; treat German specifics (photo norms, personal-data lines, signed/dated CV, page-length expectations) as a **configurable layer** on top — see §8. Build the base first.

---

## 0. Global Rules (apply to every section)

✅ Verified base:
- **One column**, top-to-bottom flow.
- **No tables, text boxes, headers, footers, or text-bearing images.**
- **Contact info in the body**, never in the document header/footer layer.
- **DOCX for ATS submission**; PDF for direct human/email reads.

📋 Convention:
- Standard embedded font; 10–12pt body.
- Generous white space and consistent spacing between sections.
- Consistent date format throughout (recommend `MM/YYYY`).
- Reverse-chronological order within Experience and Education.
- Length: 1 page early-career; up to 2 pages with real experience. (German full-time CVs may run longer — see §8.)

---

## 1. Header (Contact Block)

**Goal:** instant identification + every contact route, parseable.

✅/📋 Rules:
- Place as **normal body text at the very top of page 1** — not in the Word header.
- Include: Full name · target job title (optional but recommended) · phone · professional email · city/region · LinkedIn (and GitHub/portfolio if relevant).
- Name as the largest text element on the page.

**Do:**
```
JANE OKONKWO
Werkstudent — Data Analytics
jane.okonkwo@email.com · +49 151 2345 6789 · Berlin, DE
linkedin.com/in/janeokonkwo · github.com/jokonkwo
```

**Don't:**
- ❌ Put any of this in the Word Header/Footer (silently dropped by most ATS).
- ❌ Use an icon-only contact row (icons are images; the address may not extract).
- ❌ Add a photo *for ATS-targeted versions* (US/UK convention; see §8 for the German nuance).

---

## 2. Summary / Profile

**Goal:** in the ~7-second scan, state who you are and why you fit — above the fold.

📋 Rules:
- 2–4 lines, role-targeted, tailored per job (this is per-application in Agora's apply flow).
- Lead with the target role + strongest 2–3 matched signals (skills, domain, a headline result).
- Mirror the job description's core terminology naturally.

**Do:** "Computer-science Werkstudent with 1 year building Python data pipelines. Cut a reporting job from 5 days to 1 with automated ETL. Seeking a 20-hr/week analytics role in Berlin."

**Don't:** ❌ "Hard-working, motivated individual seeking opportunities to grow and add value." (Unfalsifiable, no keywords, wastes the highest-value space.)

---

## 3. Work Experience

**Goal:** the section reviewers' eyes land on. Titles prominent, results quantified.

✅/📋 Rules:
- Reverse-chronological.
- Each entry: **Job Title — Company — Location — MM/YYYY–MM/YYYY**, in a consistent order every time.
- Make **job title** visually prominent (the eye seeks it).
- 3–6 bullets per role; each a short, single-idea line.
- **Quantify by default** using the X→Y→Z frame: *used [X tool/skill] to achieve [Y measurable result] in [Z time/scope/budget]*.
- Start bullets with strong past-tense verbs; mirror JD keywords where honest.

**Do:** "Automated weekly KPI reporting in Power BI, cutting turnaround from 5 days to 4 hours across 3 teams."

**Don't:**
- ❌ "Responsible for various reporting tasks and other duties as assigned."
- ❌ Long multi-clause sentences (underperform on the scan).
- ❌ A two-column "skills beside experience" layout (parsing + clutter risk).

> Ari's impact-question step exists to fill the X/Y/Z a user forgot — this section is where those answers land.

---

## 4. Skills

**Goal:** dense, parseable keyword surface that matches the JD without stuffing.

✅/📋 Rules:
- Simple comma- or bullet-list under a literal `Skills` heading — **not** a table, bar chart, or rating-dots graphic.
- Group logically (e.g., Languages / Tools / Methods) using plain text labels.
- Include both acronym and expansion on first use ("Search Engine Optimization (SEO)").
- Mirror the JD's exact skill terms where the candidate genuinely has them.

**Do:** `Python, SQL, Pandas, Power BI, ETL, Git, German (B2), English (C1)`

**Don't:**
- ❌ Skill bars / star ratings (images → unparseable; also low information).
- ❌ Keyword stuffing or hidden white-text keyword walls (hurts with humans; detectable).
- ❌ A multi-column skills grid.

> ❌ **Note:** the claim that "skills sections are the weakest-parsed section" was **refuted** — don't treat skills as uniquely fragile; just keep it plain-text.

---

## 5. Education

**Goal:** clean, mappable credentials. Critical for the international-student use case (degree, institution, field drive eligibility + matching).

📋 Rules:
- Reverse-chronological.
- Each entry: **Degree, Field — Institution — Location — (expected) MM/YYYY**.
- Students: lead with Education if it's the strongest signal and experience is thin.
- Include field of study explicitly (feeds Agora's education-stream matching).

**Do:** "B.Sc. Computer Science — TU Berlin — Berlin, DE — Expected 07/2027"

**Don't:** ❌ Bury the degree field, or omit dates (ATS attaches dates to the wrong entry without them).

---

## 6. Optional Sections (include only if they add signal)

📋 — Certifications · Projects · Languages · Publications · Volunteer work.
- Same rules: literal heading, plain text, reverse-chronological, quantified where possible.
- **Certifications** matter for Agora's matching layer — list issuer + date.
- **Languages** with CEFR levels (e.g., German B2, English C1) — high value in the German market.

---

## 7. Master Template (assembled)

```
[FULL NAME]                          ← largest element, body text, top of page 1
[Target Title] · [phone] · [email] · [city] · [LinkedIn] · [portfolio]

SUMMARY
2–4 role-targeted lines, strongest matched signals first, JD terms mirrored.

WORK EXPERIENCE
Job Title — Company — Location — MM/YYYY–MM/YYYY
• [Verb] [X tool] to achieve [Y quantified result] in [Z scope/time]
• …

EDUCATION
Degree, Field — Institution — Location — (Expected) MM/YYYY

SKILLS
Plain comma/bullet list, grouped, JD-mirrored, acronyms expanded once.

CERTIFICATIONS / PROJECTS / LANGUAGES   ← optional, only if they add signal
```

All single-column. No tables/boxes/images. Contact in body. Export DOCX for ATS.

---

## 8. 🇩🇪 Germany / EU Configurable Layer (build on top of the base)

> These are **conventions to make configurable**, flagged because the verified sources did not cover them. Validate against German hiring norms before locking defaults.

- **Tabellarischer Lebenslauf:** the standard German CV is a tabular-style, factual, reverse-chronological document. Keep it visually clean and single-column at the *parsing* level even when it looks tabular.
- **Photo:** still common/expected on many German CVs — but **omit on ATS-targeted versions** and offer it as a toggle, since photos are images and risk parsing/bias issues. Make this a clear user choice.
- **Personal data lines:** German CVs sometimes include data (date of birth, nationality) — make optional and GDPR-aware; never required.
- **Signature & date:** a dated, signed CV is a German convention for the human-facing version; not for ATS.
- **Page length:** German full-time CVs may run 2+ pages with full history; keep the student/Werkstudent/Minijob default short.
- **Language:** German-language CV for German-language roles; mirror the posting's language (Agora already switches DE/EN per job).

> **Open question for product:** decide whether the tool ships **two explicit modes** — "ATS-Safe" (strict single-column, no photo) vs. "Human/German" (photo, signature, richer layout) — generated from the same content. The research supports keeping the *parsing-safe* structure underneath both.

---

## 9. ❌ Debunked — Don't Bake Into the Template

- "Multi-column is fine / parses better" — refuted. Stay single-column.
- "PDF == DOCX for parsing" — refuted. DOCX for ATS.
- "Skills section parses worst" — refuted. Just keep it plain-text.
- "6-second rule" as bare fact / "80% on six data points" / "F-pattern governs scanning" — refuted. Optimize for clean above-the-fold fit, not these specifics.

---

## Sources

- HR Dive — recruiter eye-tracking (clean layouts win): https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/
- Ladders / PRNewswire — cluttered vs. simple layout findings: https://www.prnewswire.com/news-releases/ladders-updates-popular-recruiter-eye-tracking-study-with-new-key-insights-on-how-job-seekers-can-improve-their-resumes-300744217.html
- Jobscan — Resume Scanner (single-column, body-contact, no tables): https://www.jobscan.co/resume-scanner
- cvcraft — header/footer skipped by ATS: https://cvcraft.roynex.com/blog/can-ats-read-tables-columns-formatting-2026
- resumeoptimizerpro — DOCX vs PDF extraction order: https://resumeoptimizerpro.com/blog/how-resume-parsers-actually-work

*The universal template is the convergence point of the ATS and human findings: single-column, clearly-sectioned, quantified, no stuffing. Germany-specific conventions layer on top and need local validation. Last updated June 2026.*
