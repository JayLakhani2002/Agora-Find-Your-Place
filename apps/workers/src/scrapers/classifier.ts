import type { ContractType, GermanLevel, VisaRequirement } from "./base"

/**
 * All classification is keyword + regex — never an LLM (too slow/costly for bulk).
 * Inputs are matched case-insensitively against the combined title + description.
 */

export function classifyContractType(text: string): ContractType {
  const t = text.toLowerCase()
  // Order matters — check most specific first.
  if (/werkstudent|working student/.test(t)) return "werkstudent"
  if (/minijob|520\s*€|556\s*€|geringf[üu]gig/.test(t)) return "minijob"
  if (/praktikum|internship|intern\b/.test(t)) return "praktikum"
  if (/kurzfristig|temporary|befristet/.test(t)) return "teilzeit"
  if (/vollzeit|full[-\s]?time/.test(t)) return "vollzeit"
  if (/freelance|freiberuflich|contractor/.test(t)) return "freelance"
  // Unlabelled postings default to vollzeit on EVERY source, not just corporate ATS.
  //
  // contractType is not a display field — inferRequiresEnrollment() derives the legal
  // filter straight from it, so guessing "werkstudent" tells a §16b student that a
  // full-time role fits inside their 20h/120-day limit. Berlin Startup Jobs and jobicco
  // previously fell through to werkstudent and are in fact mostly full-time startup
  // roles; production had 40h/week postings labelled werkstudent because of this.
  // Guessing wrong toward vollzeit only hides an eligible job; guessing wrong toward
  // werkstudent surfaces one the user cannot lawfully take. Fail in the safe direction.
  return "vollzeit"
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
  // Explicitly open first — "we sponsor visas" must not be caught by the restriction
  // patterns below ("no visa sponsorship" vs "visa sponsorship available").
  if (
    /visa sponsorship (?:available|provided|offered)|we sponsor|sponsorship provided|non-?eu welcome|alle nationalit[äa]ten|all nationalities/.test(
      t,
    )
  )
    return "any"
  // Restriction phrasings. "arbeitserlaubnis erforderlich" is deliberately NOT here:
  // a non-EU student on a §16b visa *has* an Arbeitserlaubnis, so treating it as
  // EU-only over-hides jobs they are entitled to apply for.
  if (
    /eu citizens only|eu-?b[üu]rger|eu nationals only|no visa sponsorship|without visa sponsorship|cannot sponsor|unable to sponsor|unrestricted right to work|unbeschr[äa]nkte arbeitserlaubnis|eu work permit required/.test(
      t,
    )
  )
    return "eu_only"
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

/**
 * Substring matching turned "goals" into Go and "trust" into Rust on every long corporate
 * posting, so skills are matched at token boundaries. \b can't be used — it would break
 * "c++" and "c#", whose trailing chars are non-word.
 */
const SKILL_MATCHERS = SKILL_KEYWORDS.map((skill) => ({
  skill,
  re: new RegExp(`(?<![a-z0-9+#])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i"),
}))

/**
 * Business phrases that contain a skill name but do not mention the technology.
 * "go" is the only two-letter entry in the dictionary and so the only one that collides
 * with ordinary prose — "focused go-to-market strategy" was tagging marketing roles as
 * Go engineering. A hyphen can't simply be excluded wholesale: German compounds like
 * "React-Entwickler" are genuine skill mentions.
 */
const SKILL_FALSE_POSITIVES: Record<string, RegExp> = {
  go: /go-to-market|go-live|go\s?getter|go-ahead/i,
}

export function extractSkills(text: string): string[] {
  const found = SKILL_MATCHERS.filter(({ skill, re }) => {
    if (!re.test(text)) return false
    const blocklist = SKILL_FALSE_POSITIVES[skill]
    if (!blocklist) return true
    // Only reject when EVERY occurrence is inside a false-positive phrase.
    return text.replace(new RegExp(blocklist.source, "gi"), " ").match(re) !== null
  }).map(({ skill }) => skill)
  return Array.from(new Set(found))
}
