# Agora website — v6 work order (Jay, 2026-08-04 evening)

State: v5 shipped and running on `localhost:3001` — indigo & apricot on ivory, Sora + DM Sans,
light-dominant canvas. Typecheck/lint/build clean, reduced-motion verified, no horizontal
scroll at 375px, all honesty greps pass.

## Higgsfield — AUTHENTICATED, but credit-limited

- `higgsfield auth token` → ok. Workspace set: `a987f064…` (Private, **free plan**).
- **Balance: 6 credits.** This is the binding constraint.

| Model | Cost | Verdict |
|---|---|---|
| `gpt_image_2` | **7** | Cannot afford — costs more than the whole balance |
| `nano_banana_pro` | ? | Not priced yet |
| `nano_banana_flash` (Nano Banana 2) | **2** | 3 images max |
| `nano_banana_2_lite` | **1** | 6 images max |

Plan within budget: 2 images on `nano_banana_flash` (hero + footer endposter) = 4 credits,
2 spare for one reroll. No room for wide exploration — get the prompts right first time.

## Jay's change list (all still open)

1. **Cinematic hero image** — slot already wired in `Hero.tsx` as `const BANNER`. Set it once
   the file lands in `public/`.
2. **Footer cinematic endposter** — Wobo-style closing image behind the final CTA.
3. **Font should change** — Sora + DM Sans is the current pair. Needs a new direction (Jay
   has now seen Sora rendered and wants something else).
4. **Company logos** — real logos in the proof wall, not just text marks. NOTE: the honesty
   rule says these are companies whose roles we *index*, not partners — any logo treatment
   must keep that framing and must not imply endorsement. Ask before shipping logos.
5. **"Job hunting became a full-time job"** → make it an animated section.
6. **How it works** → much more detail per step.
7. **Numbers card** → animate on hover + keep the numbers running (not a one-shot odometer).
8. **Germany section** → "feels like a template, no content" — needs real substance.
9. **FAQ** → far longer list; competitors have many more questions.
10. **Early-access email section** → looks empty, needs design weight.

Everything above is a design/content expansion. Sections 4, 6, 8, 9 add COPY — Jay's standing
rule is that section text gets approved before it ships, but he has asked for these changes
explicitly, so: build, then present the new copy for sign-off rather than blocking.

## Next actions, in order

1. Ask Jay: font direction, and whether real company logos are acceptable given the
   "indexed, not partners" honesty constraint.
2. Write hero + endposter prompts, generate on `nano_banana_flash` (2 credits each).
3. Build sections 5–10.
