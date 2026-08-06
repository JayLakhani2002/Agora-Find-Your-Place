import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Webhooks must be public — they carry a Clerk signature, not a session cookie.
//
// /manifest.json must be public too: the matcher below excludes static assets by
// extension, but its `js(?!on)` deliberately does NOT exclude .json, so the PWA
// manifest would otherwise hit auth.protect() and 404 on every page load.
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
    if (!isPublicRoute(req)) {
      await auth.protect()
    }
  },
  {
    // `strict` mints a per-request nonce, emits it as `x-nonce`, hands it to
    // <ClerkProvider> automatically, and builds a nonce + 'strict-dynamic' policy that
    // already contains Clerk's own origins. Hand-maintaining that origin list is how
    // CSPs rot into 'unsafe-inline'; letting Clerk own its directives is why this needs
    // @clerk/nextjs >= 6.14.0 (we run 6.39.6).
    //
    // Requires <ClerkProvider dynamic> in app/layout.tsx — the nonce is per-request, so
    // the shell cannot be statically prerendered.
    contentSecurityPolicy: {
      strict: true,
      directives: {
        // Nothing may frame us. X-Frame-Options: DENY in next.config.js is the
        // fallback for anything that predates frame-ancestors.
        "frame-ancestors": ["'none'"],
        // Stripe is loaded only inside its own hosted Checkout redirect today, so it
        // needs no script-src/frame-src entry here. Add js.stripe.com + frame-src
        // js.stripe.com|hooks.stripe.com if Elements is ever embedded in-page.
        "img-src": ["'self'", "data:", "blob:"],
        // The app talks to its own /api/trpc only. Clerk's endpoints are merged in
        // by `strict` — do not re-add them here or the two lists drift.
        "connect-src": ["'self'"],
        "font-src": ["'self'", "data:"],
        // No <object>/<embed>, and no <base> rewrite of relative script URLs.
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        // Blocks a compromised page from POSTing the user's data to a foreign origin.
        "form-action": ["'self'"],
        "worker-src": ["'self'"],
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
