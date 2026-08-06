/**
 * SECURITY NOTE — read before changing the PWA block.
 *
 * `@ducanh2912/next-pwa` ships a default `runtimeCaching` list whose "apis" rule is:
 *
 *   urlPattern: ({ sameOrigin, url: { pathname } }) =>
 *     sameOrigin && !pathname.startsWith("/api/auth/callback") && pathname.startsWith("/api/")
 *   handler: "NetworkFirst", method: "GET", maxAgeSeconds: 86400
 *
 * i.e. every authenticated same-origin GET under /api/ — all tRPC queries and
 * /api/download/document (generated CVs and cover letters) — was written to Cache
 * Storage for 24 hours. Cache Storage is origin-scoped, not session-scoped, so on a
 * shared device it survived sign-out and let the next person read the previous user's
 * data. The "pages"/"pages-rsc"/"pages-rsc-prefetch" rules did the same for the RSC
 * payloads of dynamic authenticated screens.
 *
 * `resolveRuntimeCaching` drops a default rule when a user rule declares the same
 * `options.cacheName`, so declaring these five names with `NetworkOnly` removes the
 * defaults entirely. Static-asset caching (JS/CSS/fonts/images/_next/static) is
 * untouched — that is the actual PWA win and it carries no user data.
 *
 * Rule: nothing that varies by session may enter the service worker cache.
 */
const NO_CACHE_AUTHENTICATED = [
  {
    // Replaces the default "apis" rule.
    urlPattern: ({ url: { pathname }, sameOrigin }) => sameOrigin && pathname.startsWith("/api/"),
    handler: "NetworkOnly",
    method: "GET",
    options: { cacheName: "apis" },
  },
  {
    // RSC prefetch payloads of authenticated screens.
    urlPattern: ({ request, sameOrigin }) =>
      sameOrigin &&
      request.headers.get("RSC") === "1" &&
      request.headers.get("Next-Router-Prefetch") === "1",
    handler: "NetworkOnly",
    options: { cacheName: "pages-rsc-prefetch" },
  },
  {
    urlPattern: ({ request, sameOrigin }) => sameOrigin && request.headers.get("RSC") === "1",
    handler: "NetworkOnly",
    options: { cacheName: "pages-rsc" },
  },
  {
    // Document navigations. Every screen behind sign-in renders user data.
    urlPattern: ({ sameOrigin }) => sameOrigin,
    handler: "NetworkOnly",
    options: { cacheName: "pages" },
  },
  {
    // Cross-origin GETs are Clerk/Stripe session traffic — never cache those either.
    urlPattern: ({ sameOrigin }) => !sameOrigin,
    handler: "NetworkOnly",
    options: { cacheName: "cross-origin" },
  },
]

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  extendDefaultRuntimeCaching: true,
  workboxOptions: { runtimeCaching: NO_CACHE_AUTHENTICATED },
})

/**
 * Headers that are not CSP. The Content-Security-Policy itself is emitted by
 * `clerkMiddleware({ contentSecurityPolicy: { strict: true } })` in src/middleware.ts,
 * which mints a per-request nonce — a static CSP here would have to allow
 * 'unsafe-inline' for Next's bootstrap scripts, which is close to decorative.
 */
const SECURITY_HEADERS = [
  // 2 years + preload. Vercel terminates TLS; this closes the first-request downgrade.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Belt to CSP's frame-ancestors: "Approve" and "I submitted it" are one-click state
  // changes, so a framed clickjack is a real path to an application the user never sent.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Never leak an application id or storage key in a Referer to a third-party site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@agora/ui", "@agora/db", "@agora/ai", "@agora/legal"],
  // Version/stack fingerprint — free recon for an attacker, no value to us.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        // Defence in depth behind the service-worker fix above: even if some other
        // cache (browser HTTP cache, a CDN, a corporate proxy) sees these responses
        // they must not store them. Every /api/ response is user-scoped.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "Pragma", value: "no-cache" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
