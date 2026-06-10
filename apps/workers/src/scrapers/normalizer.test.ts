import { describe, expect, it } from "vitest"
import { computeDedupHash } from "./base"
import { normalizeJob, stripHtml } from "./normalizer"

describe("stripHtml", () => {
  it("removes tags, scripts and styles and collapses whitespace", () => {
    const html =
      "<style>.a{}</style><h1>Werkstudent</h1>  <p>Backend &nbsp; dev</p><script>x()</script>"
    expect(stripHtml(html)).toBe("Werkstudent Backend dev")
  })
})

describe("computeDedupHash", () => {
  it("is stable and case/whitespace-insensitive on company+title", () => {
    const a = computeDedupHash("Acme GmbH", "Werkstudent Backend", "We need a backend werkstudent.")
    const b = computeDedupHash(
      "  acme gmbh ",
      "  werkstudent backend  ",
      "We need a backend werkstudent.",
    )
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })

  it("differs when the company differs", () => {
    const a = computeDedupHash("Acme", "Dev", "desc")
    const b = computeDedupHash("Globex", "Dev", "desc")
    expect(a).not.toBe(b)
  })
})

describe("normalizeJob", () => {
  it("maps a raw job to the jobs-table shape with classification applied", () => {
    const rec = normalizeJob({
      title: "Werkstudent Data (m/w/d)",
      company: "Acme GmbH",
      sourceUrl: "https://berlinstartupjobs.com/job/1",
      source: "berlin_startup_jobs",
      description: "<p>Python and SQL. 18€/h, 20 hours/week. English only.</p>",
    })
    expect(rec).not.toBeNull()
    if (!rec) return
    expect(rec.contractType).toBe("werkstudent")
    expect(rec.hourlyRate).toBe(18)
    expect(rec.hoursPerWeek).toBe(20)
    expect(rec.germanLevelRequired).toBe("none")
    expect(rec.requiresEnrollment).toBe(true)
    expect(rec.location).toBe("Berlin")
    expect(rec.requiredSkills).toContain("python")
    expect(rec.externalId).toMatch(/^[a-f0-9]{64}$/)
    expect(rec.description).not.toContain("<p>")
  })

  it("returns null when required fields are missing", () => {
    expect(
      normalizeJob({
        title: "",
        company: "Acme",
        sourceUrl: "u",
        source: "jobicco",
        description: "desc",
      }),
    ).toBeNull()
    expect(
      normalizeJob({
        title: "Dev",
        company: "Acme",
        sourceUrl: "u",
        source: "jobicco",
        description: "   ",
      }),
    ).toBeNull()
  })
})
