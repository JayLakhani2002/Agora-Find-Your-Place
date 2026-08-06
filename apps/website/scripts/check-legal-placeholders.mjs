#!/usr/bin/env node
/**
 * Refuses to let the site go public with unfilled legal identity fields.
 *
 * The Impressum is mandatory under § 5 DDG, and the privacy notice is the page an
 * AWS/Anthropic use-case reviewer opens first. Publishing either with `[[FULL LEGAL NAME]]`
 * still in it is worse than publishing nothing: it reads as abandoned, and it is an
 * abmahnung risk on a German-facing site.
 *
 * Deliberately does NOT run on every build — that would block local development while the
 * details are still outstanding. It runs when a deploy is actually happening, which is the
 * moment the placeholders start doing damage.
 *
 *   pnpm --filter @agora/website check:legal   # run it manually any time
 *
 * Exit 1 on placeholders found, 0 on clean.
 */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const target = join(here, "..", "src", "content", "legal.ts")

const src = readFileSync(target, "utf8")
// Placeholder tokens are ALL CAPS and single-line by convention. Anchoring on that keeps the
// file's own doc comment (which writes `[[…]]` when describing the convention) from matching
// itself and reporting a permanent false failure.
const found = [...src.matchAll(/\[\[([A-Z][A-Z \-_]*[A-Z])\]\]/g)].map((m) => m[1])

if (found.length === 0) {
  console.log("✅ legal.ts: no placeholders — safe to publish")
  process.exit(0)
}

const unique = [...new Set(found)]
console.error(`\n❌ ${unique.length} unfilled legal field(s) in src/content/legal.ts:\n`)
for (const f of unique) console.error(`   [[${f}]]`)
console.error(
  "\nThese appear on /impressum and /datenschutz, both of which are public and both of which\n" +
    "a Bedrock use-case reviewer will read. Fill them in OPERATOR at the top of legal.ts.\n" +
    "§ 5 DDG requires name, address and a contact route for a German-facing site.\n",
)
process.exit(1)
