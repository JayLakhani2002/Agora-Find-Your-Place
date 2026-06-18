# Human Psychology — Why a Reviewer Approves a CV on First Glance

**Purpose:** Engineering + design reference for what the Agora Jobs CV engine should optimize *after* a CV clears the ATS layer. Once a human looks at it, a different set of rules decides "yes / maybe / no" in seconds.

**Evidence legend:**
- ✅ **Verified** — survived adversarial fact-checking (3-of-3 verifiers, multiple sources)
- 📋 **Convention** — established practice, lower-grade evidence, low risk
- ❌ **Debunked** — popular claim that **failed** verification; do not build on it

> **Source-quality warning:** the headline psychology evidence rests heavily on **one** study — the 2018 Ladders, Inc. eye-tracking study (~30 recruiters, vendor-commissioned, undisclosed methodology). Its *qualitative* findings replicate well and are corroborated by independent work; its *precise numbers* are contested. The tool should cite the study, not present its figures as universal law.

---

## 1. The "Few-Seconds" First Pass

### ✅ Recruiters spend ~7.4 seconds on initial screening (2018 Ladders study)
The initial screen is a fast filter, not a read. The figure rose from ~6 seconds (2012) to ~7.4 seconds (2018) in the Ladders eye-tracking studies.
- **Design implication:** the CV must communicate fit in roughly **one screen, in under ten seconds**. Everything that decides the first pass must be above the fold.
- **Copy guidance:** in user-facing text, say *"~7.4 seconds, per the 2018 Ladders eye-tracking study"* — attribute it. Do **not** state a bare "6-second rule" or "7.4 seconds" as established fact.
- *Sources: HR Dive; HR Daily Advisor; Ladders PRNewswire release.*

### ❌ Do not use the bare "6-second rule"
The flat claim that recruiters spend "only about 6 seconds" was **refuted (0–3)** — it's outdated and was superseded by the 7.4s figure, which is itself contested. The defensible statement is the *attributed* one above.

---

## 2. What the Eye Actually Lands On

### ✅ Reviewers skim superficial, scannable elements — not prose
During the brief scan, attention goes to **layout, job titles, text flow, and keywords** — surface signals — rather than a careful reading of sentences.
- **Do:** make **job titles** and **company names** visually prominent near the top.
- **Do:** front-load **role-relevant keywords** where the eye travels first.
- **Do:** ensure clean **text flow** — a predictable top-to-bottom path with no visual detours.
- **Don't:** bury the most relevant title/skill in the middle of a dense paragraph.
- *Sources: Ladders PRNewswire; HR Daily Advisor.*

> ❌ **Debunked specifics — do not encode:**
> - "Recruiters spend ~80% of time on six specific data points (name, current title/company, dates, previous title/company, education)" — refuted (1–2).
> - "Beyond those six points they only keyword-scan; prose has *no* impact" — refuted (0–3).
> - "F-pattern / E-pattern reading governs resume scanning" — refuted (1–2).
> - "Visual hierarchy yields 6.2 vs 3.9 usability (60% improvement)" — refuted (0–3).
>
> The robust takeaway is the **direction** (titles + keywords + clean flow get the attention), not these precise mechanisms or numbers.

---

## 3. Cognitive Load & Visual Hierarchy

### ✅ Clean beats cluttered — the strongest, most-replicated finding
Resumes with **simple layouts, clear sections, distinct heading titles, and ample white space** perform better on first glance. Resumes that are **cluttered — multiple columns, long sentences, little white space, keyword stuffing — underperform** with reviewers.
- **Do:** generous white space; clear section breaks; short, punchy bullets; one clear column.
- **Don't:** wall-to-wall text, long sentences, multi-column density, or stuffing keywords to fill space.
- **Why it's powerful:** this finding **aligns the human and the ATS layer** — both prefer single-column, clearly-sectioned, no-stuffing CVs. The tool isn't trading one off against the other; the same template wins both. This is the spine of the universal template.
- *Sources: HR Dive; Ladders PRNewswire; corroborated by an academic résumé-layout study and a Big-Tech recruiter preference test (~70% chose clean/minimalist).*

### 📋 Reduce decisions per second
Cognitive-load logic: every competing visual element (a second column, a color block, an icon row) is another thing the eye must arbitrate during a 7-second window. Fewer elements = faster "this fits" judgment.

---

## 4. Trust Signals

> Lower-grade evidence here (the dedicated "social proof" source was rated unreliable and contributed no verified claims). Treat as 📋 convention, applied conservatively.

### 📋 Concrete, quantified outcomes read as credible
Numbers, named tools, and specific results signal a real track record rather than vague self-description.
- **Do:** "Cut report turnaround from 5 days to 1 using Power BI" — specific, checkable.
- **Don't:** "Highly motivated team player with excellent communication skills" — unfalsifiable filler.
- **Tie-in:** this is exactly the Ari "X → Y → Z" framing (used X to achieve Y in Z time/budget) the apply flow is built around.

### 📋 Recognizable anchors lower perceived risk
Known employer names, well-known tools, recognized certifications, and reputable institutions act as fast trust shortcuts. Surface them where the eye lands early.

### 📋 Consistency itself is a trust signal
Uniform date formats, aligned bullets, consistent tense, and no typos read as conscientiousness. Sloppiness reads as risk — and is one of the few things a reviewer *will* reject on in seconds.

---

## 5. Social Proof

> ❌ The dedicated social-proof source failed quality review; no verified claims. Keep this section as **conservative convention**, do not over-promise in product copy.

### 📋 Borrowed credibility, used sparingly
- **Do:** include a brief, verifiable signal where natural — a notable client/employer, a measurable award, a recognized credential.
- **Don't:** invent endorsements, pad with vanity metrics, or rely on social proof in place of concrete results.

---

## 6. Design Implications for the CV Engine

What the human-layer findings tell the tool to optimize:

1. **Above-the-fold fit in <10s** — name, target title, and 2–3 strongest role-matched signals must sit in the top third of page 1.
2. **Prominent job titles + company names** — these are where the eye goes; weight them in the visual hierarchy.
3. **Front-loaded keywords** — relevant terms early in each bullet, not buried.
4. **White space as a feature** — the generator should resist cramming; protect margins and inter-section spacing even when content is long (cut content instead).
5. **Quantified bullets by default** — Ari should *ask for* the number/tool/timeframe when a bullet lacks one (the X→Y→Z prompt).
6. **Consistency enforcement** — automated checks for uniform dates, tense, and bullet structure; flag typos.
7. **The same template serves ATS and humans** — don't build a "pretty" mode that breaks parsing; clean-single-column wins both audiences.

---

## 7. ❌ Debunked — Quick Reference

| Claim | Verdict |
|---|---|
| Flat "recruiters spend ~6 seconds" | Refuted (0–3) |
| "~80% of time on six data points" | Refuted (1–2) |
| "Prose has no impact beyond keyword scan" | Refuted (0–3) |
| "F-pattern/E-pattern governs scanning" | Refuted (1–2) |
| "Clear hierarchy → 6.2 vs 3.9 usability (60%)" | Refuted (0–3) |
| Bare unattributed "7.4 seconds is fact" | Refuted (0–3) — must be attributed to the study |

---

## Sources

- HR Dive — Eye-tracking study, recruiters ~7 seconds: https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/ *(secondary)*
- HR Daily Advisor — 7.4 seconds reviewing a resume: https://hrdailyadvisor.hci.org/2018/11/15/eye-tracking-recruiters-average-7-4-seconds-reviewing-a-resume/ *(secondary)*
- Ladders / PRNewswire — Updated recruiter eye-tracking study: https://www.prnewswire.com/news-releases/ladders-updates-popular-recruiter-eye-tracking-study-with-new-key-insights-on-how-job-seekers-can-improve-their-resumes-300744217.html *(primary)*
- The Ladders Eye-Tracking Study (PDF, hosted at BU): https://www.bu.edu/com/files/2018/10/TheLadders-EyeTracking-StudyC2.pdf *(primary)*

*Compiled from the Agora Jobs deep-research run. Psychology findings rest primarily on the 2018 Ladders study — cite it, don't absolutize it. Last updated June 2026.*
