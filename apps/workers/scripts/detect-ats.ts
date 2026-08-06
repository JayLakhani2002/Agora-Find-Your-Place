import "../src/env"
import { readFileSync } from "node:fs"
import { ATS_ADAPTERS, type AtsHit, type AtsKind, detectAts } from "../src/scrapers/ats"

/**
 * Career-page → ATS detector. Feed it company domains, get rows for ats-companies.ts.
 *
 *   tsx scripts/detect-ats.ts zalando.de sumup.com n26.com
 *   tsx scripts/detect-ats.ts --file domains.txt      # one domain per line
 *
 * Two passes, because most career pages render their ATS embed in JavaScript and an
 * HTML regex never sees it:
 *   1. sniff  — find an ATS URL in the career-page HTML. Self-proving: the link is on
 *               the company's own site, so the board is definitely theirs.
 *   2. probe  — guess the board token from the domain and ask each ATS directly. Much
 *               higher hit rate, but a token is just a name: "mitte" on Greenhouse could
 *               belong to a different Mitte. Probe hits print a sample posting so the
 *               company can be confirmed by eye before being pasted into the registry.
 */

const CAREER_PATHS = [
  "/careers",
  "/jobs",
  "/karriere",
  "/career",
  "/en/careers",
  "/de/karriere",
  "",
]
const UA = "AgoraJobsBot/1.0 (+https://agorajobs.eu/bot)"

// Cheapest and most common first — each is one request (SmartRecruiters adds detail fetches).
const PROBE_ORDER: AtsKind[] = ["greenhouse", "ashby", "lever", "personio", "recruitee"]

async function html(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    })
    return res.ok ? await res.text() : null
  } catch {
    return null
  }
}

/** Career links that live on another host (careers.acme.com, acme.jobs) — very common. */
function offsiteCareerLinks(page: string, domain: string): string[] {
  const links = [...page.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)]
    .map((m) => m[1] as string)
    .filter((u) => /career|jobs|karriere|stellen/i.test(u) && !u.includes(`//${domain}`))
  return [...new Set(links)].slice(0, 3)
}

async function sniff(domain: string): Promise<AtsHit | null> {
  let homepage: string | null = null

  for (const path of CAREER_PATHS) {
    const page = await html(`https://${domain}${path}`)
    if (!page) continue
    if (path === "") homepage = page
    const hit = detectAts(page)
    if (hit) return hit
  }

  homepage ??= await html(`https://${domain}`)
  if (!homepage) return null
  for (const link of offsiteCareerLinks(homepage, domain)) {
    // The link itself often IS the ATS URL (jobs.lever.co/acme), so match it first.
    const hit = detectAts(link) ?? detectAts((await html(link)) ?? "")
    if (hit) return hit
  }
  return null
}

/** acme-gmbh.de → ["acme-gmbh", "acmegmbh"] — the two shapes boards actually use. */
function candidateTokens(domain: string): string[] {
  const base = domain.replace(/\.[a-z.]+$/, "").replace(/^www\./, "")
  return [...new Set([base, base.replace(/-/g, "")])]
}

async function main() {
  const argv = process.argv.slice(2)
  const fileIdx = argv.indexOf("--file")
  const domains = (
    fileIdx >= 0
      ? readFileSync(argv[fileIdx + 1] as string, "utf-8")
          .split("\n")
          .map((l) => l.trim())
      : argv
  )
    .filter((d) => d && !d.startsWith("--"))
    .map((d) => d.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))

  if (domains.length === 0) {
    console.error("usage: tsx scripts/detect-ats.ts <domain…> | --file <domains.txt>")
    process.exit(1)
  }

  const confirmed: string[] = []
  const guessed: string[] = []
  const unsupported: string[] = []
  const misses: string[] = []

  for (const domain of domains) {
    const name = domain.replace(/\.[a-z.]+$/, "")
    const row = (kind: AtsKind, token: string) =>
      `  { company: "${name}", ats: "${kind}", token: "${token}" },`

    const hit = await sniff(domain)

    if (hit && !hit.kind) {
      unsupported.push(`${domain} → ${hit.name} (${hit.token})`)
      console.log(`~ ${domain} — ${hit.name}, no adapter yet`)
      continue
    }

    // A sniffed token is trusted; verify the feed answers before recommending it.
    if (hit?.kind) {
      try {
        // max=3: verification only needs the listing endpoint to answer, not every body.
        const n = (await ATS_ADAPTERS[hit.kind](hit.token, 3)).length
        console.log(`✓ ${domain} — ${hit.kind}/${hit.token} → ${n} postings (from career page)`)
        if (n > 0) {
          confirmed.push(row(hit.kind, hit.token))
          continue
        }
      } catch (err) {
        console.log(`! ${domain} — ${hit.kind}/${hit.token} feed error: ${(err as Error).message}`)
      }
    }

    let found = false
    for (const token of candidateTokens(domain)) {
      for (const kind of PROBE_ORDER) {
        try {
          const postings = await ATS_ADAPTERS[kind](token, 3)
          if (postings.length === 0) continue
          // Posting URLs on the company's own domain prove the board is theirs — no
          // eyeballing needed. Boards that stay on the ATS host stay a guess.
          const proven = postings.some((p) => p.url.includes(domain))
          console.log(
            `${proven ? "✓" : "?"} ${domain} — ${kind}/${token} → e.g. "${postings[0]?.title}" ${postings[0]?.url}`,
          )
          ;(proven ? confirmed : guessed).push(row(kind, token))
          found = true
          break
        } catch {
          // 404 / redirect / wrong shape = not this ATS.
        }
      }
      if (found) break
    }
    if (found) continue

    misses.push(domain)
    console.log(`✗ ${domain} — no known ATS`)
  }

  console.log(`\n── confirmed from career page (${confirmed.length}) — paste as-is ──`)
  console.log(confirmed.join("\n") || "  (none)")
  console.log(
    `\n── token guesses (${guessed.length}) — check the sample posting above is the right company ──`,
  )
  console.log(guessed.join("\n") || "  (none)")
  if (unsupported.length) {
    console.log(
      `\n── detected but no adapter (${unsupported.length}) ──\n${unsupported.join("\n")}`,
    )
  }
  if (misses.length) console.log(`\n── no ATS found (${misses.length}) ──\n${misses.join(", ")}`)
  process.exit(0)
}

main()
