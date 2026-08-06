/**
 * Cache Storage hygiene for the PWA.
 *
 * Cache Storage is scoped to the *origin*, not to the session. Anything the service
 * worker stored stays readable after sign-out and is readable by whoever uses the device
 * next. Until the runtimeCaching fix in next.config.js, the SW cached every
 * authenticated GET under /api/ (tRPC queries, and /api/download/document — the
 * generated CVs and cover letters) for 24h, plus the RSC payloads of authenticated
 * screens.
 *
 * Two jobs live here:
 *   1. `purgeStaleDataCaches()` — self-healing cleanup for installs that already have a
 *      poisoned cache from the old service worker. The new SW never writes these names
 *      again, so after the first run this is a no-op.
 *   2. `purgeAllCaches()`      — full wipe, called on sign-out.
 */

/**
 * Cache names the *old* service worker used for session-varying responses.
 * Keep this list even after the SW fix ships: an installed PWA can run a stale
 * service worker for a long time, and these entries would otherwise never be reclaimed.
 */
const STALE_DATA_CACHES = [
  "apis",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "next-data",
  "cross-origin",
  "static-data-assets",
]

function cacheStorage(): CacheStorage | null {
  if (typeof window === "undefined") return null
  // Cache Storage is absent on non-secure origins and in some private-browsing modes.
  return "caches" in window ? window.caches : null
}

/** Best-effort: a failure here must never block sign-out or page render. */
async function deleteCaches(names: string[]): Promise<void> {
  const caches = cacheStorage()
  if (!caches) return
  await Promise.allSettled(names.map((name) => caches.delete(name)))
}

export async function purgeStaleDataCaches(): Promise<void> {
  await deleteCaches(STALE_DATA_CACHES)
}

export async function purgeAllCaches(): Promise<void> {
  const caches = cacheStorage()
  if (!caches) return
  try {
    // Everything, including static assets — a sign-out should leave nothing behind.
    // The next load re-fetches them; that is the correct trade for a shared device.
    await deleteCaches(await caches.keys())
  } catch {
    // Enumeration itself can throw when storage is disabled. Fall back to the names we
    // know carry user data, so sign-out still removes the part that actually matters.
    await purgeStaleDataCaches()
  }
}
