# Agora website — copy deck v4 (FOR APPROVAL)

Direction locked by Jay 2026-08-04: **split canvas · deep teal & sand · live engine terminal hero.**
Nothing in this document is in the site yet. Jay approves, then it ships.

Band rhythm (the "split canvas" rule): **paper = you, midnight = the machine.**

| # | Section | Canvas |
|---|---|---|
| 1 | Hero + live engine terminal | paper (terminal is a dark inset) |
| 2 | Proof wall | paper |
| 3 | The problem | **midnight** |
| 4 | The pipeline — 4 steps | paper |
| 5 | Numbers | **midnight** |
| 6 | Germany | paper |
| 7 | Platforms | **midnight** |
| 8 | Early access + pricing preview | paper |
| 9 | FAQ teaser | paper |
| 10 | Final CTA + footer | **midnight** |

---

## Verified facts behind every number here

| Claim | Value | How verified |
|---|---|---|
| Live listings | **921** | `live-data.json`, built from prod Neon |
| Companies indexed | **504** | same |
| Sources | **5** | arbeitsagentur 389 · arbeitnow 319 · tu_berlin 128 · berlin_startup_jobs 70 · jobicco 15 |
| Last nightly batch | **213** | scraped 4 Aug 00:29 |
| Legal checks | **374** | ran `packages/legal` suite — 374 passed |
| Score dimensions | **6** | `packages/ai/src/eval.ts`: ats, keywords, factual, format, tone, language |
| Proof-wall companies | **22 real names** | `live-data.json` |

No user counts. No hires. No testimonials. No ratings. Nothing invented.

---

## 0. Nav

- Wordmark: **AGORA**
- Links: `How it works` · `Germany` · `Pricing` · `FAQ`
- CTA: `Get early access`

---

## 1. Hero — paper, with dark terminal inset

**Badge:** `● Early access — Berlin first`

**H1** *(chosen by Jay)*:
> An agent that job-hunts while you get on with your life.

**Sub:**
> Agora watches every major job source in Germany, tailors your CV and cover letter to each role, and files the application. You just approve. Works in English. Built for how German hiring actually works.

**CTAs:** `Get early access` (primary) · `See how it works ↓` (secondary)

**Terminal panel** — types through *real* listings from the live index:

```
agora.engine                                    ● live
[00:29]  nightly scan · 5 sources

  ✓ Stromnetz Berlin · Werkstudent Geo- und Netzinformationen
      Berlin · German not required
  ✓ YGO · Team Lead, Product Engineering
      Berlin · Vollzeit
  ✓ Recare · Working Student Finance Data & Analytics
      Berlin · B2
─────────────────────────────────────────────────────────
921 live listings · 213 added last night
```

**Proof line (mono):** `504 companies indexed · 5 sources · last scan 02:29, Berlin time`

> *Changed during build:* this line originally repeated "921 live listings", which the
> terminal footer directly above it already says. On screen the repetition was obvious, so
> the proof line now carries what the terminal doesn't — breadth and cadence. Say the word
> if you'd rather have the listing count in both places.

---

## 2. Proof wall — paper

**Eyebrow:** `In the index right now`

**H2:** Real roles, from real companies, today.

**Marquee** (22 real names from the live DB): Deutsche Post · Stromnetz Berlin · Flix · Wolt · Speechify · 1KOMMA5˚ · Buena · Distribusion Technologies · Lassie · FinMent · DATATRONiQ · K-tronik · avanti · Lucid Labs · NICO Europe · CALIMA · Auralis Group · Pertemps ERP · AK24 · Horbach Beratungen Berlin · Lionflence · YGO

**Micro-line:**
> Pulled live from our index when this page was built. These are companies whose roles we index — not partners, and not a claim about who hires our users.

---

## 3. The problem — MIDNIGHT

**Eyebrow:** `Why this exists`

**H2:** Job hunting became a full-time job.

**Three beats:**

1. You check the same five sites every night and see the same roles you saw last night.
2. Every application wants your CV rewritten for its keywords, its form, its screening questions.
3. And in Germany there's a second layer nobody explains: which contract you're allowed to take, how many hours you may work, whether that "B2 required" is real.

**Close:**
> So most people apply to fewer jobs, more slowly, worse — and call it bad luck.

---

## 4. The pipeline — paper, 4 pinned steps

**Eyebrow:** `How it works`

**H2:** Four things, done for you, on a loop.

### 01 · Find
**H3:** Your agent watches. You don't.
**Body:** Every source, every night. Each new role is scored against your profile with a plain-English reason attached — so you know why it surfaced before you open it.
**Receipt:** `[00:29] nightly scan · 5 sources · 213 new roles`

### 02 · Prep
**H3:** Tailored per role. Every change shown.
**Body:** Your CV and cover letter rewritten for the specific role, drawn from your real background — never invented. Graded on six dimensions before the draft reaches you. German or English, natively.
**Receipt:** `draft scored 92/100 · 6 checks passed`

### 03 · Apply  `at launch`
**H3:** You approve. The agent types.
**Body:** It fills in the company's own application form, answers the screening questions in your voice, and sends you a receipt for every submission. Approve them one at a time — or switch on auto-approve once you trust it.
**Receipt:** `submitted · 47 fields · receipt saved`

### 04 · Track
**H3:** The pipeline runs itself.
**Body:** Replies land on the right application. Statuses move on their own. When a company goes quiet, a polite follow-up is drafted and waiting for you.
**Receipt:** `status → interview · follow-up drafted`

---

## 5. Numbers — MIDNIGHT, odometer counters

**H2:** Real numbers from the engine.

| | |
|---|---|
| **921** | live listings |
| **504** | companies indexed |
| **5** | sources scanned nightly |
| **374** | legal checks passing |

**Sub:** Read from the live database every time this page is deployed. Last scan: 4 August, 00:29.

---

## 6. Germany — paper

**Eyebrow:** `The part other tools skip`

**H2:** It knows the German rules. All of them.

**Body:**
> Werkstudent or Minijob. The 20-hour cap during term. The 140-day rule. Mindestlohn. Whether the residence permit you actually hold allows the contract in front of you. Agora models all of it and checks every match against it — and 374 automated tests keep it honest.

**Chips:** `Werkstudent` · `Minijob` · `20 h/week cap` · `140-day rule` · `Mindestlohn` · `Chancenkarte`

**Micro-line:**
> Guidance, not legal advice. Genuine edge cases belong with the Ausländerbehörde — and we tell you when you've hit one.

---

## 7. Platforms — MIDNIGHT

**Eyebrow:** `Wherever you already are`

**H2:** One agent. Five front doors.

| Card | Tag | Line |
|---|---|---|
| **Web app** | `first` | The full workspace — matches, drafts, tracker. |
| **WhatsApp** | `at launch` | "Anything good today?" — and it answers. |
| **iMessage** | `at launch` | Same agent, blue bubbles. |
| **Claude / MCP** | `at launch` | Run your job hunt from inside Claude. |
| **Chrome extension** | `at launch` | On any job page: score it, draft for it, save it. |

**Section CTA:** `Get early access`

---

## 8. Early access + pricing preview — paper

**H2:** Free while we build. Founding price when we launch.

**Body:**
> Early users get the full product free through the beta, help decide what ships next, and lock the lowest price we will ever offer.

### Pricing preview

**H3:** Pay per application. Never per month.

**Body:**
> Credits, not a subscription. You buy them once, they don't expire, and you spend them only when the agent does work for you. No billing clock running while you're not looking.

Three cards showing what scales (application volume), price shown as `Locks at launch`:

| Starter | Focus | All-in |
|---|---|---|
| Testing the water | Actively hunting | Hunting hard |
| `Locks at launch` | `Locks at launch` | `Locks at launch` |

**Row underneath:** `During beta: free.`

---

## 9. FAQ teaser — paper

**H2:** The questions everyone asks first.

**1. What works today, and what arrives at launch?**  ← *honesty anchor, never softened*
> Today: the matching engine across 5 sources, tailored CV and cover letter drafts with six-dimension scoring, and application tracking — you click Apply yourself, on the company's own site. At launch: the agent submits for you with per-application approval, plus WhatsApp, iMessage, Claude and the Chrome extension.

**2. Is an agent applying for me even allowed?**
> You approve every single application before it goes anywhere, and we fill in the company's own form rather than routing around it. Nothing is sent without your say-so, and your data stays in the EU.

**3. Will employers know an AI helped?**
> Your documents are built from your real experience, in your own voice — nothing invented. That is the same help a sharp friend or a career coach gives you, and it isn't something you have to declare.

**4. I don't speak German. Does it work?**
> The whole product is in English. It reads German job ads for you, tells you honestly when a role genuinely needs German, and writes your German documents when a role calls for them.

**Link:** `All questions →`

---

## 10. Final CTA — MIDNIGHT

**H2:** Your job hunt, off your plate.

**Sub:** Berlin first, then the rest of Germany. Get in before the doors open.

**Form:** `you@email.com` → `Get early access`

**Micro:** No spam. One email when your access is ready. Unsubscribe in one click.

**Success state:** You're in. We'll email you the moment Berlin opens.

---

## Footer

| Product | Legal |
|---|---|
| How it works | Impressum |
| Germany | Datenschutz |
| Pricing | |
| FAQ | |

**Line:** `Made in Berlin · Hosted in the EU · GDPR-first`

*Defaults applied (say the word to change either):*
- *`Story` and `Contact` dropped — those pages don't exist and a dead link costs more trust than the link gains.*
- *No `EN | DE` switch until German copy exists. A switch that does nothing is worse than no switch.*

---

## Decisions locked by Jay

| Question | Answer |
|---|---|
| H1 | *An agent that job-hunts while you get on with your life.* |
| Free quota figure | No number — "free through the beta" |
| Pricing tiers | Starter / Focus / All-in |
| Direction | Split canvas · deep teal & sand · live engine terminal |

---

## Theme v5 — "indigo & apricot on ivory" (Jay, 2026-08-04, Wobo reference)

Replaces the teal & sand theme entirely. Constraints Jay set: **no green, no black.** The
darkest surface on the site is `#1E1B3A`, a deep indigo — there is no neutral black anywhere.

**Canvas rule changed too:** the page is now **light-dominant**. Dark appears as *cards* —
the terminal, the problem's closing line, the numbers, the one live platform card — plus a
single dark closing band. No more alternating full-width bands.

**Type:** Sora (display) + DM Sans (body) + Spline Sans Mono (receipts). All self-hosted.

```
ivory      #FAF8F4   page canvas (warm ivory)
ivory-deep #F3EFE8   insets, section washes
line       #E7E1D6   hairlines

ink        #1E1B3A   deep indigo — dark cards, terminal, closing band  (15.55 on ivory)
ink-card   #272348   raised surfaces on ink
ink-line   #39345E   hairlines on ink

indigo      #4F46E5  primary actions, links                (5.93 on ivory)
indigo-deep #4338CA  hover / pressed                       (7.45 AAA)
indigo-soft #A9B2FF  indigo-family text ON ink             (8.25 AAA on ink)

apricot      #FF9F5A warm accent — DECORATION ONLY on ivory (1.91 — never text)
apricot-soft #FFC49A apricot text on ink                    (10.69 AAA on ink)
apricot-ink  #9A4A12 the only apricot allowed as text on ivory (5.89 AA)

text        #1A1830  body on ivory                          (16.26 AAA)
text-mute   #514D6B  secondary on ivory                     (7.55 AAA)
text-soft   #635F7C  labels ≥13px on ivory                  (5.72 AA)
on-dark     #EDECF7  body on ink                            (14.09 AAA)
on-dark-mute #A6A2C4 secondary on ink                       (6.74 AA)
```

### Hero banner — not built yet
Jay chose a cinematic image above the headline (Wobo-style). The slot is wired in
`Hero.tsx` as `BANNER` and stays `null` until the image exists, so the page is complete
without it. **Blocked on Higgsfield authentication.**
