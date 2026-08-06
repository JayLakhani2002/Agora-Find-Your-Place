# Agora Website — Build Guide v3 (One-Page Launch Site)

**Status: ACTIVE — v3 supersedes ALL prior direction** (v1 "Sunlit stoa" in CLAUDE.md, v2
Modern-SaaS/aurora in earlier revisions of this file). Decided by Jay 2026-08-04 (late session):
Tsenta-inspired one-page structure · full-agent product story under **early-access framing** ·
generic audience (all job seekers, not student-first) · **cobalt & amber on paper** palette ·
real-data proof wall · all-new copy with sharper hooks.

Planner: Fable 5. Executors: Opus 5. Jay approves at every visual checkpoint.

---

## 1. North star

The visitor must believe in 5 seconds: **"An agent will do my whole job hunt — finding, tailoring,
applying, tracking — and it's built properly for Germany. I want in early."**

- **Audience: every job seeker in Germany** — international professionals, German professionals,
  students. Copy speaks to "you, job-hunting" — never "you, student". Visa/work-permit
  intelligence is ONE feature card (it's still the moat for internationals), not the identity.
- **Conversion goal: early-access signups.** One goal, every CTA: `Get early access`.
- **Framing law (this replaces the old today/roadmap split):** the site tells the FULL product
  story — watches sources, tailors documents, **submits applications for you**, tracks replies,
  reachable via WhatsApp/iMessage/Claude/Chrome — in confident present-productese, under an
  **unmissable early-access frame**: hero badge `Early access — launching in Berlin first`,
  every CTA is early access, pricing page says pricing locks at launch, and the FAQ states
  plainly what runs today vs. what arrives at launch. That FAQ answer is the honesty anchor —
  it is never softened.

## 2. Design system

### Palette — "Cobalt & amber on paper" (locked)
```
--paper      #FBFAF7   page canvas (warm paper white)
--midnight   #0F1B2D   dark bands, display text on light
--card-dark  #16243A   cards/surfaces on midnight
--hairline   #E7E4DC   borders on paper   (#243450 on midnight)
--cobalt     #2563EB   primary actions, links, active states
--cobalt-deep#1D4FD7   hover/pressed
--amber      #F5A623   warm accent: highlights, receipts glow, stat moments
--sky        #38BDF8   secondary accent in gradients/glows only
--positive   #16A34A   ✓ ticks only (small, semantic — not a theme color)

Gradients & glows (backgrounds and blooms only — never text, never flat fills):
cobalt→sky auras on midnight bands · soft amber aura top of hero paper ·
glow blooms behind receipts/scores: cobalt on dark, amber on light.
Texture: film grain ≤5% site-wide; glass cards (backdrop-blur 12-16px) on midnight.
```
Feel target: **credible, clear, warm** — a serious tool you trust with your career, not a neon
AI toy. Buttons/text stay core palette; if a band reads colorful before clear, dial back.

### Type
- **Hanken Grotesk** 400/500/600/700 — everything. Display H1 clamp(3rem → 5.5rem), tight
  tracking, sentence case with full stops ("Stop applying. Start choosing.")
- **Spline Sans Mono** — receipts, timestamps, scores, counts, chips (`92/100`, `[02:14]`,
  `at launch`). The mono receipt motif is the site's signature texture — used in theater,
  proof line, step frames, stat band; 5-6 places, deliberate.

## 3. Honesty rules (early-access edition — legally binding, never violate)

1. **No fabricated social proof, ever**: no user counts, no "users hired at X", no star ratings,
   no testimonials until real beta quotes exist (§4.6). This is UWG §5 territory in Germany.
2. **The proof wall shows real indexed listings** (§4.2) labeled as what it is — companies whose
   roles are in our index NOW — never implied as "companies that hired our users."
3. Full-agent capabilities may be described in present productese ONLY under the visible
   early-access frame (§1). The FAQ "What works today?" answer keeps the explicit split.
4. No "guaranteed job/interview", no invented coverage numbers (sources = 5, listings = live
   count from data pipeline; "50,000 pages" style claims are Tsenta's, not ours).
5. Rephrase competitor *meaning*, never their sentences. No Tsenta copy text, brand, or assets.
6. Real numbers only, from `live-data.json` (§6): listings, sources, nightly scrape time,
   374 legal tests, 6 score dimensions. All auto-refreshed or verified at deploy.

## 4. The one-page flow — 10 sections (`/`), plus `/pricing` and `/faq` sub-pages (SEO),
`/impressum` + `/datenschutz` (legal). Anchor nav: How it works · Platforms · Pricing · FAQ.

Draft copy below = starting hooks (planner's). Executor may sharpen rhythm, never meaning.

### 4.1 Hero — with the Engine Theater (kept from v2, retinted cobalt)
- Badge: `● Early access — launching in Berlin first`
- H1: `Stop applying. Start choosing.`
- Sub: `Agora watches every major job source, tailors your CV and cover letter to each role,
  and submits the application — you just approve. Built for Germany. Works in English.`
- CTAs: `Get early access` (primary) · `See how it works ↓` (anchor)
- **Engine Theater**: terminal feed, real listings typing through (v2 spec §5 unchanged, glow
  goes cobalt-on-dark / amber highlights). Floating JobCard + DraftCard orbit with 3D tilt.
- Mono proof line: `931+ live listings · 5 sources · re-scanned nightly at 02:00`

### 4.2 Real-data proof wall
- Eyebrow: `In the index right now`
- H2: `Live roles from companies you actually want.`
- Marquee of real company names (text-marks, from live-data.json, dedup, 16-24 names), slow
  ticker. Micro-line: `Pulled from our live index at build time — not a partnership claim.`

### 4.3 The pipeline — 4 steps, graphical, scroll-driven (the Tsenta-style core story)
Pinned scene: step rail pins, a cobalt progress line draws; each step activates its product
frame. Mobile: swipe-snap cards. Every step ends in one mono receipt line.
- `01 · Find` — H3: `Your agent watches. You don't.` Copy: watches all sources around the
  clock; every match scored with a plain-language why. Frame: JobCard + match-reason chip.
  Receipt: `[02:00] nightly scan · 5 sources · +38 new matches`
- `02 · Prep` — H3: `Tailored per role. Every change visible.` Copy: CV + cover letter rewritten
  per role from your real background, graded on 6 dimensions before you see them; German or
  English, natively. Frame: DraftCard + ScoreBars + mini diff-view. Receipt: `draft scored
  92/100 · 6 checks passed`
- `03 · Apply` — H3: `You approve. The agent does the typing.` chip: `at launch` Copy: fills the
  application on the company's own careers page, answers screening questions in your voice,
  sends you a receipt for every submission — approve one by one, or switch on auto-approve.
  Frame: ApplyCard/receipt. Receipt: `application submitted · receipt saved · 47 fields`
- `04 · Track` — H3: `Your pipeline runs itself.` Copy: replies land on the right application,
  statuses advance, polite follow-ups drafted when employers go quiet. Frame: TrackerRows.
  Receipt: `status → interview · follow-up drafted`

### 4.4 Platforms — `One agent. Everywhere you already are.`
5 cards: **Web app** · **WhatsApp** · **iMessage** · **Claude / MCP** · **Chrome extension**.
Each: icon, one line of use-case copy, mono `at launch` tag (web: `first`). Section CTA:
`Get early access — be first when the doors open.` No fake "open app" links.

### 4.5 Numbers band (midnight, odometer counters, real data)
`931+` live listings · `5` sources · `374` legal checks in the visa engine · `6` score
dimensions. One line under: `Real numbers from the engine, refreshed every deploy.`

### 4.6 Reviews — BUILT BUT HIDDEN (`enabled: false` in content)
Full section component (3-card quote layout, name/role/outcome schema) behind a flag. It ships
dark until real beta quotes exist. No placeholder quotes visible, ever.

### 4.7 Early-access offer band
- H2: `Free while we build. Founding pricing when we launch.`
- Copy: early users run the full product free during beta, help shape it, and lock the best
  pricing we will ever offer. (No invented "N free applications" number — the free-quota
  number is TBD business; NEEDS_INPUT if Jay wants a figure here.)

### 4.8 Pricing preview (+ full `/pricing` page)
- H2: `Pay per application. Never per month.`
- The chosen model, truthfully: credit-based, credits never expire, no subscription, top up
  when you need it. 3-card structure (Starter/Focus/All-in) showing WHAT scales (application
  volume) with `Pricing locks at launch` in place of € numbers. FAQ row: beta = free.

### 4.9 FAQ teaser (4) + full `/faq` page (~14, categorized: The agent · Germany & visas ·
Data & privacy · Early access). MUST include, verbatim honesty anchor:
`What works today, and what arrives at launch?` → today: matching engine, tailored CV + cover
letter drafts with scoring, application tracking — you click Apply yourself. At launch:
the agent submits for you (with per-application approval), WhatsApp/iMessage/Claude/Chrome.
Also: `Is auto-applying even allowed?` (our answer: you approve every application; we fill the
company's own form — plus GDPR/EU hosting) · `Will employers know an AI helped?` ·
`I'm not German — does it work in English?` · visa question (the moat card's backing).
JSON-LD FAQPage on `/faq`.

### 4.10 Final CTA band (midnight, amber-warm) + mega-footer
- H2: `Your job hunt, off your plate.` Sub: `Join early access — Berlin first, then everywhere.`
- Email capture (same waitlist route; success = warm confirmation + copy-link referral).
- Footer: anchors, sub-pages, Impressum, Datenschutz, `EU-hosted · GDPR-first`, `EN` stub.

## 5. Motion — BOLD tier (unchanged from v2 except colors; Lenis approved)

Engine Theater typing (24-40ms/char, glow pulses, loops, static under reduced-motion) ·
split-text H1/H2 reveals · GSAP batch entrances (fade/rise/settle) · **2 pinned scenes**: the
pipeline rail (§4.3 — replaces v2's problem scene) and hero micro-parallax on frames ·
magnetic CTAs · 3D-tilt frames · odometer counters · ticker marquees (proof wall) · aurora
drift (cobalt/sky on midnight, amber on paper) · hovers on every interactive element.
Hard lines unchanged: reduced-motion collapses everything to opacity, no scroll-hijack,
CLS < 0.05, JS ≤ 230KB gz first-load, LCP < 2.0s (theater first frame is server-rendered).

## 6. Live data pipeline & build rules (unchanged from v2 §6/§6a — summary)

`scripts/fetch-live-data.mts` prebuild (SELECT-only, env `DATABASE_URL`, never printed) →
`src/content/live-data.json`: total actives, per-source counts + latest scrape, curated ~24
listings (all contract types now — generic audience; still exclude `unknown`-classified rows,
titles ≤60ch), company names for the proof wall (dedup, 16-24). Committed snapshot fallback,
loud warning if stale. devDeps approved: `@neondatabase/serverless`, `tsx`. Runtime dep
approved: `lenis`. Beyond that, none without coordinator approval.
All copy in `src/content/en.ts`; claims via `claims.ts` reading live-data.json.
SEO: per-page metadata, OG images via `next/og` (midnight bg, cobalt/amber accents), sitemap,
robots. `metadataBase` from `NEXT_PUBLIC_SITE_URL`. WCAG AA; `prefers-reduced-motion` tested.

## 7. Agent plan

| Phase | Scope | Checkpoint |
|---|---|---|
| W2b (same agent, context intact) | Retheme to cobalt/amber + rebuild `/` as the 10-section flow, all-new copy, theater + pipeline scene + proof wall + live data | **screenshots + localhost — Jay reviews before W3** |
| W3 | `/pricing`, `/faq`, legal pages, SEO/OG, review-section flag wiring | screenshots |
| W4 | QA (Lighthouse/a11y/responsive/reduced-motion), verifier pass, Vercel deploy | live URL sign-off |

Standard guardrails every phase: lane lock `apps/website/`, no commits/pushes, no secrets in
output, honesty greps (now also: no invented user counts/hires; `at launch` tags present on
Apply step + platform cards), typecheck/biome/build clean, screenshots to scratchpad AND
`screenshots-website-w2/` in the repo, leave localhost:3001 running for Jay.

## 8. Launch checklist (W4 gate) — as v2, plus:
- [ ] Early-access badge visible in hero at 375px and 1440px
- [ ] FAQ honesty anchor present and unedited in meaning
- [ ] Reviews section renders nothing while `enabled: false`
- [ ] Proof-wall companies cross-checked against live DB at deploy
- [ ] `at launch` tags on Apply step + 4 platform cards verified in rendered HTML
