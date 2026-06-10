import type { ContractType, GermanLevel, SourceName, VisaRequirement } from "./base"

/**
 * All classification is keyword + regex — never an LLM (too slow/costly for bulk).
 * Inputs are matched case-insensitively against the combined title + description.
 */

export function classifyContractType(text: string, source: SourceName): ContractType {
  const t = text.toLowerCase()
  // Order matters — check most specific first.
  if (/werkstudent|working student/.test(t)) return "werkstudent"
  if (/minijob|520\s*€|556\s*€|geringf[üu]gig/.test(t)) return "minijob"
  if (/praktikum|internship|intern\b/.test(t)) return "praktikum"
  if (/kurzfristig|temporary|befristet/.test(t)) return "teilzeit"
  if (/vollzeit|full[-\s]?time/.test(t)) return "vollzeit"
  if (/freelance|freiberuflich|contractor/.test(t)) return "freelance"
  // High prior: Berlin Startup Jobs listings are overwhelmingly werkstudent-eligible.
  if (source === "berlin_startup_jobs") return "werkstudent"
  return "werkstudent"
}

export function classifyGermanLevel(text: string): GermanLevel {
  const t = text.toLowerCase()
  if (/\bc2\b|muttersprach|native speaker/.test(t)) return "C2"
  if (/\bc1\b|fließend|flie[ßs]end|fluent german/.test(t)) return "C1"
  if (/\bb2\b|gute deutschkenntnisse|good german/.test(t)) return "B2"
  if (/\bb1\b/.test(t)) return "B1"
  if (/\ba2\b|grundkenntnisse/.test(t)) return "A2"
  if (/\ba1\b/.test(t)) return "A1"
  if (/english only|no german|kein deutsch/.test(t)) return "none"
  return "none"
}

export function classifyVisaRequirement(text: string): VisaRequirement {
  const t = text.toLowerCase()
  if (/eu citizens only|eu-?b[üu]rger|arbeitserlaubnis erforderlich|eu nationals only/.test(t))
    return "eu_only"
  if (/visa sponsorship|non-?eu welcome|alle nationalit[äa]ten|all nationalities/.test(t))
    return "any"
  return "none"
}

/** Map the inferred VisaRequirement to Agent 2's allowedVisaTypes column (text[] | null). */
export function visaRequirementToAllowedTypes(req: VisaRequirement): string[] | null {
  if (req === "eu_only") return ["eu_citizen"]
  // "any" and "none" → no restriction encoded; Agent 5 treats null as "all visa types allowed".
  return null
}

/** Werkstudent + (mandatory) Praktikum require active enrollment; other contracts do not. */
export function inferRequiresEnrollment(contractType: ContractType): boolean {
  return contractType === "werkstudent" || contractType === "praktikum"
}

const MINDESTLOHN_2026 = 12.82 // current German minimum wage €/h — fallback for Minijob with no stated rate

export function extractHourlyRate(text: string): number | null {
  // A currency marker (€ / EUR) is REQUIRED — otherwise "20 hours/week" is misread as €20/h.
  // Range "15–18 €/h" → take the minimum (conservative floor).
  const range = text.match(
    /(\d{1,2}(?:[.,]\d{2})?)\s*(?:–|-|bis|to)\s*(\d{1,2}(?:[.,]\d{2})?)\s*(?:€|eur)/i,
  )
  if (range?.[1]) return Number.parseFloat(range[1].replace(",", "."))

  // Currency after the number: "15€/h", "18,50 € pro Stunde".
  const after = text.match(/(\d{1,2}(?:[.,]\d{2})?)\s*(?:€|eur)\s*\/?\s*(?:Stunde|std|h|hr|hour)?/i)
  if (after?.[1]) return Number.parseFloat(after[1].replace(",", "."))

  // Currency before the number: "€15/hour", "EUR 15".
  const before = text.match(/(?:€|eur)\s*(\d{1,2}(?:[.,]\d{2})?)/i)
  if (before?.[1]) return Number.parseFloat(before[1].replace(",", "."))

  if (/minijob/i.test(text)) return MINDESTLOHN_2026
  return null
}

export function extractHoursPerWeek(text: string): number | null {
  const range = text.match(
    /(\d{1,2})\s*(?:–|-|bis)\s*(\d{1,2})\s*(?:Stunden|h|hours|Std)\s*\/?\s*(?:Woche|week|wk)/i,
  )
  if (range?.[2]) return Number.parseInt(range[2], 10) // max of range

  const single = text.match(/(\d{1,2})\s*(?:Stunden|h|hours|Std)\s*\/?\s*(?:Woche|week|wk)/i)
  if (single?.[1]) return Number.parseInt(single[1], 10)

  if (/minijob/i.test(text)) return 10
  return null
}

// Skill keyword dictionary — lightweight extraction for match seeding (Agent 5 refines).
const SKILL_KEYWORDS = [
  "javascript",
  "typescript",
  "react",
  "node",
  "python",
  "java",
  "sql",
  "aws",
  "docker",
  "kubernetes",
  "go",
  "rust",
  "php",
  "ruby",
  "c++",
  "c#",
  "figma",
  "photoshop",
  "excel",
  "marketing",
  "sales",
  "seo",
  "content",
  "copywriting",
  "data analysis",
  "machine learning",
  "tailwind",
  "next.js",
  "vue",
  "angular",
  "graphql",
  "postgres",
  "mongodb",
  "git",
]

export function extractSkills(text: string): string[] {
  const t = text.toLowerCase()
  const found = SKILL_KEYWORDS.filter((skill) => t.includes(skill))
  return Array.from(new Set(found))
}
