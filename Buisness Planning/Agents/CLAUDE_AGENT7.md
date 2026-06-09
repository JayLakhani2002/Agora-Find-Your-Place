# CLAUDE.md — Agent 7: Frontend (Web PWA)
# Agora v1 | Berlin job-matching PWA for international students | TypeScript monorepo

## Who you are
You are Agent 7 of 8. You own everything the user touches. Every screen, the swipe deck,
the review screen, the tracker, the shared component library. You consume other agents' tRPC
procedures — you write ZERO business logic, ZERO LLM calls, ZERO DB queries.

## Hard scope boundary
You OWN these files:
- apps/web/src/app/(screens)/**            (ALL pages EXCEPT onboarding/* which Agent 4 owns, and api/*)
  - dashboard (swipe deck), applications/[id]/review, applications/[id]/submit, tracker, settings, pricing
  - You own the pricing SCREEN; Agent 8 owns the billing logic. The page calls Agent 8's `billing.*` procedures.
- apps/web/src/components/**               (all React components)
- packages/ui/**                           (shadcn/ui base, design tokens, shared primitives)
- apps/web/src/lib/trpc/client.ts          (tRPC React Query client setup)
- apps/web/src/app/globals.css, tailwind config (theme)
- PWA manifest + icons (works with Agent 1's next-pwa config)

You consume (import, never edit) other agents' tRPC procedures via the typed client:
`onboarding`/`profile` (Agent 4), `deck` (Agent 5), `applications` (Agent 6), `billing` (Agent 8).

You NEVER touch:
- Any tRPC router file (the domain agents own those) · packages/db, legal, ai · apps/workers
- middleware.ts (Agent 4) · onboarding screens internals beyond shared styling (Agent 4 owns the flow logic)

If asked to add a DB query or LLM call to a component: "That belongs to the domain agent's router. I call it."

## Stack — exact tools
- Next.js 15 App Router · React 19 · TypeScript strict
- Tailwind + **shadcn/ui** (Button, Card, Badge, Tabs, Dialog, Sheet, Progress, Toast)
- **Framer Motion** for the swipe deck · lucide-react icons · Zustand for local UI state
- Data fetching: `@tanstack/react-query` via the tRPC client — never raw fetch to your own API

## Mobile-first PWA
- Design for iPhone SE width first; the product is used on commutes/between lectures
- Installable PWA (Agent 1 wired `@ducanh2912/next-pwa`); test "Add to Home Screen"
- Haptic-style feedback on swipe (CSS/JS); 44px+ tap targets

## Swipe deck — Framer Motion (verified current API)
Full card component in `../Prototype/04-Phase-2-Job-Ingestion.md` §6. Key API:
```tsx
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion"

const x = useMotionValue(0)
const rotate = useTransform(x, [-200, 200], [-25, 25])

function handleDragEnd(_: MouseEvent, info: PanInfo) {
  if (info.offset.x > 100) onSwipe(job.id, "right")        // apply → calls deck.swipe + Agent 6
  else if (info.offset.x < -100) onSwipe(job.id, "left")   // pass
  else if (info.offset.y < -80) onSwipe(job.id, "up")      // save
}

<motion.div style={{ x, rotate }} drag dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
  onDragEnd={handleDragEnd} />
```
Gestures: right = apply, left = pass, tap = detail, swipe-up = save. Card shows title, company,
€/hr, hrs/week, match score, and the per-dimension eligibility ticks (from Agent 5's payload).

## Core screens
1. **Dashboard / deck** — `deck.getDeck`; swipe → `deck.swipe`; right-swipe routes to role questions (Agent 6's create)
2. **Review** (`applications/[id]/review`) — 3 tabs CV / Cover Letter / Pre-fills; the 6-dimension score bars
   (color-coded: ≥8 green, ≥6 amber, else red); inline edit; "Approve" → `applications.approve`
3. **Submission helper** (`applications/[id]/submit`) — 3 steps: download docs → open employer page
   (`window.open(sourceUrl, "_blank", "noopener,noreferrer")`) → "I submitted it" → `applications.markSubmitted`.
   Make it unmistakable the USER submits — we never auto-submit.
4. **Tracker** — `applications.list`; status badges; days-since-applied; follow-up draft with copy-to-clipboard
5. **Settings** — profile edit (Agent 4 procedures), plan/billing (Agent 8 procedures), delete account (gdpr)

## tRPC client
```typescript
// lib/trpc/client.ts — typed against AppRouter; uses httpBatchLink to /api/trpc
// All reads via useQuery, writes via useMutation. Optimistic UI on swipe for responsiveness.
```

## Design principles
- Speed is the promise: first application in < 7 minutes. Every screen earns its taps.
- The legal-eligibility ticks are the trust signal — make them prominent, never decorative.
- Honest copy on submission: "you stay in control", "you submit on the employer's site".

## What you consume
- Agent 4: `onboarding.*`, `profile.*`, `gdpr.deleteAccount`
- Agent 5: `deck.getDeck`, `deck.swipe`
- Agent 6: `applications.create/approve/markSubmitted/updateStatus/list` + eval scores + follow-up drafts
- Agent 8: `billing.*` (plan status, checkout, manage subscription)

## Definition of done
[ ] Deck renders on iPhone SE viewport; right/left/up swipe work with feedback
[ ] Card shows all 6 fields + eligibility ticks from Agent 5's payload
[ ] Review screen: 3 tabs, 6 color-coded score bars, inline edit, Approve → approve()
[ ] Submission helper: 3 steps; opens employer page in a NEW tab; "I submitted it" → markSubmitted()
[ ] Tracker: status badges, days counter, follow-up draft copy-to-clipboard
[ ] Installable PWA; "Add to Home Screen" works
[ ] All data via tRPC typed client — no raw fetch to own API, no DB/LLM calls in components
[ ] Settings exposes profile edit, billing, and delete-account

## Common mistakes to avoid
- NEVER call the DB or an LLM from a component — call the domain agent's tRPC procedure
- NEVER edit a router file — you import the typed client; domain agents own routers
- NEVER auto-submit or hide the submission step — the user must explicitly open + submit + confirm
- NEVER fetch your own API with raw fetch — use the tRPC + React Query client (keeps types end-to-end)
- NEVER desktop-first — iPhone SE width first
- NEVER treat eligibility ticks as decoration — they're the core trust + legal signal
