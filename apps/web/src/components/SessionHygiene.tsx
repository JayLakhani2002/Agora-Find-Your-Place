"use client"

import { purgeStaleDataCaches } from "@/lib/client-storage"
import { useEffect } from "react"

/**
 * Mounted once in the root layout. Reclaims user data that a previously-installed
 * service worker wrote into Cache Storage before the runtimeCaching fix in
 * next.config.js — an installed PWA can keep running the old SW for a long time, so the
 * fix alone does not clean up what is already there.
 *
 * Renders nothing and never blocks paint. Idempotent: once the caches are gone the
 * deletes are no-ops.
 */
export function SessionHygiene() {
  useEffect(() => {
    void purgeStaleDataCaches()
  }, [])
  return null
}
