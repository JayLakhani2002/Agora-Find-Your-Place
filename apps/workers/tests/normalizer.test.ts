import { describe, expect, it } from "vitest"
import { computeDedupHash } from "../src/scrapers/base"
import { decodeEntities, normalizeJob, stripHtml } from "../src/scrapers/normalizer"

describe("stripHtml", () => {
  it("removes tags, scripts and styles and collapses whitespace", () => {
    const html =
      "<style>.a{}</style><h1>Werkstudent</h1>  <p>Backend &nbsp; dev</p><script>x()</script>"
    expect(stripHtml(html)).toBe("Werkstudent Backend dev")
  })

  it("decodes entities that previously reached the database verbatim", () => {
    // 282 production rows carried raw &amp; / &#x26; / &#xfc; in their description.
    expect(stripHtml("<p>R&amp;D &#x26; Sales</p>")).toBe("R&D & Sales")
    expect(stripHtml("<p>M&#xfc;nchen &#x2013; remote</p>")).toBe("München – remote")
  })
})

describe("decodeEntities", () => {
  it("strips soft hyphens that fork company names", () => {
    // TU Berlin renders U+00AD inside words: invisible on screen, but it makes
    // "Technische Universität Berlin" a different string from the real one.
    expect(decodeEntities("Fraun­ho­fer Insti­tut")).toBe("Fraunhofer Institut")
  })

  it("leaves unknown entities untouched rather than mangling them", () => {
    expect(decodeEntities("100 &notarealentity; x")).toBe("100 &notarealentity; x")
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

  it("drops records with a missing or non-http sourceUrl", () => {
    // saveJobs writes the whole batch in ONE insert, so a single row with a NULL
    // sourceUrl raises a not-null violation that discards every record in the run.
    const base = {
      title: "Werkstudent Dev",
      company: "Acme GmbH",
      source: "jobicco" as const,
      description: "A real description long enough to survive normalisation.",
    }
    expect(normalizeJob({ ...base, sourceUrl: undefined as unknown as string })).toBeNull()
    expect(normalizeJob({ ...base, sourceUrl: "" })).toBeNull()
    expect(normalizeJob({ ...base, sourceUrl: "not-a-url" })).toBeNull()
    expect(normalizeJob({ ...base, sourceUrl: "https://jobicco.berlin/1" })).not.toBeNull()
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
