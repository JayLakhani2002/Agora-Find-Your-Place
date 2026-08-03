import "../src/env"
import { scrapeArbeitnow } from "../src/jobs/scrape-arbeitnow"
async function main() {
  const r = await scrapeArbeitnow()
  console.log(`\n=== ${r.length} records ===`)
  const byType: Record<string, number> = {}
  for (const j of r) byType[j.contractType] = (byType[j.contractType] ?? 0) + 1
  console.log("by contractType:", byType)
  for (const j of r.slice(0, 3)) console.log({ title: j.title.slice(0,45), company: j.company.slice(0,25), location: j.location, contractType: j.contractType, descLen: j.description.length })
  process.exit(0)
}
main()
