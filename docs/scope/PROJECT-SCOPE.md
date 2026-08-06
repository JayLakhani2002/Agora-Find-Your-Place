# Project Scope — AI Job Application Agent (working name: "Agora Jobs")

**Date:** 2026-08-03
**Companion docs:** [TSENTA-KEY-FINDINGS.md](research/TSENTA-KEY-FINDINGS.md) (full Tsenta teardown) · [tsenta-screenshots/](tsenta-screenshots/)

---

## 1. What we're building

An AI agent that finds jobs the moment they're posted, tailors your résumé and cover letter for each one, applies for you, and tracks everything that happens after — the same ground Tsenta and AIApply cover today. That's the baseline, the price of entry.

On top of that baseline we build the thing neither of them has: a product that actually works in **Germany and Europe**. Native-quality German applications, coverage of the ATSes German companies actually use, visa and Blue Card intelligence, and a privacy posture Germans will trust. Quality-first, not spray-and-pray.

Think of it in two layers:

- **Layer 1 — Table stakes.** Everything Tsenta and AIApply do, combined into one product with one price. If we're missing something they have, a user has a reason not to switch. (Sections 3 and 4.)
- **Layer 2 — Our edge.** The features that make us the obvious choice in Berlin and, later, the rest of Europe. (Section 5.)

One important rule: we clone the *functionality*, never the brand, copy text, or visual design. Those stay ours.

## 2. Who it's for

**Primary (launch):** International, English-speaking tech and business professionals job-hunting in Berlin — the people applying to hundreds of roles, often against a visa clock. They are the German equivalent of Tsenta's OPT users: high pain, high frequency, willing to pay.

**Secondary (fast follow):** German-speaking white-collar job seekers, who face the heaviest application culture in Europe (tailored Anschreiben, formal norms, tabular Lebenslauf) and get the most time saved per application.

---

## 3. Baseline, part 1 — everything Tsenta has

Grouped the way the user experiences it. Every item here ships in our product.

### 3.1 Find — the job comes to you

- **Career-page watching.** Continuously monitor company career pages and ATS job boards; detect new postings within minutes and alert matching users immediately. (Tsenta claims 50,000+ pages / 19 ATSes / ~95% of postings. Our coverage targets are in Section 6.)
- **Match scoring.** Every job gets a percentage match against the user's résumé and preferences (location, salary, experience level, role family), with a plain-language explanation of *why* it matched.
- **Filters that actually filter:** location/remote, salary, seniority, role family, language of the posting, and work-authorization/sponsorship requirements.
- **Daily curated list** plus real-time alerts for high matches.
- **Paste any job URL** to add it to the application queue, even if we didn't discover it.
- **Multi-channel notifications:** push, email, WhatsApp/messaging, and the dashboard feed.

### 3.2 Prep — materials tailored per job

- **JD analysis.** Read the job description, extract keywords, must-haves, and disqualifiers.
- **Résumé tailoring.** Rewrite bullets per role using only true facts from the user's uploaded résumé. Tone preserved, keywords aligned.
- **The score panel — every AI document gets graded, visibly.** Nothing we generate is a black box. Every résumé and cover letter the AI produces ships with an EnhanCV-class score out of 100, broken into categories the user can actually inspect:
  - *ATS parsability* — can the machine read it: text extraction, standard fonts, semantic headings, contact info, dates, file format, length;
  - *Job match* — keywords and skills from the **actual job description** it's being sent to, present or missing (listed, not hidden);
  - *Content quality* — quantified achievements, vague claims flagged, repetition, spelling/grammar, buzzword density;
  - *Structure* — required sections present and in the right order.
  Each failed check is highlighted in the document with a one-line fix. And because we tailor per job, the panel shows the **before/after delta**: "your base résumé scored 71 for this role; the tailored version scores 93 — here's which changes did it." The user never has to blindly trust the generation; they can see exactly why it's better, or reject it if it isn't.
  One honesty rule that differentiates us: we say plainly what the score is — *our* checkable audit against published ATS-parsing and recruiter-screening criteria — not a magic number the ATS itself produces (real ATSes don't hand out scores). Competitors imply otherwise; being straight about it is exactly the transparency this product sells.
- **The diff view.** Show every single change side by side (old line / new line) before anything is sent. Nothing goes out without approval — or the user switches on auto-approve and goes fully hands-off. Together with the score panel, this is the trust core of the product; we build it early and never compromise it.
- **Saved tailored versions per company,** so re-applying or following up doesn't redo work.
- **Cover letters generated per role,** editable, in the user's voice.

### 3.3 Apply — the agent does the work

- **Direct submission on company career pages** (not job-board easy-applies): open the ATS form, fill every field, upload the right documents, answer the screening questions.
- **Open-ended answers in the user's voice** ("Why this company?"), drafted from their real background — never generic filler.
- **Work-authorization answers handled correctly** every time, based on a status the user sets once.
- **A receipt for every application:** exact fields filled, answers given, documents sent, ATS confirmation, timestamp, and how long it took. The user can audit anything after the fact and flag corrections.
- **"Needs you" queue.** When the agent hits a CAPTCHA, an odd question, or a login wall, the application parks in a queue with a one-tap way for the user to unblock it.
- **Human-quality submissions.** Applications read and look like a careful human sent them — because one approved every submission (or explicitly chose auto-approve). We never misrepresent the applicant and we don't treat automation as a secret; the quality bar is the feature, not concealment. (Full posture in Section 8.2.)
- **Batch actions:** approve all, submit all, skip.

### 3.4 Track — the pipeline runs itself

- **Recruiter reply routing.** Connect the user's email; replies from recruiters get matched to the right application automatically.
- **Self-advancing statuses:** Applied → Viewed → Replied → Interview → Offer/Rejected, moved by email signals, not manual dragging.
- **Interview schedule view** for the week ahead.
- **Weekly stats:** applications sent, reply rate, interviews, and time saved.
- **Full application history** with materials attached.

### 3.5 Everywhere the user is (platforms)

- **Web dashboard** — the full product, laid out the way Tsenta proved works (our own visual design, their information architecture): a **left sidebar** with Dashboard, Browse Jobs, Applications, Inbox, Tracker, Profile, and Settings, a credit counter always visible, and a persistent **AI Assistant** pinned in the sidebar (see Section 5.4). Main screen: top matches with scores, the application queue with per-row status, and one-click Apply / Submit-all.
- **Mobile apps (iOS + Android)** — or a first-class installable PWA at launch, native apps fast-follow.
- **WhatsApp bot** — "New match: 92%. Apply?" → reply *yes* → receipt comes back. (Tsenta leads with iMessage; in Berlin, WhatsApp *is* the messaging layer. Telegram as a fast follow.)
- **Browser extension** — detects the job posting you're on, one click fills the application.
- **MCP server + CLI** — so Claude, Codex, and other AI agents can search, apply, and check status on the user's behalf. Cheap to build, great developer marketing.

### 3.6 Growth & commercial mechanics

- **Free tier: first 25 applications free, no card.** The aha moment is "25 applications off your plate by tonight."
- **Pay for applications, not the tool.** Every tier is the full product; tiers differ only by volume. Credits are only consumed on *confirmed submissions*.
- **Simple cancel.** One click, no retention maze.
- **Public changelog** — ship visibly, build trust.
- **Programmatic SEO:** public jobs directory + comparison/guide content for organic acquisition.
- **Networking assist:** find recruiters and likely referrers at a target company (Tsenta added this recently; see Section 5 for how we go further).
- **Founder-visible support** — real humans answer, fast.

---

## 4. Baseline, part 2 — everything AIApply has (that Tsenta doesn't)

AIApply's strength is the toolkit *around* the application. Tsenta stops at "application sent"; AIApply keeps helping until the offer. We ship both halves.

- **AI Résumé Builder as a standalone product.** Build from scratch, upload an existing file, or import from LinkedIn. Multiple clean templates, live editing, export to PDF and Word. (Tsenta only *tailors* an existing résumé; it can't create one. We can.)
- **AI Cover Letter Generator as a standalone tool** — usable even for jobs applied to outside our platform.
- **Résumé Scanner & Optimizer.** Upload any résumé, get an ATS score, keyword gaps, and concrete fixes — also works as a free lead-magnet tool. Same scoring engine as the in-product score panel (Section 3.2), so the free tool and the paid product never disagree.
- **Résumé Translator.** Convert a résumé between languages while keeping formatting and impact. AIApply does 50+ languages; our launch priority is flawless **English ↔ German**, then the rest.
- **Mock Interviews.** Role-specific practice interviews with instant feedback, model answers, and coaching tips, generated from the actual job description the user is interviewing for. (This is the parity version — Section 5.4 upgrades it into the persona-led Interview Studio with learning paths.)
- **Face-to-face Interview Simulation instead of a live copilot — decided 2026-08-03.** AIApply's "Interview Buddy" whispers answers during real interviews; we deliberately don't ship that — it's their most controversial feature and it poisons a trust brand. Our answer lives in the Interview Studio (Section 5.4): a face-to-face simulation with an AI coach persona that **predicts the questions this exact job description will produce** and drills the user on them, bilingual. All the interview help, none of the cheating headline.
- **Built-in job board.** A searchable aggregated board inside the product so discovery doesn't depend only on the watch-list.
- **Follow-up email generator** and the small utility belt (application emails, thank-you notes, resignation letters) — cheap to build, high perceived value, great free tools for SEO.
- **Student discount** with verification.

**Pricing lesson from AIApply — what *not* to copy:** their full experience costs $74–149/month across three or four separate subscriptions (Premium + Interview Buddy + Auto Apply credits + Auto Customize). Users hate it and reviews say so. We do the opposite: **one subscription, everything included, priced by application volume** (Tsenta's model, which is winning).

### The complete baseline checklist

| # | Feature | Tsenta | AIApply | Ours |
|---|---|---|---|---|
| 1 | Career-page watching + instant match alerts | ✅ | — | ✅ |
| 2 | Match score with explanation | ✅ | partial | ✅ |
| 3 | Résumé tailoring per job + diff approval | ✅ | add-on | ✅ |
| 4 | Transparent ATS score report on every generated document (per-category breakdown + before/after delta) | partial (single number) | partial (scanner only) | ✅ |
| 5 | Auto-submit on career pages + receipts | ✅ | ✅ (credits) | ✅ |
| 6 | Open-ended answers in user's voice | ✅ | partial | ✅ |
| 7 | Work-auth / sponsorship logic | ✅ (OPT/H-1B) | — | ✅ (DE/EU version) |
| 8 | Reply routing + self-advancing tracker | ✅ | — | ✅ |
| 9 | Résumé builder (from scratch / LinkedIn import) | — | ✅ | ✅ |
| 10 | Standalone cover letter generator | — | ✅ | ✅ |
| 11 | Résumé scanner/optimizer (free tool) | — | ✅ | ✅ |
| 12 | Résumé translator | — | ✅ | ✅ (EN↔DE first) |
| 13 | Mock interviews from the real JD | — | ✅ | ✅ |
| 14 | Interview help during the process | — | ✅ (live copilot) | ✅ different: predicted-questions face-to-face simulation, no live whispering (§5.4) |
| 15 | Job board in-product | ✅ (directory) | ✅ | ✅ |
| 16 | Follow-up / email tools | — | ✅ | ✅ |
| 17 | Web + mobile + extension | ✅ | ✅ | ✅ |
| 18 | Messaging bot (WhatsApp-first) | ✅ (iMessage) | — | ✅ |
| 19 | MCP / CLI for AI agents | ✅ | — | ✅ |
| 20 | Networking / referral finder | ✅ (new) | — | ✅ |
| 21 | 25 free applications, no card | ✅ | ~10 | ✅ |
| 22 | One price, volume tiers, credits on submission only | ✅ | ❌ (fragmented) | ✅ |
| 23 | Public changelog + SEO content engine | ✅ | ✅ | ✅ |
| 24 | Student discount | — | ✅ | ✅ |
| 25 | Interview coaching with AI personas + scored practice reports | — | partial (generic) | ✅ |
| 26 | Skill-gap learning paths (curated tools, videos, courses) | — | — | ✅ |
| 27 | Dedicated application email + in-app inbox per application | partial (routing) | — | ✅ |
| 28 | Connected profiles (LinkedIn, XING, GitHub, portfolio/Instagram) | partial | partial (LinkedIn import) | ✅ |
| 29 | Sidebar AI Assistant that can drive the whole product | — | — | ✅ |

---

## 5. Layer 2 — our approach: win Europe on quality and trust

The US tools are volume machines tuned for a market with endless postings and casual application norms. Germany is the opposite: fewer relevant postings, heavier applications, recruiters who filter spam hard, and users who care about privacy. So our approach is:

> **Fewer, better, faster-than-anyone applications — fully localized, fully compliant, and provably effective.**

### 5.1 The differentiators (unique to us)

1. **DACH ATS coverage — our moat.** Adapters for the systems German companies actually run: **Personio, SAP SuccessFactors, softgarden, Recruitee, onlyfy (XING), d.vinci, rexx** — plus the internationals (Greenhouse, Workday, Lever, Ashby, SmartRecruiters). Tsenta's 19 US adapters mostly don't transfer; whoever builds these first owns the market.
2. **German job-board integration.** In Germany, discovery happens on **StepStone, Indeed, XING, LinkedIn, Arbeitsagentur** — not only career pages. We cover both — through the layered, per-source-legal supply stack in Section 8: official API where one exists, user-initiated capture where a board's ToS forbids scraping. Never headless-scraping ToS-hostile boards.
3. **Native-grade German materials.** Auto-detect the posting's language. German posting → a proper **Anschreiben** (specific motivation, correct formality) and a German-format **Lebenslauf** (tabular, photo slot, signature line). Language quality is a hard filter in DACH; ours reads native, and a German-speaker review loop keeps it that way.
4. **Visa & Blue Card intelligence.** Set your status once (EU citizen, Blue Card, job-seeker visa, student…). We flag which companies actually sponsor, check postings against the **published Blue Card salary thresholds**, answer permit questions correctly, and warn before wasting credits on companies that never sponsor. This is the feature the Berlin international community will tell each other about.
5. **Salary intelligence.** Only ~14% of German ads state a salary. We attach an estimated range to every posting (market data + disclosed comparables) so users can filter by pay anyway — and we surface it *before* they spend a credit.
6. **Quality Mode (default).** A deliberate anti-spam stance: cap daily volume sensibly, require diff-approval on low-match roles, score every application's specificity before sending, and nudge follow-ups instead of more volume. Marketing line: *we'd rather send 60 applications that get replies than 600 that get you blacklisted.* (Power users can still turn volume up.)
7. **Culturally-calibrated follow-ups.** Polite German-style follow-up emails, timed 10–14 days after applying, drafted and ready to send. Nobody automates this well.
8. **Bilingual interview prep.** Mock interviews *in German or English*, from the real JD, including the questions German interviewers actually ask — plus salary-negotiation practice calibrated to German norms (13th salary, vacation days, notice periods, probation).
9. **GDPR-native by design — and loud about it.** EU hosting, zero training on user data, one-click export and delete, a plain-language privacy page, and AI Act-aware transparency. In Germany this isn't compliance overhead, it's a selling point on the landing page.
10. **Bewerbungsnachweis export.** Anyone on unemployment benefits (ALG) must prove their applications to the Agentur für Arbeit. Our receipts already contain everything — one click produces a compliant evidence PDF. Honest, useful, and no competitor has it.

### 5.2 The learning loop — our data moat

11. **Application analytics that learn.** We know which résumé versions, phrasings, and application times actually got replies — per user and across the platform. The product tells you: "Version B of your résumé gets 2.1× more replies — switch?" Every application makes the product smarter; that compounds, and a US competitor entering later starts from zero local data.
12. **Company response intelligence.** Public, aggregate stats per company: typical response time, reply rate, interview rate, sponsorship record. ("This company replies to 4% of applicants, median 18 days.") Saves users pain, generates SEO pages, and creates data nobody else has.
13. **Warm-path finder.** Before applying, we check for likely referral paths — alumni of your university, ex-colleagues, 2nd-degree contacts at the company (XING + LinkedIn) — because a referral beats any tailored PDF. Tsenta's recruiter search, but pointed at *your* network. **Ships only after the non-user GDPR review (Section 8.3):** it processes third parties' personal data, and we do that right or not at all.

### 5.3 Expansion built in

14. **One profile, whole EU.** The Berlin playbook (local ATSes + local language + local visa logic) repeats: Netherlands, Nordics, Austria, Switzerland next. Architecture treats "market" as a module — job sources, language pack, visa rules, salary data per market.

### 5.4 Coach & connect — the human layer around the agent

15. **AI Interview Studio with coach personas.** Interview practice led by a cast of AI coach characters, not a faceless chatbot — pick who grills you: the strict German enterprise interviewer, the casual startup founder, the big-tech bar-raiser, the HR screener. Practice against the **specific job description** you're actually interviewing for, or a generic track for the role family. **Face-to-face simulation:** the coach appears on camera — animated persona with voice and video, not a chat box — driven by a **question-prediction engine** that reads the actual JD (role family, seniority, company type, the gaps in your résumé) and predicts the questions this interview is likely to produce, then drills you on exactly those. Voice or text, instant feedback after every answer, model answers to steal from, and a scored report at the end (same transparency rules as the score panel — you see *what* was weak and *why*). One legal guardrail: our coaches are **original characters we design**, never clones of real influencers or celebrities — using a real person's likeness or voice without a license is a lawsuit, not a feature. If we later want a real coach's persona, we license it as a partnership.
16. **Learning paths — the interview prep that teaches.** When practice (or a job description) exposes a skill gap, the product doesn't just say "improve your Kubernetes answer" — it hands you a path: what to learn, in what order, with curated resources — official docs, the right tool tutorials, specific YouTube videos and free courses. Over time this connects to the application analytics: "the roles you're missing usually ask for Terraform; here's a two-week path, and 34 more matching jobs unlock once it's on your résumé." Rejections become a roadmap instead of a dead end.
17. **Connected profiles + a dedicated application email.** Two halves of one idea — your professional identity lives in the product:
    - *Connected profiles:* link LinkedIn, XING, GitHub, and portfolio/Instagram (relevant for design, marketing, and creative roles). Imports enrich the résumé builder and profile; connections power the warm-path finder (Section 5.2) — the LinkedIn/Instagram-style profile section, made useful instead of decorative.
    - *Dedicated application email:* every user gets a clean application address (e.g. `j.lakhani@apply.<ourdomain>`). Applications go out with it, so **every recruiter reply lands in the in-app Inbox automatically**, attached to the right application — no OAuth into the user's personal inbox, no lost replies, and the personal address stays private. Replies also forward to the user's real email, and they can switch any application to their personal address if they prefer.
18. **The sidebar AI Assistant.** A chat assistant pinned in the dashboard's left sidebar that *is* the agent, not a help widget: "pause everything at consultancies," "why did this résumé score 71?", "draft a follow-up for the Stripe application," "what's my best-performing résumé version?" Every action the product can do, the assistant can do in one sentence — and it's the same brain across web, WhatsApp, and MCP, so the experience is identical on every surface.

---

## 6. What "done" looks like (launch targets)

| Area | Target at public launch |
|---|---|
| ATS coverage | Top 6 by German posting volume: Personio, SuccessFactors, Greenhouse, Workday, softgarden, Recruitee |
| Job sources | The five supply layers of Section 8: career pages of top ~5,000 DACH employers (ATS endpoints + JobPosting crawl) + Arbeitsagentur/EURES APIs + aggregator APIs + backfill feeds + user-initiated capture for ToS-hostile boards |
| Languages | Full product in English; application materials flawless in English *and* German |
| Time-to-alert | Under 15 minutes from posting going live |
| Application receipt | 100% of submissions, no exceptions |
| Score transparency | 100% of AI-generated documents ship with a visible score report (16+ checks, category breakdown, before/after delta) — no unscored document ever goes out |
| Free tier | 25 applications, no card |
| Pricing (decided 2026-08-03) | Starter **€19** / 100 apps · Pro **€39** / 250 · Power **€79** / 600 — everything included, credits burn only on submission. Quality Mode default on all tiers. Volumes are deliberately smaller than Tsenta's: revenue per application (€0.13–0.19) stays above the realistic serving cost (LLM + browser infra, ~€0.10–0.40 worst case), so margin survives a user who burns every credit — and the tiers finally match the "fewer, better" thesis instead of contradicting it. |
| Platforms at launch | Web dashboard (PWA) + WhatsApp bot + Chrome extension. Native apps + MCP fast-follow. |
| Funding posture (decided 2026-08-03) | **Bootstrapped + German grant programs — no VC in v1.** Revenue is the gate; the wedge's small surface is sized for solo velocity. A raise stays optional later, from traction, if EU expansion warrants it. |

## 7. Explicitly out of scope (v1)

- Employer-side products (recruiter tools, job posting, HR analytics) — different business.
- Recruiting-agency/marketplace features.
- Offer/contract legal review — later, with counsel.
- Live in-interview copilot (real-time answer whispering) — deliberately dropped 2026-08-03; replaced by the face-to-face Interview Simulation with question prediction (Section 5.4).
- iMessage bot (Berlin runs on WhatsApp; iMessage only if/when we enter the US).
- Non-EU markets.
- Résumé translation beyond EN↔DE quality bar (other languages via generic translation, clearly labelled).

## 8. Job data & trust posture — passing the supply gate

Coverage is the cold-start gate: a user who searches and finds three stale jobs never returns. No single API covers Werkstudent jobs, Praktika, Ausbildung, and senior professional roles at once — so supply is **layered and redundant by design**. Never one source; each layer independently useful, together spanning every segment from student to senior.

### 8.1 The five supply layers

| Layer | What | Why it's safe | What it covers |
|---|---|---|---|
| **1. Direct ATS endpoints** | Most ATSes expose public job-listing endpoints that power their hosted career pages (Greenhouse board API, Lever postings, Personio career XML, Recruitee, Workday JSON, Ashby, Teamtailor, Workable, d.vinci). Enumerate DACH companies once, poll cheaply forever. Career pages' **JobPosting JSON-LD** (the Google-for-Jobs structured data) is the fallback for ATSes without a feed. | Public endpoints that exist *so that* career pages can be read; no login wall, no ToS click — governed by the per-host robots rules in 8.4 | The freshest postings and our direct-apply targets — the core inventory |
| **2. Official public APIs** | Bundesagentur für Arbeit **Jobsuche API** + **Ausbildungssuche API**, EU **EURES** portal | Government/EU sources, free, explicitly public | The long tail: **Ausbildung, Praktikum, SME roles** nothing else lists |
| **3. Aggregator APIs** | Adzuna, Jooble, Careerjet, Arbeitnow, Talent.com and similar — licensed APIs with German inventory | Contractual access, free or cheap tiers | Breadth backfill across all seniorities |
| **4. Backfill networks that pay us** | Programmatic job networks (Appcast, Jobg8, publisher programs of Talent.com/Jooble) distribute employer-paid postings via XML feeds and pay per click or valid application | Distribution is their business model — they *want* us to list these | Volume plus a small revenue line while organic inventory grows |
| **5. User-initiated capture** | Paste-a-URL plus the extension in capture mode: the user browses StepStone/LinkedIn/XING/Indeed themselves, we parse and queue what they're already looking at | The *user* accesses the page; we never headless-scrape ToS-hostile boards | The named boards Germans actually browse — without the lawsuit |

*(Per-source verification — exact endpoints, costs, coverage depth, partner terms — research in progress; verified inventory lands in 8.4.)*

### 8.2 Submission posture

We dropped "stealth" as a frame. Applications look like a careful human sent them because a human approved each one (or explicitly chose auto-approve). We never misrepresent the applicant, never fake an identity, and don't treat automation as something to hide — the quality bar is the feature, not concealment. If an employer asks whether a tool assisted, the honest answer is yes, and our receipts prove exactly what was sent.

### 8.3 GDPR beyond our own users

Our real exposure isn't user data (EU hosting, export/delete, zero training already handle that). It's **non-users**: recruiters and contacts surfaced by the warm-path finder and networking assist. Rules: aggregate company stats use no personal data (fine); any feature that processes *named third parties* ships only after a legitimate-interest assessment with a German data lawyer, designed for minimization — show the path, store the minimum, honor objections. Until that review exists, those features stay off. LinkedIn/XING boundary: watch + notify + prefill, never headless-submit (decided; see Section 12.4).

### 8.4 Verified source inventory (summary)

Full source-by-source verification (endpoints, costs, robots.txt verdicts, legal case-law citations) lives in [Job Data/RESEARCH-VERIFIED-SOURCE-INVENTORY.md](../Job%20Data/RESEARCH-VERIFIED-SOURCE-INVENTORY.md) and [Job Data/RESEARCH-JOB-DATA-SOURCES.md](../Job%20Data/RESEARCH-JOB-DATA-SOURCES.md). Verified 2026-08-03. Bottom line:

- **Anchor source:** BA Jobsuche API (free, open, spans student → senior; no published commercial terms, so email BA and don't architect around a single key surviving forever).
- **Best free German source:** Arbeitnow (open REST, visa-sponsorship tags match our launch persona).
- **Direct ATS endpoints (Layer 1):** Greenhouse, Lever, Personio, Ashby, Teamtailor, d.vinci, Workable all confirmed public/documented. Recruitee and Workday are reachable but per-tenant robots checks required. SmartRecruiters is an explicit machine-readable opt-out — do not ingest. softgarden and SAP SuccessFactors are open items to verify before Phase 2.
- **StepStone / Indeed / XING·onlyfy / LinkedIn:** confirmed no data-out path — reachable only via Layer 5 (user-initiated capture).
- **Legal posture:** robots.txt is the load-bearing signal (§44b UrhG); browsewrap ToS don't bind a crawler under German law as long as we never circumvent technical protection (CAPTCHAs, bot challenges, IP blocks); index-and-link, never live meta-search; store facts (title, company, location, salary, dates, apply-URL), not full ad prose.
- **Backfill networks (Layer 4):** Talent.com, Jooble, WhatJobs, Adzuna are day-one, self-serve, CPC-paid-to-us doors. Jobg8 and Appcast are later-stage (traffic thresholds).
- **Student/Ausbildung/Praktikum:** BA Jobsuche is the only open programmatic source; commercial student boards are partner-only.

---

## 9. The second act — answering structural churn

A job-search product's success event is the customer leaving. We don't hide from that; we sequence three answers instead of pretending it away:

1. **Launch — the referral flywheel.** "I got hired" triggers a celebration flow: a shareable win plus free credits for friends still searching. Berlin's international job seekers cluster in the same communities; every happy churn seeds the next cohort. Target: ≥1 referred signup per hired user.
2. **Post-launch — career-lifecycle retention.** The profile outlives the search: a free passive dream-job watch, salary benchmarking, probation-period check-ins, and re-activation at the next move (median German tenure ~3 years). One-shot LTV becomes a long relationship with periodic paid seasons.
3. **Year 2 — B2B2C.** Cohort licenses for bootcamps, university career services, and relocation agencies — buyers with a permanent stream of job seekers, annual budgets, and no churn problem. A second sales motion; it waits until the consumer product has proven its reply-rate edge.

---

## 10. Build order (phases, not dates)

**Phase 0 — Foundation.** Profile + résumé ingest, jobs database, matching with explanations, the diff/approval UI, receipts model, Stripe credits. *The trust spine exists before any automation.* **Running in parallel — the validation sprint (decided 2026-08-03):** 15–20 interviews with Berlin international job seekers plus a waitlist landing page, target **≥100 signups before the Phase 1 beta opens**. Code and demand evidence land together; neither waits for the other.

**Phase 1 — The wedge (differentiated from day one).** Greenhouse + Personio adapters end-to-end (discover → tailor → approve → submit → receipt). Native-grade German + English materials. **Visa & Blue Card intelligence, pulled forward** — it's the feature the Berlin international community tells each other about. Supply layers 1–2 (ATS endpoints + BA Jobsuche API). Web dashboard, 25-free onboarding. Private beta with Berlin users we personally know. *Nothing in this phase is a clone — every pillar is Layer 2 or trust-core.*

**Phase 2 — Revenue core.** Remaining launch ATSes, supply layers 3–5 (aggregator APIs, backfill network, extension in capture mode), **dedicated application email + in-app inbox** (replaces plain reply-routing — better tracking, no inbox OAuth), tracker, WhatsApp bot, Quality Mode scoring, culturally-calibrated follow-ups, Bewerbungsnachweis export. **Exit gate: paying users.**

**Phase 3 — Parity fill + retention (post-revenue).** Résumé builder + scanner + translator, mock interviews, connected profiles (LinkedIn/XING/GitHub import), **referral flywheel** (Section 9), salary intelligence layer, application analytics, company response stats, warm-path finder (gated by Section 8.3), **sidebar AI Assistant**.

**Phase 4 — Surface area.** Native mobile apps, MCP/CLI, full-depth extension autofill, **Interview Studio personas + learning paths** (face-to-face simulation + question prediction), Telegram, student pricing, SEO engine at scale, second market prep.

Each phase ships to real users before the next starts. If Phase 1 users don't say "this saved my week," we fix that before writing more code.

## 11. How we measure success

- **North star: replies per user per week** (not applications sent — replies prove quality).
- Activation: % of signups whose first application is submitted within 24h.
- % of free users (25 apps) converting to paid.
- Application success rate (submitted without human rescue) per ATS.
- Reply rate per 100 applications — ours vs. the user's manual baseline.
- Churn and "would you be upset if we disappeared?" score.

**The bars (decided 2026-08-03) — what the numbers must clear:**

- **Beta bar:** tailored applications beat each user's manual reply-rate baseline by **≥2×** across their first 50 tracked applications.
- **Activation:** ≥40% of signups submit their first application within 24 hours.
- **Conversion:** ≥5% of free users (25 apps) convert to paid.
- **Phase-2 exit:** ≥20 paying users.
- **Kill trigger:** if the platform-wide reply rate is ≤ users' manual baseline after 500 tracked applications, we stop and reposition — no vanity-metric survival.

## 12. Open questions (need your call, not blocking Phase 0)

1. **Name & brand** — "Agora Jobs" is a placeholder. Naming decides domain, bot handles, and app-store entries.
2. ~~**Pricing**~~ — **decided 2026-08-03:** quality-priced tiers, €19/100 · €39/250 · €79/600 (Section 6). Volume framing rejected: it contradicted the "fewer, better" thesis and lost money at full credit utilization.
3. ~~**Live Interview Copilot**~~ — **decided 2026-08-03: dropped.** No live in-interview whispering, ever. Replaced by the Interview Studio's face-to-face simulation with JD-based question prediction (Section 5.4).
4. ~~**LinkedIn/XING automation depth**~~ — **decided 2026-08-03:** watch + notify + prefill only; never headless-submit on LinkedIn/XING. Part of the clean data posture in Section 8.
5. **Your answers to the founder questions** in [TSENTA-KEY-FINDINGS.md §13](research/TSENTA-KEY-FINDINGS.md) — still needed for the YC-style evaluation, and they'll sharpen this scope (especially solo-velocity vs. phase count).
6. **EU incumbent teardown** — LoopCV, JobCopilot, and other European auto-apply tools need the same depth of teardown as Tsenta got, before any pitch narrative claims "nobody serves DACH." (Research task, not a decision.)
7. **softgarden + SAP SuccessFactors discovery paths** — two of the launch-six ATSes have unverified public feeds (Section 8.4). Verify (browser network capture / partner ask) before Phase 2 planning hardens.
8. **Full budget table** — funding posture is decided (Section 6), but the one-page money plan (monthly burn: infra + LLM + tools; break-even user count) still needs writing once Phase 0 infra choices land.

---

*Sources for feature inventories and market claims: the Tsenta teardown in [TSENTA-KEY-FINDINGS.md](research/TSENTA-KEY-FINDINGS.md) (crawled 2026-08-03, screenshots in [tsenta-screenshots/](tsenta-screenshots/)); [AIApply product site](https://aiapply.co/), [AIApply pricing & billing](https://support.aiapply.co/en/articles/15692812-pricing-billing), [JobRight's AIApply review](https://jobright.ai/blog/aiapply-review-2026-how-it-works-pricing-and-honest-user-experiences/), [LoopCV's AIApply review](https://www.loopcv.pro/directory/aiapply/), [JobCopilot's AIApply review](https://jobcopilot.com/aiapply-review/); DACH ATS market data via [Leantree](https://www.leantree.com/blog/personio-vs-softgarden-ats-kmu) and [Hirex](https://gethirex.com/blog/top-10-applicant-tracking-systems-in-germany); DACH application-culture and AI Act context via [Sprad](https://sprad.io/blog/best-ai-tools-for-applying-to-jobs-in-europe-a-safe-dach-friendly-playbook); score-panel benchmark: [EnhanCV resume checker](https://enhancv.com/resources/resume-checker/) (score /100, 16 checks in 5 categories across ATS parsability and content quality).*
