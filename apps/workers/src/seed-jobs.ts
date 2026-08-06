/**
 * One-shot seed: insert sample Werkstudent jobs so the deck works before
 * the nightly scraper has run. Safe to re-run (upserts on externalId+source).
 *
 * Usage:  pnpm --filter @agora/workers tsx src/seed-jobs.ts
 */
import "./env"
import { computeDedupHash, saveJobs } from "./scrapers/base"
import type { JobRecord } from "./scrapers/base"

// "seed" is a dev-only source not present in SourceName — cast intentionally.
const SAMPLE_JOBS: Omit<JobRecord, "externalId">[] = [
  {
    source: "seed" as JobRecord["source"],
    sourceUrl: "https://jobs.zalando.com/werkstudent-swe",
    title: "Werkstudent Software Engineering (React/TypeScript)",
    company: "Zalando SE",
    location: "Berlin, Germany",
    contractType: "werkstudent",
    hourlyRate: 18,
    hoursPerWeek: 20,
    germanLevelRequired: null,
    requiredSkills: ["React", "TypeScript", "Git"],
    requiresEnrollment: true,
    allowedVisaTypes: null,
    description:
      "Join our platform team as a working student. You will build React components for our design system, write TypeScript, and collaborate in agile sprints. 20h/week during term, full-time during semester break possible.",
  },
  {
    source: "seed" as JobRecord["source"],
    sourceUrl: "https://careers.deliveryhero.com/ds-werkstudent",
    title: "Working Student Data Science (Python/ML)",
    company: "Delivery Hero",
    location: "Berlin, Germany",
    contractType: "werkstudent",
    hourlyRate: 17,
    hoursPerWeek: 20,
    germanLevelRequired: null,
    requiredSkills: ["Python", "pandas", "SQL", "Machine Learning"],
    requiresEnrollment: true,
    allowedVisaTypes: null,
    description:
      "Support our data science team. Work with large datasets, build ML pipelines with Python and pandas, and deploy models. Good SQL skills required. English-only environment.",
  },
  {
    source: "seed" as JobRecord["source"],
    sourceUrl: "https://sumup.com/careers/werkstudent-backend",
    title: "Werkstudent Backend Engineering (Node.js)",
    company: "SumUp",
    location: "Berlin, Germany",
    contractType: "werkstudent",
    hourlyRate: 16,
    hoursPerWeek: 20,
    germanLevelRequired: null,
    requiredSkills: ["Node.js", "PostgreSQL", "REST APIs"],
    requiresEnrollment: true,
    allowedVisaTypes: null,
    description:
      "Work on our payment platform backend. Build Node.js microservices, write PostgreSQL queries, and contribute to our API layer. Fully remote-friendly.",
  },
  {
    source: "seed" as JobRecord["source"],
    sourceUrl: "https://personio.com/jobs/werkstudent-marketing",
    title: "Werkstudent Product Marketing",
    company: "Personio",
    location: "Berlin, Germany",
    contractType: "werkstudent",
    hourlyRate: 15,
    hoursPerWeek: 20,
    germanLevelRequired: "B2",
    requiredSkills: ["Marketing", "Copywriting", "Excel"],
    requiresEnrollment: true,
    allowedVisaTypes: null,
    description:
      "Support our DACH marketing team. Create content, analyse campaign performance, and help run events. German B2 required for customer-facing work.",
  },
  {
    source: "seed" as JobRecord["source"],
    sourceUrl: "https://n26.com/en-de/careers/werkstudent-ux",
    title: "Working Student UX Design",
    company: "N26",
    location: "Berlin, Germany",
    contractType: "werkstudent",
    hourlyRate: 17,
    hoursPerWeek: 20,
    germanLevelRequired: null,
    requiredSkills: ["Figma", "UX Design", "Prototyping"],
    requiresEnrollment: true,
    allowedVisaTypes: null,
    description:
      "Join our product design team. Design user flows in Figma, run usability tests, and iterate on mobile UI for millions of users. English-only team.",
  },
  {
    source: "seed" as JobRecord["source"],
    sourceUrl: "https://careers.hellofresh.com/werkstudent-devops",
    title: "Werkstudent DevOps / Cloud (AWS)",
    company: "HelloFresh",
    location: "Berlin, Germany",
    contractType: "werkstudent",
    hourlyRate: 18,
    hoursPerWeek: 20,
    germanLevelRequired: null,
    requiredSkills: ["AWS", "Terraform", "Docker", "Kubernetes"],
    requiresEnrollment: true,
    allowedVisaTypes: null,
    description:
      "Help our platform team manage AWS infrastructure with Terraform. Work with Docker containers, Kubernetes clusters, and CI/CD pipelines.",
  },
  {
    source: "seed" as JobRecord["source"],
    sourceUrl: "https://contentful.com/jobs/werkstudent-vue",
    title: "Werkstudent Frontend Development (Vue.js)",
    company: "Contentful",
    location: "Berlin, Germany",
    contractType: "werkstudent",
    hourlyRate: 17,
    hoursPerWeek: 20,
    germanLevelRequired: null,
    requiredSkills: ["Vue.js", "JavaScript", "CSS"],
    requiresEnrollment: true,
    allowedVisaTypes: null,
    description:
      "Build web interfaces for our headless CMS platform using Vue.js. Implement features, fix bugs, and work closely with our design team.",
  },
  {
    source: "seed" as JobRecord["source"],
    sourceUrl: "https://tier.app/careers/werkstudent-finance",
    title: "Working Student Finance / Controlling",
    company: "Tier Mobility",
    location: "Berlin, Germany",
    contractType: "werkstudent",
    hourlyRate: 15,
    hoursPerWeek: 20,
    germanLevelRequired: "B1",
    requiredSkills: ["Excel", "Finance", "Accounting"],
    requiresEnrollment: true,
    allowedVisaTypes: null,
    description:
      "Support our finance team with monthly reporting, budget tracking, and reconciliation. Advanced Excel required. German B1 helpful for local vendor communication.",
  },
  {
    source: "seed" as JobRecord["source"],
    sourceUrl: "https://babbel.com/jobs/werkstudent-ios",
    title: "Werkstudent Mobile Development (iOS/Swift)",
    company: "Babbel",
    location: "Berlin, Germany",
    contractType: "werkstudent",
    hourlyRate: 18,
    hoursPerWeek: 20,
    germanLevelRequired: null,
    requiredSkills: ["Swift", "iOS", "Xcode"],
    requiresEnrollment: true,
    allowedVisaTypes: null,
    description:
      "Join our iOS team building language learning features. Write Swift, work in Xcode, and ship to the App Store. Pair programming culture.",
  },
  {
    source: "seed" as JobRecord["source"],
    sourceUrl: "https://flixbus.com/jobs/minijob-kundendienst",
    title: "Minijob Kundendienst (Deutsch C1)",
    company: "Flixbus",
    location: "Berlin, Germany",
    contractType: "minijob",
    hourlyRate: 14,
    hoursPerWeek: 10,
    germanLevelRequired: "C1",
    requiredSkills: ["Customer Service", "German", "Communication"],
    requiresEnrollment: false,
    allowedVisaTypes: null,
    description:
      "Bearbeitung von Kundenanfragen per E-Mail und Chat. Sehr gute Deutschkenntnisse erforderlich (C1). Flexible Zeiteinteilung, ideal für Studierende.",
  },
]

async function main() {
  // These are fabricated postings attributed to REAL companies (Zalando, N26, SumUp…)
  // with invented URLs. Nothing in the read path filters source='seed', so once inserted
  // they enter the swipe deck and get embedded like real jobs — a user can generate a CV
  // for, and try to apply to, a listing that never existed. Never let this touch prod.
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    console.error(
      "Refusing to seed fabricated jobs with NODE_ENV=production. Use --force if you truly mean it.",
    )
    process.exit(1)
  }

  const records: JobRecord[] = SAMPLE_JOBS.map((j) => ({
    ...j,
    externalId: computeDedupHash(j.company, j.title, j.description),
  }))

  const count = await saveJobs(records)
  console.log(`✓ Seeded ${count} sample jobs.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
