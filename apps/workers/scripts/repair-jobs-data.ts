/**
 * One-off repair of the `jobs` table for defects that were fixed in code AFTER the
 * existing rows were written. The scrapers now produce correct data; these rows predate
 * the fixes and nothing re-processes them, so they stay wrong until this runs.
 *
 *   1. seed rows      — fabricated postings attributed to real companies (Zalando, N26…)
 *                       with invented URLs, live and matchable in the deck.
 *   2. text encoding  — HTML entities (&amp;, &#x26;, &#xfc;) and U+00AD soft hyphens
 *                       stored verbatim in title/company/location/description.
 *   3. classification — re-derives skills, contractType, requiresEnrollment,
 *                       allowedVisaTypes, hourlyRate and hoursPerWeek with the current
 *                       classifier. Fixes the substring-matched skills ("git" from
 *                       "digital", "rust" from "trust", "go" from anything) and the
 *                       werkstudent-by-default contract type that mislabels full-time
 *                       roles as student-eligible — a legal filter, not cosmetics.
 *   4. junk numerics  — hourlyRate 0 and hoursPerWeek 0 are parse failures, not facts.
 *   5. staleness      — flags rows not re-seen in N days (does NOT deactivate here;
 *                       that is the scraper's job, which now runs the sweep itself).
 *
 * Rows whose description changes get jobEmbedding=NULL so the next embed pass re-embeds
 * them against the corrected text.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write.
 *   pnpm --filter @agora/workers tsx scripts/repair-jobs-data.ts
 *   pnpm --filter @agora/workers tsx scripts/repair-jobs-data.ts --apply
 */
import "../src/env"
import { getDb, jobs } from "@agora/db"
import { eq, sql } from "drizzle-orm"
import {
  classifyContractType,
  classifyGermanLevel,
  classifyVisaRequirement,
  extractHourlyRate,
  extractHoursPerWeek,
  extractSkills,
  inferRequiresEnrollment,
  visaRequirementToAllowedTypes,
} from "../src/scrapers/classifier"
import { decodeEntities } from "../src/scrapers/normalizer"

const APPLY = process.argv.includes("--apply")
const STALE_DAYS = 30

/**
 * Sources whose contractType comes from the generic text classifier, and may therefore
 * be re-derived here.
 *
 * arbeitsagentur, arbeitnow and tu_berlin are deliberately EXCLUDED: each overrides
 * record.contractType after normalizeJob with a value read from the source's own
 * structured field (baContractType / anContractType / contractFromKategorie). Guessing
 * from description text would overwrite authoritative data with a weaker signal — in a
 * trial run that alone "corrected" 380 arbeitsagentur rows from teilzeit to vollzeit,
 * all of them wrong.
 */
const TEXT_CLASSIFIED_SOURCES = new Set(["berlin_startup_jobs", "jobicco", "company_ats"])

const sameArray = (a: string[] | null, b: string[] | null) =>
  JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...(b ?? [])].sort())

async function main() {
  const db = getDb()
  console.log(APPLY ? "MODE: APPLY (writing)" : "MODE: DRY RUN (no writes) — pass --apply to write")

  // ── 1. Fabricated seed rows ────────────────────────────────────────────────
  const seed = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.source, "seed"))
  console.log(`\n[1] seed rows (fabricated, real company names): ${seed.length}`)
  if (APPLY && seed.length > 0) {
    // user_job_actions cascade; applications.job_id / resumes.job_id are SET NULL, so a
    // user's history survives the listing being removed.
    await db.delete(jobs).where(eq(jobs.source, "seed"))
    console.log(`    deleted ${seed.length}`)
  }

  // ── 2–4. Re-normalise + re-classify every remaining row ────────────────────
  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      location: jobs.location,
      description: jobs.description,
      contractType: jobs.contractType,
      germanLevelRequired: jobs.germanLevelRequired,
      requiredSkills: jobs.requiredSkills,
      requiresEnrollment: jobs.requiresEnrollment,
      allowedVisaTypes: jobs.allowedVisaTypes,
      hourlyRate: jobs.hourlyRate,
      hoursPerWeek: jobs.hoursPerWeek,
      source: jobs.source,
    })
    .from(jobs)

  const stats = {
    scanned: rows.length,
    textCleaned: 0,
    skillsChanged: 0,
    contractChanged: 0,
    enrollmentChanged: 0,
    visaChanged: 0,
    germanChanged: 0,
    rateNulled: 0,
    hoursNulled: 0,
    reEmbed: 0,
    written: 0,
  }
  const contractMoves: Record<string, number> = {}

  for (const r of rows) {
    if (r.source === "seed") continue

    const title = decodeEntities(r.title).replace(/\s+/g, " ").trim()
    const company = decodeEntities(r.company).replace(/\s+/g, " ").trim()
    const location = decodeEntities(r.location).replace(/\s+/g, " ").trim()
    const description = decodeEntities(r.description).replace(/\s+/g, " ").trim()

    const textCleaned =
      title !== r.title ||
      company !== r.company ||
      location !== r.location ||
      description !== r.description
    if (textCleaned) stats.textCleaned++

    const haystack = `${title} ${description}`
    // Text-derived on every source — safe to recompute everywhere. This is what fixes
    // the substring-matched skills.
    const germanLevelRequired = classifyGermanLevel(haystack)
    const requiredSkills = extractSkills(haystack)
    const allowedVisaTypes = visaRequirementToAllowedTypes(classifyVisaRequirement(haystack))

    // Contract type only where the text classifier is actually the source of truth.
    const contractType = TEXT_CLASSIFIED_SOURCES.has(r.source)
      ? classifyContractType(haystack)
      : r.contractType
    const requiresEnrollment = inferRequiresEnrollment(contractType)

    // Numerics: repair the junk, don't re-parse the good. A stored 0 is a parse failure
    // ("this job pays €0/h" is not a fact any source asserts); a stored 18.50 may well
    // have come from a structured field this script can't see, so it is left alone.
    const hourlyRate = r.hourlyRate === 0 ? null : r.hourlyRate
    const hoursPerWeek = r.hoursPerWeek === 0 ? null : r.hoursPerWeek

    if (!sameArray(r.requiredSkills, requiredSkills)) stats.skillsChanged++
    if (contractType !== r.contractType) {
      stats.contractChanged++
      const key = `${r.contractType} → ${contractType}`
      contractMoves[key] = (contractMoves[key] ?? 0) + 1
    }
    if (requiresEnrollment !== r.requiresEnrollment) stats.enrollmentChanged++
    if (!sameArray(r.allowedVisaTypes, allowedVisaTypes)) stats.visaChanged++
    if (germanLevelRequired !== r.germanLevelRequired) stats.germanChanged++
    if (r.hourlyRate !== null && hourlyRate === null) stats.rateNulled++
    if (r.hoursPerWeek !== null && hoursPerWeek === null) stats.hoursNulled++

    const changed =
      textCleaned ||
      contractType !== r.contractType ||
      germanLevelRequired !== r.germanLevelRequired ||
      !sameArray(r.requiredSkills, requiredSkills) ||
      requiresEnrollment !== r.requiresEnrollment ||
      !sameArray(r.allowedVisaTypes, allowedVisaTypes) ||
      hourlyRate !== r.hourlyRate ||
      hoursPerWeek !== r.hoursPerWeek
    if (!changed) continue

    // Corrected description ⇒ the stored vector no longer describes this job.
    const descriptionChanged = description !== r.description
    if (descriptionChanged) stats.reEmbed++

    if (APPLY) {
      await db
        .update(jobs)
        .set({
          title,
          company,
          location,
          description,
          contractType,
          germanLevelRequired,
          requiredSkills,
          requiresEnrollment,
          allowedVisaTypes,
          hourlyRate,
          hoursPerWeek,
          ...(descriptionChanged ? { jobEmbedding: null } : {}),
        })
        .where(eq(jobs.id, r.id))
      stats.written++
    }
  }

  console.log("\n[2-4] re-normalise + re-classify")
  console.table(stats)
  if (Object.keys(contractMoves).length > 0) {
    console.log("\n    contract-type corrections:")
    for (const [move, n] of Object.entries(contractMoves).sort((a, b) => b[1] - a[1])) {
      console.log(`      ${move}: ${n}`)
    }
  }

  // ── 5. Staleness report (informational — the scraper now sweeps on its own) ──
  const stale = await db
    .select({ source: jobs.source, n: sql<number>`count(*)::int` })
    .from(jobs)
    .where(
      sql`${jobs.isActive} and ${jobs.scrapedAt} < now() - make_interval(days => ${STALE_DAYS})`,
    )
    .groupBy(jobs.source)
  console.log(`\n[5] active rows not re-seen in ${STALE_DAYS} days:`)
  console.log(stale.length === 0 ? "    none" : stale)

  if (!APPLY) console.log("\nDRY RUN — nothing written. Re-run with --apply.")
  else console.log("\nDone. Run scripts/run-embed.ts next to re-embed the corrected rows.")
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
