import "../src/env"
import { embedPendingJobs } from "../src/jobs/embed-jobs"
import { scrapeAts } from "../src/jobs/scrape-ats"

async function main() {
  const r = await scrapeAts()
  // See run-arbeitnow: a manual scrape must embed too, or the rows never match.
  console.log(`Embedded ${await embedPendingJobs()} pending jobs`)
  console.log(`\n=== ${r.length} records ===`)
  const byCompany: Record<string, number> = {}
  for (const j of r) byCompany[j.company] = (byCompany[j.company] ?? 0) + 1
  console.log(byCompany)
  for (const j of r.slice(0, 3))
    console.log({
      title: j.title.slice(0, 45),
      company: j.company,
      location: j.location,
      contractType: j.contractType,
      descLen: j.description.length,
    })
  process.exit(0)
}

main()
