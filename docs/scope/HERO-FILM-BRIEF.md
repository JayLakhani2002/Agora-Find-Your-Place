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
5. **Demo flow polished and defect-free** — see the recordability audit; anything a camera would
   catch has to be gone before the first take, because the screen content in Act 1 is the real
   product, not a mockup.
6. **A seeded demo account** — profile, saved roles, applications in several states, documents.
7. **MCP/CLI built** *(Act 2)* and **WhatsApp built** *(Act 3)* — or those acts get rewritten
   around features that do exist.

Only after 1–7 does the shoot itself make sense.
