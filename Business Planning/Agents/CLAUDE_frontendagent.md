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

## UI/UX Design System — Mandatory (ui-ux-pro-max skill)

Before writing any component, screen, or CSS, you MUST run the design system skill.
The persisted design system for this project lives at `design-system/agora-jobs/MASTER.md`.
Page-specific overrides live at `design-system/agora-jobs/pages/<page>.md` — check those first.

### Step 1 — Load the design system (run once per session)
```bash
cat "design-system/agora-jobs/MASTER.md"
```

### Step 2 — Generate a page-specific override before building any new screen
```bash
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<screen keywords>" --design-system --persist -p "Agora Jobs" --page "<page-name>"
```
Examples:
```bash
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "job swipe card deck mobile tinder" --design-system --persist -p "Agora Jobs" --page "swipe-deck"
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "application tracker status badges list" --design-system --persist -p "Agora Jobs" --page "tracker"
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "review cv cover letter score tabs" --design-system --persist -p "Agora Jobs" --page "review"
```

### Step 3 — Query UX rules before adding any animation, form, or interactive element
```bash
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain ux
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack shadcn
```

### Agora Jobs Design Tokens (from generated design system)
| Token | Value | Usage |
|---|---|---|
| Primary | `#0369A1` | Nav, active states, links |
| Secondary | `#0EA5E9` | Highlights, badges |
| CTA | `#22C55E` | Apply button, success states |
| Background | `#F0F9FF` | Page backgrounds |
| Text | `#0C4A6E` | Body text |
| Style | Glassmorphism | `backdrop-blur-md bg-white/80 border border-white/20` |
| Font | IBM Plex Sans | Import from Google Fonts |
| Blur | `backdrop-blur(10-20px)` | Cards, modals, nav |

### Hard UI rules
- IBM Plex Sans must be loaded — add to `globals.css` via Google Fonts import
- Glassmorphism cards: `backdrop-blur-md bg-white/80 border border-white/20 shadow-lg`
- ALL clickable elements: `cursor-pointer`
- Transitions: `transition-colors duration-200` (150–300ms max)
- No emojis as icons — Lucide SVG only
- Framer Motion swipe: respect `prefers-reduced-motion`
- Mobile-first: 375px → 768px → 1024px → 1440px
- Touch targets: minimum 44×44px
- Text contrast: 4.5:1 minimum (use `#0C4A6E` not lighter grays on white)

### Pre-delivery checklist (run before every commit)
- [ ] Design system loaded and tokens applied
- [ ] No emojis as icons
- [ ] `cursor-pointer` on all interactive elements
- [ ] Hover states: smooth 150–300ms transitions
- [ ] Light mode contrast ≥ 4.5:1
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected in Framer Motion
- [ ] Responsive tested at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile

## Safety Rules — Mandatory (learned from Agent 1 code review)

These rules apply to every agent. Violating them caused real bugs in Agent 1 that only appeared at runtime.

### 1. Never initialise clients at module scope
Never construct DB, Redis, S3, AI, or any external-service client at the top level of a file.
Always use a factory function or lazy singleton called at use-time.

```ts
// BAD — crashes the whole process at import if env var is missing
const redis = new Redis(process.env.REDIS_URL!)

// GOOD — fails only when actually called, with a clear error
function getRedis() {
  const url = process.env.REDIS_URL
  if (!url) throw new Error("REDIS_URL is not set")
  return new Redis(url, { maxRetriesPerRequest: null })
}
```

### 2. Never use ! to assert env vars exist
Always validate required env vars explicitly with a readable error message.

```ts
// BAD
const url = process.env.DATABASE_URL!

// GOOD
const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not set")
```

### 3. Wire framework middleware before writing code that depends on it
If your code calls `auth()`, `currentUser()`, or any context injected by middleware,
confirm that middleware is already registered in `apps/web/src/middleware.ts`.
Agent 1 added Clerk middleware — do not remove or bypass it.

### 4. Always add SIGTERM/SIGINT handlers if you register workers or hold open connections
Any agent that adds a BullMQ Worker or opens a persistent connection must register:
```ts
process.on("SIGTERM", async () => { await worker.close(); await connection.quit(); process.exit(0) })
process.on("SIGINT",  async () => { await worker.close(); await connection.quit(); process.exit(0) })
```

### 5. Be explicit about paths and working directories in deployment config
Never assume a relative path is correct. If you add a Railway/Vercel config, always set
`rootDirectory` explicitly and verify `startCommand` is relative to that directory.

