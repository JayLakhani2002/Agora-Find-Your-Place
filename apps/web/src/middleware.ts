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

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)", // required by Clerk — do not omit
  ],
}
