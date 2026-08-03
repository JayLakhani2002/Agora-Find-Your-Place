import type { ResumeContent, ResumeEntry } from "@agora/db/schema"
import { describe, expect, it } from "vitest"
import {
  DEFAULT_SECTION_ORDER,
  displayName,
  emptyResume,
  isTemplateId,
  scoreResume,
} from "../src/lib/resume"

function entry(bullets: string[]): ResumeEntry {
  return {
    id: "e1",
    title: "Werkstudent Data",
    organisation: "ACME",
    location: "Berlin",
    startDate: "2025-01",
    endDate: null,
    current: true,
    bullets,
  }
}

/** A resume that passes every rubric check. */
function completeResume(): ResumeContent {
  return {
    ...emptyResume(),
    contact: {
      firstName: "Jay",
      lastName: "Lakhani",
      jobTitle: "AI Engineer",
      email: "jay@example.com",
      phone: "+49 176 000000",
      location: "Berlin",
      linkedinUrl: "",
      portfolioUrl: "",
    },
    summary: "AI engineer building production LLM systems across retrieval and evaluation work.",
    experience: [entry(["Built the ranking pipeline.", "Cut latency by half."])],
    education: [entry([])],
    skills: ["RAG", "Evals", "Python", "Postgres", "TypeScript"].map((name, i) => ({
      id: `s${i}`,
      name,
      level: "Intermediate",
    })),
  }
}

describe("emptyResume", () => {
  it("starts at zero score with every check listed as missing", () => {
    const { score, missing } = scoreResume(emptyResume())
    expect(score).toBe(0)
    expect(missing.length).toBeGreaterThan(0)
  })

  it("renders every section by default", () => {
    expect(emptyResume().sectionOrder).toEqual(DEFAULT_SECTION_ORDER)
  })
})

describe("scoreResume", () => {
  it("reaches exactly 100 when every check passes, and lists nothing missing", () => {
    const { score, missing } = scoreResume(completeResume())
    expect(score).toBe(100)
    expect(missing).toEqual([])
  })

  it("never leaves the 0-100 range", () => {
    for (const content of [emptyResume(), completeResume()]) {
      const { score } = scoreResume(content)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    }
  })

  it("fails the bullet check when any single role is thin", () => {
    const content = completeResume()
    content.experience = [entry(["Only one bullet."])]
    expect(scoreResume(content).missing.map((m) => m.id)).toContain("bullets")
  })

  it("ignores blank bullets when counting", () => {
    const content = completeResume()
    // Two entries, but one is whitespace — this must not count as two bullets.
    content.experience = [entry(["Real bullet.", "   "])]
    expect(scoreResume(content).missing.map((m) => m.id)).toContain("bullets")
  })

  it("rejects a too-short summary", () => {
    const content = completeResume()
    content.summary = "Engineer."
    expect(scoreResume(content).missing.map((m) => m.id)).toContain("summary")
  })

  it("requires five skills, not four", () => {
    const content = completeResume()
    content.skills = content.skills.slice(0, 4)
    expect(scoreResume(content).missing.map((m) => m.id)).toContain("skills")
  })
})

describe("displayName", () => {
  it("falls back so an empty preview is never blank", () => {
    expect(displayName(emptyResume())).toBe("Your Name")
  })

  it("uses the real name once entered", () => {
    expect(displayName(completeResume())).toBe("Jay Lakhani")
  })
})

describe("isTemplateId", () => {
  it("accepts known templates and rejects anything else", () => {
    expect(isTemplateId("harvard")).toBe(true)
    expect(isTemplateId("modern")).toBe(true)
    expect(isTemplateId("simple")).toBe(true)
    // Guards the router: template is a free-form text column, so an unknown
    // value would render nothing.
    expect(isTemplateId("../../etc/passwd")).toBe(false)
    expect(isTemplateId("")).toBe(false)
  })
})
