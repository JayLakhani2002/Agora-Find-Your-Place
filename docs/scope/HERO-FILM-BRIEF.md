# Hero Film — three-act device brief

**Status: PARKED.** Decided by Jay, 2026-08-07. Production begins after Bedrock access lands
and the features in Acts 2 and 3 actually exist. The hero currently on the site (the four-scene
`FilmScrub`, commit `c8c8fe2`) stays as-is until then, and is what AWS reviews.

This file exists so the brief and the reasoning behind parking it survive the session that
produced them.

---

## 1. The brief, in one paragraph

An Apple-keynote-grade hero: one story, three acts, three devices, no cuts, no voiceover,
18–24 seconds. **Act 1** — hands on a laptop, browser opens `agora.jobs`, an in-product demo
plays: CV in, tailored CV out, match score, apply, confirmation; lid closes. **Act 2** — a
second laptop, terminal only, an `agora apply` CLI runs and reports applications submitted.
**Act 3** — a phone rises into frame, a notification lands, a WhatsApp thread offers to apply
to matched roles and does. Closing frame: all three devices on a minimal desk, logo, tagline
*"Every job. Every device. One click."*, two CTAs.

Full production spec (resolution, frame rate, lighting, depth of field, transition timing table,
"what this is not") is in the original brief from Jay, 2026-08-07.

---

## 2. Why it is parked — the circular dependency

**Act 1 cannot be recorded today, and the reason is structural rather than a scheduling problem.**

The demo it calls for — "AI generates a tailored CV, ATS score appears" — runs through
`generateCV` / `generateCoverLetter` in `packages/ai/src/generation.ts`, which call Bedrock via
`packages/ai/src/bedrock/claude.ts`. Bedrock access is gated on the Anthropic use-case form,
which is reviewed against the live website. So:

```
record Act 1  →  needs CV generation
                 needs Bedrock
                 needs the use-case form approved
                 needs the website live
                 needs a hero
```

The hero cannot contain a recording of a feature that the hero is the precondition for.
Something has to ship first, and it cannot be this film.

**Acts 2 and 3 do not exist at all.** A repo-wide search for MCP, CLI and WhatsApp across
`apps/web` and `packages` returns nothing. There is no `agora apply` command and no chat
integration — not partially built, not stubbed. Absent.

**Act 1's ending is also not what the product does.** "One-click apply → Application Sent"
describes agent-side submission, which carries `atLaunch: true` at `apps/website/src/content/en.ts:272`.
Today the user goes to the employer's own page and clicks Submit themselves.

Filming any of the above as working software would be a misleading commercial act under UWG §5,
on the exact page AWS reads when reviewing the use-case form — i.e. it would put at risk the one
thing the website exists to unblock.

---

## 3. What is actually real today

Verified in code, not assumed:

| Brief calls for | Reality |
|---|---|
| Job discovery, matched roles | **Real.** `JobCard.matchScore`, jobs/saved/tracker screens, real scraped index. |
| Match score `87% Match` | **Partly.** A score exists but the product displays it out of 10, not as a percentage. |
| Master CV saved | **Real** (storage), see `apps/web/src/server/routers/resumes.ts`. |
| AI-tailored CV | **Blocked on Bedrock.** |
| ATS score | **Blocked on Bedrock.** |
| One-click apply → "Application Sent" | **Not shipped.** User submits on the employer's site. |
| `agora apply` CLI / MCP (Act 2) | **Does not exist.** |
| WhatsApp bot (Act 3) | **Does not exist.** |
| "Application to Spotify was viewed" | **Two problems.** Names a real employer (implies a relationship we do not have) and claims view-tracking we do not have. |

---

## 4. Decisions taken

**Sequencing — Jay, 2026-08-07.** Park the hero. Ship the current site, get Bedrock approved,
build the demo flow and the Act 2/3 features, then produce this brief in full with everything
recorded and nothing drawn. The alternative — building the three-act structure now with the
site's existing recorded/drawn two-register system — was declined in favour of a final film that
is 100% real footage.

**Device rendering — Jay, 2026-08-07.** Photoreal generated hardware, not drawn device frames.

Assumption stated on the record and not yet contradicted: photoreal but **not Apple-identifiable**
— no Apple logo, hinge profile or notch. Choosing photoreal does not require choosing Apple's
trade dress, and using their hardware in a commercial ad in a way that implies endorsement is
contrary to Apple's trademark guidelines. If Jay wants Apple-identifiable hardware, that is his
call to make explicitly.

Known production constraints to design around when the time comes, measured rather than assumed:
`seedance_2_0` returned **1280×720 at 6s per clip**, not the 4K/60fps the brief specifies, and
device geometry drifts between clips — the same laptop will not match across three acts without
either a different tool, a real shoot, or per-shot compositing. Budget at time of writing: **322
Higgsfield credits**, roughly 50 per 6-second clip.

---

## 5. Preconditions for production

In order. Nothing below the first unmet line can start.

1. **Legal placeholders filled** — `apps/website/src/content/legal.ts`, five fields. *(Jay)*
2. **Site deployed to joinagora.eu.** *(Jay)*
3. **Anthropic use-case form resubmitted and approved** — `infrastructure/bedrock-use-case.json`. *(Jay)*
4. **Bedrock verified working** — a real `generateCV` call returning a real document.
5. **Demo flow polished and defect-free** — see §6; anything a camera would catch has to be gone
   before the first take, because the screen content in Act 1 is the real product, not a mockup.
6. **A seeded demo account** — profile, saved roles, applications in several states, documents.
   Does not exist today and cannot be produced without either Bedrock or a new direct-write
   fixture; see §6.
7. **MCP/CLI built** *(Act 2)* and **WhatsApp built** *(Act 3)* — or those acts get rewritten
   around features that do exist.

Only after 1–7 does the shoot itself make sense.

---

## 6. Recordability audit — 2026-08-07

Every finding below is cited to source. Corrects an earlier assumption: the swipe deck does
**not** die without Bedrock.

### Recordable today (real DB content, no AI)

`/jobs` search and filters · `/saved` · `/tracker` with its status state machine · `/settings` ·
`/pricing` (fully static) · `/resumes` and the standalone résumé builder with autosave and
print-to-PDF · and the **swipe deck mechanics** on `/dashboard`.

The deck survives because the Haiku rerank is the last of four ranking stages and is wrapped in
a try/catch that returns `null` (`apps/web/src/server/routers/deck.ts:178-181`), falling back to
the pgvector + pg_trgm combined score. Role questions degrade the same way — four hardcoded
questions replace the generated ones (`applications.ts:93-100`). Right-swiping genuinely creates
an `applications` row.

### Dead without Bedrock

Everything downstream of `applications.create`. The `generate_documents` worker calls
`generateCV`/`generateCoverLetter` (`apps/workers/src/jobs/generate-documents.ts:109-115`), which
throw; the row goes to `generationStatus: "failed"` and `/applications/[id]/review` renders
"Generation failed" (`review/page.tsx:66-81`). `evalScoreOverall` is 100% Haiku-derived — there
is no non-Bedrock path to a real document score, so it stays `null` and the column is simply
omitted.

### The brief conflicts with the shipped product in two places

- **"ATS score: 87% Match" does not exist.** The product shows a decimal out of 10 — the badge is
  literally titled "Match score out of 10" (`apps/web/src/components/JobCard.tsx:31-35`,
  `apps/web/src/lib/ui.ts:113-115`). There is no percentage anywhere in the UI.
- **"uploads or pastes their CV" — there is no paste.** Onboarding accepts PDF upload only
  (`apps/web/src/app/onboarding/OnboardingWizard.tsx:255-268`).

### Defects a camera would catch

1. **Fabricated job postings attributed to real companies.** `apps/workers/src/seed-jobs.ts`
   inserts 10 invented Werkstudent/Minijob roles under Zalando, Delivery Hero, SumUp, Personio,
   N26, HelloFresh, Contentful, Tier, Babbel and Flixbus, with **invented URLs** like
   `https://jobs.zalando.com/werkstudent-swe` (`:12-173`). The script's own comment says "never
   let this touch prod" and it refuses to run under `NODE_ENV=production` without `--force`
   (`:180-185`). It is the obvious way to fill a demo database — and putting it on camera would
   show real employers' names against listings that do not exist. All ten are also tech/office
   roles, which contradicts the all-professions positioning.
2. **Onboarding silently swallows CV-extraction failure.** The wizard routes to `/dashboard`
   regardless of whether extraction succeeded (`OnboardingWizard.tsx:114-116`). With Bedrock
   down the worker dies and `skills` / `experienceSummary` / `profileEmbedding` stay null
   forever, with nothing on screen saying so — a recording would show a smooth onboarding that
   is a lie about what data landed.
3. **Indefinite "Drafting your application…" spinner.** If the worker never picks the job up at
   all, the review screen polls every 2.5s with no timeout and no failure state
   (`review/page.tsx:83-96`).
4. **The match badge disappears at zero.** `formatMatchScore` returns `null` when the score is
   `<= 0` (`apps/web/src/lib/ui.ts:113-115`), so with no seeded profile the deck cards render
   with an empty corner where the score should be.

No rendered TODOs, lorem text or console errors on load — that worry was unfounded.

### Seeding and access

There is a working jobs seeder (`apps/workers/src/seed-jobs.ts`, subject to the caveat above).
There is **no** seeder for a user profile: `skills` and `profileEmbedding` are populated only by
the Bedrock-dependent `extract-profile` worker, so without either Bedrock or a new direct-write
fixture, the deck's match score is 0 and the badge vanishes. Auth has no bypass — every screen is
behind `auth.protect()` (`apps/web/src/middleware.ts:8-22`) and a recording session needs a real
Clerk sign-in. User rows are provisioned JIT (`apps/web/src/server/trpc.ts:23-34`), so the Clerk
webhook does not need wiring for local work.

### RLS landmine — confirmed, and inert for now

`packages/db/drizzle/0007_rls_tighten_stage2.sql` exists and **is registered as migration 7 in
`meta/_journal.json`**, so a plain `db:migrate` applies it in sequence; the only guard is a
comment telling a human not to. `withUserContext` (`packages/db/src/rls.ts:85-95`) has **zero
call sites in any router** — every router uses the stateless `neon-http` driver.

It does not bite today only because Postgres exempts a table owner from its own RLS unless
`FORCE ROW LEVEL SECURITY` is set, and 0007 does not set it. The trap springs the moment someone
completes the Stage-1 credential switch to the `agora_web` role and then runs `db:migrate`:
every user-scoped query returns empty. `docs/Security/RLS-ROLLOUT.md:35` says it plainly —
"Total if applied early. Every screen goes empty."
