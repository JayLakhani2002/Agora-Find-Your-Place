/**
 * Scheme guard for job URLs before they reach `href` or `window.open`.
 *
 * `sourceUrl` and `employerUrl` originate from scraped third-party listings. The ingest
 * normaliser (`apps/workers/src/scrapers/normalizer.ts:85`) does enforce `^https?://`, so
 * nothing dangerous is in the database today — but that is one code path, and
 * `seed-jobs.ts` writes rows without going through it. A `javascript:` or `data:` URL
 * reaching an anchor is a stored-XSS-equivalent that survives the CSP, because the
 * navigation is the user's own click.
 *
 * The guard belongs here, at the render boundary, rather than only at ingest: every row
 * that reaches a link passes through this function regardless of how it got into the table.
 */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    // Relative or malformed. A job link is always absolute; anything else is wrong.
    return null
  }
  // Allow-list, not a block-list: `javascript:`, `data:`, `vbscript:`, `blob:` and every
  // scheme invented after this was written are all rejected by default.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
  return parsed.toString()
}
