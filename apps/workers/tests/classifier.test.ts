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
    expect(classifyContractType("Werkstudent (m/w/d)", "stellenticket")).toBe("werkstudent")
    expect(classifyContractType("Minijob 556€ basis", "jobicco")).toBe("minijob")
    expect(classifyContractType("Praktikum / internship", "jobicco")).toBe("praktikum")
    expect(classifyContractType("Vollzeit full-time role", "jobicco")).toBe("vollzeit")
  })

  it("does not misfire 'intern' inside 'international'", () => {
    expect(classifyContractType("international sales associate, full-time", "jobicco")).toBe(
      "vollzeit",
    )
  })

  it("defaults Berlin Startup Jobs listings to werkstudent", () => {
    expect(classifyContractType("Backend Engineer", "berlin_startup_jobs")).toBe("werkstudent")
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
})
