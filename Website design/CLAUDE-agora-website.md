# CLAUDE.md — Agora Marketing Website (Landing Page)

You are the frontend agent for the **Agora marketing website**. This file is your complete context.
Read it fully before writing any code. Where this file makes a decision, follow it exactly.
Where it leaves something open, propose 2–3 options and wait for approval before building.

---

## 1. Mission

Build the public marketing website for **Agora** — the job app for international students in Berlin.
Tagline: **Find your place.**

The site must feel like Apple / Tesla-grade craft (minimalism, precision, orchestrated motion) but
**warm** — this is a jobs-and-belonging brand for stressed students in a foreign country, not a car
launch. Every signal must say *safe, knowledgeable, on your side*.

This is a marketing site, not the app. The PWA (Agent 6) is a separate codebase. This site's only
jobs: explain, build trust, capture signups/waitlist, and show off Ari.

---

## 2. Non-negotiable brand facts

- **Name:** Agora (the ancient Greek public square — marketplace + gathering place). Pronounced AH-gor-ah.
- **Tagline:** *Find your place.* Always paired with a specific subline, e.g. "The job app for international students in Berlin — visa-aware, German-level-aware, ATS-tested."
- **Mascot/guide:** **Ari** — a friendly 2D illustrated human guide. Peer energy: the slightly-older student who's been through it. Never an authority figure. Demographically open (stylized, never photoreal). One quiet classical detail only: we use **an olive-leaf pin**. Hidden meanings: Ariadne (the thread out of the labyrinth) and *xenagós* (the guide who leads strangers).
- **The moat, made audible:** drop *140-day rule, 20-hour cap, Minijob, Werkstudent, BAföG, Mindestlohn* casually in copy, the way a knowledgeable German friend would.
- **Voice:** warm, honest, specific. Plain verbs, sentence case. No hype, no "revolutionary."

### Hard guardrails (legal/brand — never violate)
- NEVER phrase anything as "AI applies for you" / "auto-apply." Mode 2 is **"smart autofill — you always click the company's own Submit button."**
- NEVER make absolute claims ("guaranteed job"). No fake user counts, no fabricated testimonials. Use clearly-labeled placeholder slots (`{{TESTIMONIAL_1}}`) until real beta quotes exist.
- The "beats GPT-5 on German ATS" claim ships only with a link to the (future) methodology post; until then use: "tested against the ATS platforms German companies actually use — Softgarden, Personio, d.vinci."
- GDPR-first: EU hosting note in footer, no dark patterns, no exit-intent popups, cookie banner only if analytics require it (prefer PostHog EU with cookieless mode).

---

## 3. Tech stack & repo

- **Framework:** Next.js 14+ (App Router) + TypeScript — matches the main Agora PWA stack.
- **Styling:** Tailwind CSS + CSS variables for all design tokens (defined in §5). shadcn/ui only for primitives (accordion, dialog); style everything to our tokens.
- **Motion:**
  - **GSAP + ScrollTrigger** — scroll choreography, pinning, scrubbed timelines, the Thread.
  - **Framer Motion** — component-level micro-interactions (buttons, cards, Ari's springs).
  - **Lenis** — smooth scroll (desktop only; native scroll on touch).
- **Ari:** hand-built layered **inline SVG React component** (see §6). No Lottie, no image files — Ari must be theme-able, lightweight, and swappable for commissioned art later (keep the same component API).
- **Deploy:** Vercel, `fra1` region. 
- **Fonts:** self-host via `next/font` (Google Fonts sources): Marcellus, Hanken Grotesk, Spline Sans Mono.
- **Analytics:** PostHog EU (cookieless), events: `hero_cta_click`, `waitlist_submit`, `ari_chat_opened`, `ari_chat_message`, `faq_open`, `section_view:{id}`.
- Repo: `agora-website/`, standalone. Standard CI: lint + typecheck + build on PR.

---

## 4. Design direction (decided — do not re-litigate)

**Concept: "Sunlit stoa."** Walking through the agora's colonnade: alternating light and shadow.
Light sections = warm marble. Dark sections = Berlin-night ink. The scroll rhythm itself
(light → dark → light) is part of the design. Minimal, lots of air, few elements per viewport,
one idea per section.

This is deliberately NOT: generic SaaS gradient-purple, neon-green-on-black AI-tool look
(Jobright/AIApply territory), or a cream+terracotta editorial template. 

**The one signature element (spend all boldness here): Ari + the O + the Thread.**
Everything else stays quiet and disciplined.

---

## 5. Design tokens

```css
:root {
  /* Color */
  --marble:      #FAF8F3;  /* page light bg — warm white, not cream */
  --marble-deep: #F0ECE3;  /* cards/insets on light */
  --ink:         #14161B;  /* dark sections — blue-black Berlin night */
  --ink-soft:    #1E2128;  /* cards on dark */
  --laurel:      #1F7A53;  /* PRIMARY: actions, eligibility ticks, the Thread */
  --laurel-bright:#2EA06C; /* hover, thread on dark bg */
  --amber:       #E8A33D;  /* Ari's accent (scarf/pin), highlights — use sparingly */
  --text:        #1A1C21;
  --text-mute:   #5C6066;
  --text-on-ink: #F2F0EA;

  /* Type */
  --font-display: 'Marcellus', serif;        /* lapidary/inscription feel; AGORA wordmark, H1/H2. Often letterspaced caps. */
  --font-body:    'Hanken Grotesk', sans-serif; /* all UI + body, 400/500/700 */
  --font-data:    'Spline Sans Mono', monospace; /* match scores, eligibility chips, numbers: "9.1/10", "✓ 18h/week" */

  /* Scale (desktop / mobile) */
  --h1: clamp(3rem, 7vw, 6.5rem);   /* Marcellus, tracking 0.02em */
  --h2: clamp(2rem, 4vw, 3.5rem);
  --body: 1.0625rem; line-height 1.65;
  --eyebrow: 0.8125rem, --font-data, uppercase, tracking 0.14em, color laurel;

  /* Motion */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-fast: 200ms; --dur-base: 450ms; --dur-slow: 900ms;
  /* Scroll reveals: y 24px + opacity, stagger 60ms. Nothing animates scale > 1.04. */

  /* Shape */
  --radius: 16px; --radius-pill: 999px;
  /* Recurring motif: the circle (the O). Section markers, avatar frames,
     image masks and the chat launcher are all circles. No other decorative shapes. */
}
```

Eligibility chips (core product motif, reused everywhere): pill, `--font-data`,
`✓ Visa eligible` / `✓ German B1 OK` / `✓ 18h/week` / `✓ €17/hr` — laurel on light, laurel-bright on ink.

Dark/light: sections alternate per §8; no global theme toggle in v1.

---

## 6. Ari — component spec (the heart of the site)

Ari is built in code now (geometric SVG, warm and friendly) and swapped for commissioned
illustration later. Keep the component API stable.

### 6.1 Anatomy (single SVG, layered groups)
- `#head` — circle, warm skin-neutral tone (`#E7C9A9` — intentionally ambiguous), simple rounded hair shape in ink.
- `#eyes` — two groups: white + iris (ink) + tiny highlight. **Pupils translate within a ±3px clamp toward a target point** (this is the cursor-following).
- `#brows`, `#mouth` — simple paths with 4 swappable expressions: `neutral | happy | thinking | celebrating`.
- `#body` — minimal rounded torso, **amber scarf**, **olive-leaf pin (laurel)**.
- `#hand` — can point left/right/down (used to gesture at content).
- The whole figure must read at 40px (inside the O) and at 200px (section guide).

### 6.2 `<Ari />` API
```tsx
<Ari
  size={number}
  pose="in-the-O" | "peeking" | "walking" | "pointing" | "sitting" | "waving"
  expression="neutral" | "happy" | "thinking" | "celebrating"
  lookAt={{x,y} | "cursor" | "scroll" | null}
  speech={string | null}   // renders a circle-cornered speech bubble, Hanken Grotesk
/>
```

### 6.3 Hero behavior — "Ari in the O"
- Hero wordmark **AGORA** set in Marcellus. The **O is rendered as a ring** (SVG) and Ari's head + shoulders sit inside it like a porthole.
- **Idle:** Ari blinks every 4–7s (random), occasionally glances around.
- **Cursor tracking (desktop):** pupils track the cursor globally (rAF, lerp 0.08, throttled). When the cursor hovers ANY interactive element (`a, button, input, [data-ari]`), Ari's whole head tilts toward it and a small speech bubble appears with that element's `data-ari-hint` text, e.g. `data-ari-hint="This shows you how the matching works"`. Hide after 2.5s or on leave. Max one hint per 8s (don't be a clippy).
- **Touch devices:** no cursor tracking; eyes follow scroll direction (look down while scrolling down). Hints disabled; Ari instead reacts at section entries (see §8).

### 6.4 The Thread (signature scroll device — the one aesthetic risk)
A single continuous **SVG path in laurel** — Ariadne's thread — starts tied to the hero O,
and runs down the entire page, weaving left/right between sections, ending tied in a small
bow at the footer next to "You found your place."
- Implementation: one absolutely-positioned SVG per section band, paths visually continuous across boundaries; `stroke-dashoffset` scrubbed by GSAP ScrollTrigger so the thread **draws itself just ahead of the user's scroll position**.
- **Ari travels along the thread**: a small (56–72px) Ari in `walking` pose is pinned near the thread's drawn tip — implemented with `offset-path` (CSS motion path) driven by the same scroll progress. Ari pauses at each section anchor, switches pose/expression per §8, then walks on.
- The thread doubles as scroll-progress indication. On mobile: thread simplifies to a 2px vertical line along the left edge, still scroll-drawn; Ari appears statically at each section header instead of traveling.
- `prefers-reduced-motion`: thread renders fully drawn and static; Ari static, no tracking, expressions still change per section (no translation).

---

## 7. Ari chat — "Talk to Ari" demo

A floating circular launcher (the O motif, Ari peeking) bottom-right. Opens a chat sheet.
This is a **demo of the in-app companion** (the full memory system ships in the app), but the
demo must be genuinely useful, not canned.

- **Backend:** Next.js route handler `POST /api/ari` → Anthropic Messages API (`claude-sonnet-4-6` class model), streaming. API key in env var, never client-side. Rate limit: 10 messages/session, 30/day/IP (simple KV or in-memory + IP hash); after the cap: "I'd love to keep talking — that's what the app is for. Join the waitlist?"
- **System prompt for Ari** (write it into `lib/ari-system-prompt.ts`): persona per §2; scope = German student-work rules (140-day rule, 20h cap, Werkstudent vs Minijob, Chancenkarte basics), how Agora works, Berlin arrival topics. Refuse legal/visa edge cases with "that one's worth checking with the LEA or a lawyer — here's the official link." Always answer in the user's language (EN/DE at minimum). 2–4 sentences max per reply. End ~every third reply with a soft nudge toward the waitlist, never pushy.
- **Memory (demo level):** persist conversation in `localStorage` (`ari_demo_convo`) and replay it into the API call so Ari remembers the session ("you said you're at TU on a student visa…"). Show a small "Ari remembers this chat on your device — clear" control. In copy, explain: *in the app, Ari remembers your profile, your applications, and your interview prep — like a guide who actually knows you.*
- UI: circle avatar, typing indicator = Ari `thinking` expression, suggested starter chips: "What's the 140-day rule?" · "Werkstudent vs Minijob?" · "What is Agora?"

---

## 8. Page architecture & scroll choreography

One page, nine bands. `[L]` = marble (light), `[D]` = ink (dark). Each band: eyebrow (font-data,
laurel) + Marcellus headline + max ~40 words of body. Real copy is provided — use it; refine
rhythm, don't change meaning.

### 0. Nav `[L, transparent → marble on scroll]`
Left: compact AGORA wordmark (Ari's eyes still track in the nav O — tiny, just pupils).
Right: How it works · Story · FAQ · `Join the waitlist` (laurel pill). Mobile: sheet menu.

### 1. Hero `[L]`
- Giant **AGORA** wordmark, Ari in the O (full behavior §6.3). Below: *Find your place.* (Marcellus italic? No — Marcellus has no italic; set it small-caps) + subline: "The job app for international students in Berlin — visa-aware, German-level-aware, ATS-tested."
- Primary CTA `Join the waitlist` + secondary `Meet Ari ↓`.
- Load sequence (one orchestrated moment, ~1.6s total): wordmark letters rise with 40ms stagger → O ring draws → Ari pops in (spring, +overshoot 1.04) and **waves** → tagline fades up → the Thread begins to draw out of the O as soon as the user scrolls.
- Floating eligibility chips drift subtly around the wordmark (`✓ Visa eligible`, `✓ B1 OK`, `✓ 20h/week`) — parallax at 0.9/1.0/1.1 scroll factors, opacity 0.7. Maximum three. 

### 2. The story `[D]` — "Why Agora exists"
Scrollytelling, pinned ~2.5 viewports. Three beats, text swaps while a phone-frame visual morphs:
1. *"I arrived in Berlin with a CV and no idea what I was legally allowed to do."* — visual: chaotic wall of greyed job cards stamped `?`.
2. *"Every job board showed me jobs I couldn't take. Every application vanished into an ATS."* — cards get struck through; one lonely cursor blinks.
3. *"So we built the app we needed: it knows your visa, your hours, your German — and only shows you what fits."* — cards collapse to ONE card with laurel chips lighting up `✓ ✓ ✓`. Ari (thread-traveler) sits at the edge watching, expression `thinking` → `happy`.

### 3. The problem, named `[D→L transition]` — "The labyrinth"
Short band. A thin maze pattern drawn in `--marble-deep` strokes behind the text; the Thread
visibly cuts straight through it. Copy: the 140-day rule, the 20-hour cap, Minijob thresholds,
BAföG, German-only ATS portals — "none of it is explained anywhere. We modeled all of it."
Four stat-ish chips (font-data): `140-day rule ✓ modeled` · `§Chancenkarte ✓` · `Werkstudent ✓` · `Minijob ✓`.

### 4. How it works `[L]` — "Four steps to your place" (the tools section)
Desktop: GSAP pinned **horizontal scroll** through 4 panels. Mobile: vertical stacked cards.
Each panel = device mockup (build real UI mock components, not screenshots) + Ari pointing:
1. **Profile** — upload CV, answer a few smart questions. Mock: extraction UI.
2. **Discover** — daily swipe deck, only legal matches. Mock: swipe card with match score `9.1/10` + chips; auto-plays one swipe animation when panel becomes active.
3. **Apply** — tailored CV + cover letter, quality-checked. Mock: "Application quality 9.3/10" score card with the 6 eval dimensions ticking up as counters.
4. **Track** — pipeline board + interview prep from Ari. Mock: kanban statuses; Ari `celebrating` at "Interview invited".

### 5. Why it wins `[D]` — benefits / proof
Three quiet columns (no icons-grid clutter): **Visa-aware by design** · **Tested against real German ATS** (Softgarden, Personio, d.vinci) · **From first Minijob to first full-time role**. One honest stats row reserved with placeholders: `{{N}} beta users · {{N}} applications generated · {{N}}% ATS parse rate` — render only when env flag `SHOW_STATS=true`.

### 6. Voices `[L]` — testimonials
Circle-avatar cards (the O motif), 3 visible + horizontal drag (Framer). All content from
`content/testimonials.json` — ships with `{{PLACEHOLDER}}` entries and a build-time warning;
never invent quotes.

### 7. Meet Ari + chat demo `[D]`
Large Ari (`sitting`, `happy`), headline "Meet Ari — your guide through the labyrinth."
Three short value lines (knows the rules · preps your interviews · remembers your journey —
*in the app, Ari remembers your profile, applications, and prep across sessions*).
Embedded inline chat (same component as the floating launcher, §7).

### 8. FAQ `[L]`
Accordion (shadcn, restyled). Use the ready-made answers VERBATIM-in-spirit from the brand
playbook: What does Agora mean? · Why the name? · How do you pronounce it? · Is it free? ·
"Does the AI apply for me?" (answer with the Mode 1/Mode 2 framing — you always click Submit) ·
Is my data safe? (GDPR, EU hosting, delete anytime). Ari's eyes glance at whichever item opens.

### 9. Footer `[D]`
The Thread arrives and ties into a small bow beside: **"You found your place."** + final CTA.
Columns: Product / Story / Legal (Impressum, Datenschutz — required in Germany) / socials
(`@joinagora`). Language switch stub EN | DE (EN ships first; structure all copy in
`content/en.ts` so DE is a file, not a refactor). Small print: "Made in Berlin · Hosted in the EU."

---

## 9. Competitor lessons (steal / avoid)

| Site | Steal | Avoid |
|---|---|---|
| **aiapply.co** | Showing the *actual product output* inline (live-looking resume/cover-letter mocks with a "99.8% match" badge); tool-per-page SEO structure for later (`/werkstudent-cv`, `/140-day-rule`) | Exit-intent coupon popups; wall of 80 testimonials; "auto-apply to 100s of jobs" framing (our legal anti-pattern); generic SaaS look, zero brand character |
| **jobright.ai** | Clean stats bar; product screenshots per feature block; they NAMED their copilot (Orion) but buried it — we make Ari the protagonist; trust badges (Trustpilot/PH) once we have them | Template feel, stock screenshots, no story, no emotion |
| **truffls.de** | German trust craft: du-form informality, DSGVO messaging, known-employer logos, "7M applications" concrete proof, QR-code-to-app on desktop (add QR → PWA install for Agora) | Their web presence is a dated listing portal + app funnel; no character, no scroll craft — proof that the German market leader is beatable on brand |

Synthesis: all three convert by *showing the product working*; none of them owns a feeling.
Agora's edge = same product-proof patterns + an actual brand (Ari, the thread, belonging).

---

## 10. Performance, accessibility, quality floor

- LCP < 2.5s on 4G mobile; hero must not wait for GSAP — render static, enhance after hydrate.
- Animate **transform/opacity only**; `will-change` sparingly; all rAF loops paused offscreen via IntersectionObserver; total JS for motion libs < 90kb gz.
- `prefers-reduced-motion`: every animation has a static fallback (thread drawn, Ari posed, sections simple-fade). This is a hard requirement, test it.
- Keyboard: visible focus (laurel ring), skip-link, accordion/chat fully keyboard operable. Ari is `aria-hidden` decorative EXCEPT the chat (proper roles, live region for streaming).
- Semantic landmarks, alt text, contrast ≥ 4.5:1 (check laurel-on-marble: if it fails for small text, darken to #176647 for text usage).
- Responsive: design at 390px first; verify 768 / 1280 / 1680. The horizontal-scroll section must degrade to vertical cards below 1024px.
- SEO: metadata, OG image (AGORA wordmark with Ari in the O), JSON-LD (Organization + FAQPage), sitemap.

---

## 11. Build order (one session per stage — keep sessions single-domain)

1. **Scaffold + tokens:** repo, fonts, Tailwind theme from §5, layout, nav, footer skeleton, deploy pipeline.
2. **`<Ari />`:** SVG anatomy, poses, expressions, eye-tracking hook (`useAriGaze`), speech bubble. Build a hidden `/playground` page showcasing every pose/expression/state — this is Ari's eval suite; screenshot-review it before proceeding.
3. **Hero band** incl. load sequence + wordmark-O integration.
4. **The Thread:** scroll-drawn path system + Ari-as-traveler. Get this right on 3 breakpoints before adding sections.
5. **Bands 2–5** (story scrollytelling, labyrinth, how-it-works horizontal scroll, proof).
6. **Bands 6–9** (testimonials, Meet Ari, FAQ, footer) + waitlist form (server action → simple store/provider TBD).
7. **Ari chat** (route handler, streaming, rate limit, localStorage memory).
8. **Hardening:** reduced-motion pass, a11y audit, Lighthouse ≥ 95 perf / 100 a11y on mobile, copy polish, OG/SEO.

After each stage: run dev server, screenshot at 390px and 1440px, self-critique against §4
("would this be mistaken for a template?"), fix, then move on.

## 12. Acceptance checklist

- [ ] Ari's eyes track the cursor everywhere; hints appear on hover of `[data-ari-hint]` elements, max 1 per 8s
- [ ] The Thread draws with scroll and Ari travels it, pausing at every band (desktop)
- [ ] Hero load sequence runs once, < 1.8s, never blocks LCP
- [ ] Horizontal how-it-works scroll works with trackpad, wheel, touch (≥1024px) and degrades below
- [ ] Chat streams, remembers within session, rate-limits, never exposes the API key
- [ ] Zero invented stats/testimonials anywhere in rendered output
- [ ] No "AI applies for you" phrasing anywhere
- [ ] reduced-motion, keyboard, 390px, Impressum/Datenschutz stubs, EU-hosting note — all present
- [ ] Lighthouse mobile: Performance ≥ 95, Accessibility 100

---

## 13. Kickoff prompt (paste this to start the first session)

> Read CLAUDE-agora-website.md in full. Confirm your understanding of the signature concept
> (Ari in the O + the Thread) in 5 bullet points, list any token/library conflicts you foresee,
> then execute Build Stage 1 (scaffold + tokens) exactly as specified. Do not begin Stage 2
> until Stage 1 runs locally and I approve screenshots.
