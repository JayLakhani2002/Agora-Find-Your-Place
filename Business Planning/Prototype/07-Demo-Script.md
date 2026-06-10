# Agora Jobs — BSS Demo Script
**Document:** PROTO-007 · **Version:** 1.0  
**Audience:** BSS jury (Jan/Feb 2027) + early beta users + potential co-founders  
**Goal:** Demonstrate the full match → generate → track loop live in under 8 minutes

---

## 1. Before the Demo

### Test Accounts to Have Ready

| Account | Visa type | Profile | Purpose |
|---------|-----------|---------|---------|
| `priya@demo.agorajobs.de` | §16b Student Visa | MSc Data Science, Python/ML, B1 German | Primary demo persona |
| `marco@demo.agorajobs.de` | EU Citizen | BEng Mechanical, German native | Shows different legal filter |
| `aisha@demo.agorajobs.de` | Chancenkarte §20a | Marketing background, A2 German | Shows Chancenkarte constraints |

### Pre-Demo Checklist

- [ ] `priya@demo.agorajobs.de` account has onboarding complete (don't redo live — onboarding is not the demo)
- [ ] Priya's deck has ≥ 15 fresh jobs (clear prior swipes if needed via admin panel)
- [ ] A "right-swipe" job is pre-loaded: "Python Backend Werkstudent" at a recognizable Berlin company
- [ ] Generation takes ~90 seconds — have this pre-done and cached for live demo (show generation loading screen, then fast-forward to result)
- [ ] Both CV and Cover Letter quality scores are ≥ 8.5 overall
- [ ] The tracker shows 2–3 prior "submitted" applications to demonstrate history
- [ ] App is on Vercel prod URL (not localhost) — jury must be able to access it
- [ ] Swipe haptics work on the demo phone (or disable and use laptop with mouse)
- [ ] Have Marco's account open in a second browser tab (for legal filter comparison)

---

## 2. The 8-Minute Demo Flow

### Minute 0–1: The Problem (No slides — state it verbally while showing app)

> "International students in Germany apply to jobs they're legally not allowed to take. Every week. They don't know. LinkedIn doesn't know. No one tells them until they call HR.
> 
> We fix that. Let me show you."

**Action:** Open the app on the demo phone, hand it to a jury member. Let them experience the swipe immediately.

---

### Minute 1–3: The Legal Filter (Core Differentiator)

**On screen:** Priya's swipe deck

> "Every card you see here — Priya is legally allowed to apply to every single one. We modeled the §16b Student Visa constraints: 20 hours per week cap, 140-day annual limit, Werkstudent contract type required. None of that appears on LinkedIn."

**Show:** Swipe through 3–4 cards. Point to the eligibility ticks on each.

> "Watch what happens when I switch to Marco."

**Action:** Open Marco's account (EU citizen). Show he sees more jobs — including some 30hr/week roles.

> "Marco's an EU citizen — no hour restriction. Different profile, different legal universe, different deck. The filter is real; it's in the database query, not a badge we paste on."

**Key claim to make:** "We have zero ineligible jobs in any user's deck across all visa types. We test this."

---

### Minute 3–4: The Right Swipe + Role Questions

**Action:** Right-swipe on the pre-loaded "Python Backend Werkstudent" job.

> "Right swipe. Now Agora knows she wants to apply. Instead of just opening a blank form, it asks 4 questions."

**Show:** The 4 questions screen (pre-filled for speed if demoing live generation is too risky):

- "Describe your most complex Python project"
- "What's your experience with async frameworks?"
- "When are you available to start?"
- "Why this company?"

> "30 seconds of answers. That's all it needs. Then:"

---

### Minute 4–6: AI Generation + Quality Scores

**Action:** Show the generation loading screen (10–15 seconds, or show the loading state briefly then navigate to cached result).

> "Behind this screen, Claude Sonnet is writing a Tabellarischer Lebenslauf — German ATS format, correct date format, right section order, Werkstudent header — and a cover letter in German. Simultaneously. Both tailored to this exact role."

**Show:** The review screen with the 6-dimension score bars.

> "ATS Parse: 9.1. This is the score that matters. Softgarden and Personio — the ATS systems most Berlin companies use — will parse this document. 90% parse rate is what we guarantee. ChatGPT averages 40%."

**Show:** The CV tab — scroll through it. Point to the German section headers, the MM/YYYY dates.

> "The name, address, phone number — all placeholders. Priya fills those in herself. We never store her personal contact details."

**Show:** The Cover Letter tab. Read the opening line — it should not start with "Hiermit bewerbe ich mich" (that's the cliché).

---

### Minute 6–7: Submission + Tracking

**Action:** Tap "Approve & Continue to Submission".

> "She approves. Now the 3-step submission helper."

**Show:** The Submission Helper screen.

> "Step 1: download both documents. Step 2: we open the employer's application page — she uploads and clicks Submit. Step 3: she comes back and confirms. We never submit on her behalf. Ever. That's a legal requirement, and we made it a product principle."

**Action:** Tap "I submitted it" → navigate to Tracker.

> "And now it's tracked. Day 10 with no response — we generate a follow-up email draft. She copies it to her email client and sends. Agora is the co-pilot, not the autopilot."

---

### Minute 7–8: The Numbers + Ask

> "We're targeting 500 monthly active users by month 6. Berlin alone has 40,000 international students. We've had [X] beta users complete applications in [Y] average minutes.
> 
> We're applying for BSS funding to cover the next 18 months: server costs, a legal review, and the browser extension that becomes the paid tier.
> 
> [Name any specific ask from the jury]"

---

## 3. Anticipated Jury Questions

### "Why won't LinkedIn or Indeed just add this filter?"

> "They won't because their model is advertising to employers at scale. Building a German employment law engine for a niche segment doesn't move their needle. Our moat is depth, not breadth. We have 6 months before anyone notices Germany — and we have a 6-12 month head start on anyone who does."

*(Reference: competitor analysis doc — no European competitor models this constraint)*

### "How do you know the legal filtering is accurate?"

> "We sourced directly from §16b AufenthG, §20a AufenthG, and the Sozialgesetzbuch IV and VII. The constraint engine is pure TypeScript — no AI involved, fully deterministic, and unit-tested against 12 visa-type × job-type combinations. We can show you the test suite."

### "What stops a user from lying about their visa type?"

> "The same thing that stops them on every other platform: nothing. But every other platform shows them ineligible jobs anyway. We at minimum give them accurate information so they can make an informed choice. We're not a compliance enforcer — we're a tool that removes a knowledge gap."

### "Why not auto-submit? That would be faster."

> "EU automation law. Sending an application on behalf of a user without their explicit per-submission action creates liability. We explored this, ruled it out permanently. Mode 1 (user submits) and Mode 2 (browser extension autofill, user clicks) are the ceiling."

### "What happens after BSS?"

> "Monetization turns on at BSS month 3. Free tier: 3 AI applications/month. Pro tier (€9/month): unlimited + browser extension + follow-up automation. Employer B2B by month 18. The financial model shows path to €107k ARR by end of Year 2."

---

## 4. Backup Plan If Live Demo Breaks

1. **Generation is slow:** Switch to the pre-generated cached demo. Say: "Generation usually takes 90 seconds — I've pre-loaded this one so we don't wait."

2. **App is down:** Open the Loom recording made the day before. The recording shows the full flow in real time.

3. **Jobs deck is empty:** Open the admin panel → "Reseed demo deck" button → Wait 10 seconds.

4. **Clerk auth fails:** Have a magic link pre-generated and saved. Use `! open <magic-link-url>` in the browser.

---

## 5. Post-Demo Materials to Send

After the demo, send these to the jury within 24 hours:

| Document | Purpose |
|----------|---------|
| `01-BRD-Business-Requirements.md` | Business model, personas, revenue path |
| `02-PRD-Product-Requirements.md` | Full feature scope with acceptance criteria |
| `07-Market-Competitive-Analysis.md` | Why Germany, why now, competitive moat |
| `06-Financial-Model.md` | Unit economics, MRR trajectory, BSS budget |
| App link (Vercel preview) | Let them explore themselves |
| ATS parse rate test results | Proof of the 90% claim |

---

## 6. Beta User Recruitment (Parallel to Development)

Start recruiting before Phase 3 is done. Target: 5 beta users by end of Phase 4.

**Channels:**
- TU Berlin and TU Munich international student groups (Facebook, WhatsApp)
- AIESEC Germany chapters
- r/germany subreddit — post in the monthly job thread
- Berlin international students Meetup.com events
- Direct outreach to students visible on LinkedIn who list "seeking Werkstudent role"

**Beta offer:** "Get your Werkstudent application materials reviewed and generated for free. 15 minutes of your time for a feedback session in return."

**Target profiles:** Non-EU students, §16b visa, studying STEM or Business, in Berlin, actively job searching.
