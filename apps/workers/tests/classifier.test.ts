import { describe, expect, it } from "vitest"
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

describe("extractHourlyRate", () => {
  // Regression: the original regex misread "20 hours/week" as €20/h. A currency
  // marker (€ / EUR) is now REQUIRED.
  it("does NOT treat weekly hours as a salary", () => {
    expect(extractHourlyRate("We offer 20 hours per week. Flexible.")).toBeNull()
    expect(extractHourlyRate("Part-time role, 40 hours/week")).toBeNull()
  })

  it("extracts a rate only when a currency marker is present", () => {
    expect(extractHourlyRate("15€/h")).toBe(15)
    expect(extractHourlyRate("Pay: 18,50 €/Stunde")).toBe(18.5)
    expect(extractHourlyRate("€15/hour")).toBe(15)
    expect(extractHourlyRate("EUR 16 per hour")).toBe(16)
  })

  it("takes the lower bound of a range", () => {
    expect(extractHourlyRate("15–18 €/h")).toBe(15)
    expect(extractHourlyRate("12-14 EUR")).toBe(12)
  })

  it("picks the rate even when weekly hours are in the same text", () => {
    expect(extractHourlyRate("Werkstudent, 20 hours/week, 15€/h")).toBe(15)
  })

  it("falls back to minimum wage for a Minijob with no stated rate", () => {
    expect(extractHourlyRate("Minijob, no rate stated")).toBe(12.82)
  })

  it("ignores annual salaries and unmarked numbers", () => {
    expect(extractHourlyRate("Salary 50000 per year")).toBeNull()
    expect(extractHourlyRate("Great team, free coffee")).toBeNull()
  })
})

describe("extractHoursPerWeek", () => {
  it("reads a single weekly-hours figure", () => {
    expect(extractHoursPerWeek("20 hours/week")).toBe(20)
    expect(extractHoursPerWeek("15 Stunden/Woche")).toBe(15)
  })

  it("takes the max of a weekly range", () => {
    expect(extractHoursPerWeek("10-12 Stunden/Woche")).toBe(12)
  })

  it("defaults a Minijob to 10h and returns null when unknown", () => {
    expect(extractHoursPerWeek("Minijob")).toBe(10)
    expect(extractHoursPerWeek("no hours mentioned")).toBeNull()
  })
})

describe("classifyContractType", () => {
  it("matches the most specific contract first", () => {
    expect(classifyContractType("Werkstudent (m/w/d)")).toBe("werkstudent")
    expect(classifyContractType("Minijob 556€ basis")).toBe("minijob")
    expect(classifyContractType("Praktikum / internship")).toBe("praktikum")
    expect(classifyContractType("Vollzeit full-time role")).toBe("vollzeit")
  })

  it("does not misfire 'intern' inside 'international'", () => {
    expect(classifyContractType("international sales associate, full-time")).toBe("vollzeit")
  })

  // requiresEnrollment is derived from contractType, so an unlabelled full-time role
  // guessed as werkstudent tells a §16b student it fits their 20h limit. Default to
  // the contract that hides a job rather than the one that mis-states its legality.
  it("defaults an unlabelled listing to vollzeit, not werkstudent", () => {
    expect(classifyContractType("Backend Engineer")).toBe("vollzeit")
    expect(inferRequiresEnrollment(classifyContractType("Backend Engineer"))).toBe(false)
  })
})

describe("extractSkills false positives", () => {
  it("does not read Go out of business prose", () => {
    expect(extractSkills("Own our focused go-to-market strategy")).not.toContain("go")
    expect(extractSkills("planning the go-live")).not.toContain("go")
  })

  it("still finds Go when it is genuinely the language", () => {
    expect(extractSkills("We write services in Go and Rust")).toContain("go")
    // Present both ways: the false-positive phrase must not mask a real mention.
    expect(extractSkills("go-to-market tooling, written in Go")).toContain("go")
  })

  it("does not read skills out of unrelated substrings", () => {
    // The original defect: 233 jobs tagged "git" from "digital", 48 "rust" from "trust".
    expect(extractSkills("digital transformation")).not.toContain("git")
    expect(extractSkills("we build trust with customers")).not.toContain("rust")
  })
})

describe("classifyGermanLevel", () => {
  it("detects explicit CEFR levels", () => {
    expect(classifyGermanLevel("fluent German (C1) required")).toBe("C1")
    expect(classifyGermanLevel("gute Deutschkenntnisse (B2)")).toBe("B2")
    expect(classifyGermanLevel("English only, no German needed")).toBe("none")
  })

  it("defaults to none when unspecified", () => {
    expect(classifyGermanLevel("We build great software")).toBe("none")
  })
})

describe("classifyVisaRequirement → allowedVisaTypes / enrollment", () => {
  it("maps EU-only to eu_citizen", () => {
    expect(classifyVisaRequirement("EU citizens only")).toBe("eu_only")
    expect(visaRequirementToAllowedTypes("eu_only")).toEqual(["eu_citizen"])
  })

  it("treats sponsorship / unspecified as unrestricted (null)", () => {
    expect(classifyVisaRequirement("visa sponsorship available")).toBe("any")
    expect(visaRequirementToAllowedTypes("any")).toBeNull()
    expect(visaRequirementToAllowedTypes("none")).toBeNull()
  })

  it("requires enrollment only for werkstudent and praktikum", () => {
    expect(inferRequiresEnrollment("werkstudent")).toBe(true)
    expect(inferRequiresEnrollment("praktikum")).toBe(true)
    expect(inferRequiresEnrollment("minijob")).toBe(false)
    expect(inferRequiresEnrollment("vollzeit")).toBe(false)
  })
})

describe("extractSkills", () => {
  it("finds known skills, de-duplicated and case-insensitive", () => {
    const skills = extractSkills("We use TypeScript, React and Postgres. typescript a plus.")
    expect(skills).toContain("typescript")
    expect(skills).toContain("react")
    expect(skills).toContain("postgres")
    expect(skills.filter((s) => s === "typescript")).toHaveLength(1)
  })

  it("returns an empty array when nothing matches", () => {
    expect(extractSkills("a friendly team and free snacks")).toEqual([])
  })

  // Regression: substring matching tagged every corporate posting with Go and Rust.
  it("does not match skills inside longer words", () => {
    expect(extractSkills("Own our goals, build trust, and drive content")).toEqual(["content"])
  })

  it("still matches skills whose names end in punctuation", () => {
    const skills = extractSkills("Strong C++ and C# background, some Node.js, Go and Rust")
    expect(skills).toEqual(expect.arrayContaining(["c++", "c#", "node", "go", "rust"]))
  })
})
