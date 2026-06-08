# Agora Jobs — Website Development Plan

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | SEO, performance, file-based routing per screen |
| **Language** | TypeScript | Type safety, scales well as codebase grows |
| **Styling** | Tailwind CSS v4 | Utility-first, fast design iteration |
| **Animation** | Framer Motion | Apple spring physics, layout animations, gestures |
| **Smooth Scroll** | Lenis | Silky iOS-like scroll inertia |
| **Components** | shadcn/ui | Headless, accessible, fully owned code |
| **Fonts** | Inter + Geist | Apple SF Pro feel, free |
| **Icons** | Lucide React | Clean, minimal icon set |
| **Hosting** | Vercel | Zero-config Next.js, branch preview URLs |
| **Analytics** | Vercel Analytics | Lightweight, privacy-first |

> No backend at launch. Static/client-side only — fast, cheap, deployable in minutes.

---

## Project Setup (Run Once)

```bash
npx create-next-app@latest agora-jobs --typescript --tailwind --app --src-dir
cd agora-jobs
npm install framer-motion @studio-freight/lenis lucide-react
npx shadcn@latest init
git init
git add .
git commit -m "init: next.js 15 + tailwind + framer motion + shadcn"
git remote add origin <your-repo-url>
git push -u origin main
```

---

## Git Workflow (Per Screen)

Every screen = its own branch → build → push → preview URL → merge to main.

```bash
# Start a new screen
git checkout main && git pull
git checkout -b feat/screen-1-hero

# When done
git add .
git commit -m "feat: screen 1 - hero section with animated headline"
git push origin feat/screen-1-hero
# Vercel auto-generates a preview URL for this branch
# Review it → merge to main → next screen
```

---

## Screen-by-Screen Flow

### Screen 1 — Hero / Above the Fold
**Branch:** `feat/screen-1-hero`

**Goal:** Instant clarity on what Agora Jobs is + strong emotional pull.

**Elements:**
- Animated headline — words entrance one by one (stagger)
- Subheadline fades in 400ms after
- Two CTAs: primary (Get Started) + secondary (See How It Works)
- Background: slow-moving gradient orbs (not distracting)
- Navbar: transparent → frosted glass on scroll (backdrop-blur)
- Mobile: stacked layout, same motion

**Framer Motion:** `staggerChildren`, `fadeInUp` variants, spring transition on CTA hover

---

### Screen 2 — Problem Statement
**Branch:** `feat/screen-2-problem`

**Goal:** Make the job seeker feel seen. Validate their pain.

**Elements:**
- Bold headline: "Job searching is broken."
- 3–4 pain points reveal as you scroll past them (scroll-triggered stagger)
- Each pain point: icon + one-liner text
- Subtle red/orange color temperature (tension), then transitions to brand color

**Framer Motion:** `useInView`, `whileInView` entrance per pain point

---

### Screen 3 — How It Works
**Branch:** `feat/screen-3-how-it-works`

**Goal:** Show the process is simple — 3 steps max.

**Elements:**
- Section title fades in
- 3 steps: horizontal on desktop, vertical on mobile
- Active step highlights as scroll passes it (scroll-linked progress indicator)
- Each step: number badge + icon + title + 1-sentence description
- Connecting line between steps animates progressively

**Framer Motion:** `useScroll` + `useTransform` for scroll-linked progress

---

### Screen 4 — Features / Product Highlights
**Branch:** `feat/screen-4-features`

**Goal:** Show what makes Agora Jobs different from other platforms.

**Elements:**
- Bento grid layout (Apple-style asymmetric cards)
- Large card: hero feature with animated illustration
- Small cards: supporting features
- Cards lift on hover (scale 1.02 + shadow deepens)
- Each card has a subtle micro-animation inside on hover

**Framer Motion:** `whileHover` scale + shadow, `whileInView` entrance from below

---

### Screen 5 — For Job Seekers
**Branch:** `feat/screen-5-job-seekers`

**Goal:** Speak directly to the candidate.

**Elements:**
- Split screen: left = copy + CTA, right = animated app mockup/screenshot
- Bullet list of benefits with checkmark animations
- Left enters from left, right enters from right on scroll

**Framer Motion:** `initial: { x: -60 }` left side, `initial: { x: 60 }` right side

---

### Screen 6 — Social Proof / Stats
**Branch:** `feat/screen-6-social-proof`

**Goal:** Build trust with numbers and real voices.

**Elements:**
- 3–4 animated number counters (jobs posted, users, companies)
- Numbers count up when they enter the viewport
- Testimonial carousel below — spring transition between slides
- Company logos (if available) in a horizontal scroll strip

**Framer Motion:** custom `useCountUp` hook + `AnimatePresence` for testimonials

---

### Screen 7 — Pricing (if applicable)
**Branch:** `feat/screen-7-pricing`

**Goal:** Remove friction from the upgrade decision.

**Elements:**
- Monthly / Annual toggle with layout animation (pill slides)
- 2–3 pricing cards
- Highlighted/recommended plan scales up slightly
- Feature checklist per plan with stagger animation

**Framer Motion:** `layout` prop on toggle pill, `layoutId` for smooth transitions

---

### Screen 8 — CTA / Waitlist / Sign Up
**Branch:** `feat/screen-8-cta`

**Goal:** Convert. One action only.

**Elements:**
- Full-width section, high contrast background
- Single email input + button
- Button: idle → loading spinner → success checkmark (state machine animation)
- Micro-copy below: "No spam. Unsubscribe anytime."

**Framer Motion:** `AnimatePresence` for button state transitions

---

### Screen 9 — Footer
**Branch:** `feat/screen-9-footer`

**Goal:** Utility + brand closing impression.

**Elements:**
- Logo + tagline
- Link columns: Product, Company, Legal
- Social icons with hover spring
- Copyright line
- Optional: subtle gradient top border matching hero colors

---

## Motion Design Principles (Apple-Inspired)

| Principle | Implementation |
|---|---|
| Spring physics, not linear | `type: "spring", stiffness: 300, damping: 30` |
| Stagger entrance on lists | `staggerChildren: 0.08` |
| Hover = slight scale, not color swap | `whileHover: { scale: 1.02 }` |
| Scroll-triggered, not auto-play | `whileInView`, `once: true` |
| Exit animations are fast | `exit: { opacity: 0, duration: 0.15 }` |
| Layout animations feel native | `layout` prop on reordering elements |
| Smooth scroll inertia | Lenis with `lerp: 0.1` |

---

## Skills to Use Per Phase

| Phase | Skill | When |
|---|---|---|
| Before building each screen | `/ui-ux-pro-max` | Layout and interaction decisions |
| After building each screen | `/taste-skill` | Gut-check if it looks polished |
| Motion tuning | `/design-motion-principles` | Get spring values and timing right |
| Copy for each section | `/copywriting` | Headlines, CTAs, benefit bullets |
| Visuals / hero art | `/image` | Generate hero visuals, icons, mockups |
| After all screens done | `/ai-seo` | Meta tags, OG images, schema markup |
| Pre-launch | `/verification-before-completion` | QA pass before going live |

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout, fonts, Lenis provider
│   ├── page.tsx            # Assembles all screen components
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx      # Screen 9
│   └── sections/
│       ├── Hero.tsx        # Screen 1
│       ├── Problem.tsx     # Screen 2
│       ├── HowItWorks.tsx  # Screen 3
│       ├── Features.tsx    # Screen 4
│       ├── ForSeekers.tsx  # Screen 5
│       ├── SocialProof.tsx # Screen 6
│       ├── Pricing.tsx     # Screen 7
│       └── CTA.tsx         # Screen 8
├── lib/
│   └── motion.ts           # Shared Framer Motion variants
└── hooks/
    └── useCountUp.ts       # Animated number counter
```

---

## Shared Motion Variants (lib/motion.ts)

```typescript
export const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  }
}

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 }
  }
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } }
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 }
  }
}
```

---

## Launch Checklist

- [ ] All 9 screens complete and merged to main
- [ ] Mobile responsive tested on 375px, 390px, 430px
- [ ] Lighthouse score > 90 on Performance, SEO, Accessibility
- [ ] OG image set (1200x630) for social sharing
- [ ] Favicon and apple-touch-icon set
- [ ] Custom domain connected in Vercel
- [ ] Analytics enabled
- [ ] `/ai-seo` pass done
- [ ] `/verification-before-completion` pass done
