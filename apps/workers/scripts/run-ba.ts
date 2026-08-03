import "../src/env"
import { scrapeArbeitsagentur } from "../src/jobs/scrape-arbeitsagentur"

async function main() {
  const r = await scrapeArbeitsagentur()
  console.log(`\n=== ${r.length} records ===`)
  for (const j of r.slice(0, 3)) {
    console.log({
      title: j.title,
      company: j.company,
      location: j.location,
      contractType: j.contractType,
      hourlyRate: j.hourlyRate,
      germanLevel: j.germanLevelRequired,
      skills: j.requiredSkills,
      requiresEnrollment: j.requiresEnrollment,
      descLen: j.description.length,
      url: j.sourceUrl,
    })
  }
  process.exit(0)
}
main()
