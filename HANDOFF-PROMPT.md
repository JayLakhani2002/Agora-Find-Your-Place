# Handoff prompt — paste this into the new session

You are picking up an in-progress premium rebuild of the Agora marketing website. The previous
session (a Fable 5 planner coordinating Opus 5 executor agents) hit its context limit. Everything
you need is in the repo — read before you build.

## Project & task

- Repo: `/Users/jay/Documents/Projects/Agora Jobs` (Turborepo + pnpm). The marketing site is
  `apps/website` (Next.js 15 App Router, Tailwind, GSAP, framer-motion; `lenis` approved).
- **The binding spec is `apps/website/BUILD-GUIDE.md` (v3). Read it in full first.** It encodes
  all of Jay's decisions: one-page Tsenta-style flow, cobalt & amber on paper palette, generic
  audience (NOT student-first), full-agent story under early-access framing, all-new copy hooks,
  Engine Theater hero, real-data proof wall, bold motion tier. Do not re-litigate any of it.
- `apps/website/CLAUDE.md` has a supersession banner — only its honesty guardrails and analytics
  events still bind; v3 supersedes the rest.
- Competitor reference: `docs/scope/tsenta-screenshots/` + `docs/scope/research/TSENTA-KEY-FINDINGS.md`
  — structure inspiration ONLY; their copy text, brand, palette are legally off-limits.

## State when the session ended

- **W1 (done):** foundation on the OLD marble/laurel theme — tokens, nav/footer shell, product-UI
  frames (`src/components/frames/`), 6 landing sections, `content/en.ts` + `claims.ts`.
  Verified: typecheck/biome/build clean, 118KB first-load JS, honest-claims greps clean.
- **W2 (killed mid-flight):** started bold motion + Engine Theater + live-data pipeline on the
  old theme; was stopped when Jay pivoted the direction to v3. Tree may hold partial work.
  Known GSAP gotcha it found: a CSS `translateY(110%)` start value is parsed as px — force
  explicit start values when animating `yPercent`.
- **W2b (was running in background when the session ended):** a fresh Opus agent rebuilding the
  complete one-page `/` per v3 — 10 sections, retheme, new copy, pinned pipeline rail, proof
  wall, live-data script `scripts/fetch-live-data.mts` → `src/content/live-data.json`.
  **Its work lands in the working tree; it may have finished, partially finished, or died with
  the session. YOUR FIRST STEP: assess the actual tree state** — `git status -- apps/website`,
  `pnpm --filter @agora/website typecheck && build`, open the site, compare against v3 §4's
  10 sections. Finish whatever W2b left undone before moving on.
- A report may exist at `screenshots-website-w2/` (repo root) — screenshots for Jay.

## Remaining phases (from v3 §7)

1. Finish W2b if incomplete → **checkpoint: leave `next start` on port 3001 running and ask Jay
   to review at http://localhost:3001 before continuing.** Jay reviews every phase visually.
2. W3: `/pricing`, `/faq` (content per v3 §4.8/§4.9 incl. the FAQ honesty anchor), `/impressum`
   + `/datenschutz`, SEO/OG (`next/og`, sitemap, robots, `metadataBase` from
   `NEXT_PUBLIC_SITE_URL` env — NEVER hardcode a domain; Jay owns none yet).
3. W4: QA — Lighthouse mobile ≥90 perf, WCAG AA pass, responsive 375/768/1440, reduced-motion
   walkthrough (nothing invisible), then deploy to Vercel free URL (`fra1`), set
   `NEXT_PUBLIC_SITE_URL`, set `WAITLIST_WEBHOOK_URL` (waitlist currently returns ok without
   storing if unset — must be fixed before real traffic), Jay signs off on the live URL.
   The Vercel URL then finally gives Jay a truthful website for the AWS Bedrock Anthropic
   use-case form (his separate blocker).

## Hard rules (Jay agreed to these; do not drop them)

- **Honesty (UWG-binding):** NO fabricated user counts, hires, reviews, ratings, or testimonials.
  Reviews section ships `enabled: false`, zero DOM. Proof wall = real company names from the live
  DB, labeled as indexed listings. Full-agent capabilities only under the visible early-access
  frame; the FAQ "what works today vs at launch" answer never softens. Real numbers only.
- Never commit or push without Jay's explicit ask. Working tree holds everything; Jay reviews.
- Secrets: `DATABASE_URL` etc. live in root `.env.local` — read programmatically, never print.
  The live-data build script is SELECT-only against the production Neon DB.
- Lane: website work stays in `apps/website/`. Other agents' uncommitted work from the same
  night sits in `apps/web`, `apps/workers`, `packages/db` — don't touch, don't "clean up".
- Dependencies frozen except: `lenis` (runtime), `@neondatabase/serverless` + `tsx` (dev).
- When a decision is genuinely Jay's (copy tone, a number like the free-application quota,
  visual calls), ask him directly with concrete options, not open questions.

## Context beyond the website (so you don't collide or undo things)

That session also ran (all verified, in working tree, uncommitted): résumé-builder bug fixes +
live-DB test suite, migrations 0003/0004 applied to prod Neon, scraper revival (TU Berlin built:
`scrape-tu-berlin.ts`; stellenticket deleted), and a classifier fix adding an `unknown` contract
type (migration 0005, may be mid-flight — check `packages/db/drizzle/`). DB currently: ~931+
jobs, 1 user, 9 applications. Pending non-website work: TU Berlin re-scrape (waits on classifier),
embedding backfill for new sources, semantic search upgrade of `jobs.search`. AWS Bedrock Claude
access is still blocked on Jay submitting the use-case form (`infrastructure/bedrock-use-case.json`
has the prepared text); every AI-generation feature is untestable until then.

Start by reporting the tree state you find, then continue the phase plan. Jay wants to be kept
in the loop with visual checkpoints, and he answers option-style questions fast.
