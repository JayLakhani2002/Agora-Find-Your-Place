import { describe, expect, it } from "vitest"
import { REQUIRED_PLACEHOLDER, roleQuestionsPrompt, verifyPlaceholders } from "../src/generation"
import { coverLetterPrompt } from "../src/prompts/cover-letter"
import { cvGenerationPrompt } from "../src/prompts/cv-generation"
import { followUpPrompt } from "../src/prompts/follow-up"

// ── verifyPlaceholders — the deterministic PII guard ──────────────────────────

describe("verifyPlaceholders", () => {
  const goodDoc = `# Lebenslauf
## Persönliche Daten
[Foto]
Name: [Vorname Nachname]
Adresse: [Straße, PLZ Berlin]
E-Mail: [email@placeholder.com]
Telefon: [+49 xxx]

## Ausbildung
10/2024 – heute  MSc Informatik, TU Berlin`

  it("accepts a document with all placeholders and no PII", () => {
    const result = verifyPlaceholders(goodDoc)
    expect(result.ok).toBe(true)
    expect(result.problems).toHaveLength(0)
  })

  it("rejects a document missing the name placeholder", () => {
    const result = verifyPlaceholders(goodDoc.replace("[Vorname Nachname]", "Max Mustermann"))
    expect(result.ok).toBe(false)
    expect(result.problems.join()).toContain(REQUIRED_PLACEHOLDER)
  })

  it("rejects a real-looking email address", () => {
    const result = verifyPlaceholders(`${goodDoc}\nKontakt: max.mustermann@gmail.com`)
    expect(result.ok).toBe(false)
  })

  it("accepts the sanctioned email placeholder", () => {
    expect(verifyPlaceholders(goodDoc).ok).toBe(true)
  })

  it("rejects a real-looking +49 phone number", () => {
    const result = verifyPlaceholders(`${goodDoc}\nTel: +49 1573 2468100`)
    expect(result.ok).toBe(false)
  })

  it("accepts the [+49 xxx] phone placeholder", () => {
    // "[+49 xxx]" must not trip the +49-digits pattern
    expect(verifyPlaceholders("Telefon: [+49 xxx]\n[Vorname Nachname]").ok).toBe(true)
  })
})

// ── Prompt content — the rules that make documents German-ATS-correct ─────────

describe("cvGenerationPrompt encodes the German ATS rules", () => {
  const prompt = cvGenerationPrompt({
    userProfile: {
      skills: ["Python", "SQL"],
      experienceSummary: "2 years data analysis",
      educationSummary: "MSc Data Science, TU Berlin",
      germanLevel: "B2",
    },
    job: {
      title: "Werkstudent Data Engineering",
      company: "Acme GmbH",
      description: "We need SQL and Python for our data platform.",
      requiredSkills: ["SQL", "Python", "Airflow"],
    },
    roleAnswers: { "Most relevant project?": "Built an ETL pipeline" },
  })

  it("enforces MM/YYYY dates", () => {
    expect(prompt).toContain("MM/YYYY")
  })

  it("enforces the German section order", () => {
    expect(prompt).toContain("Persönliche Daten → Ausbildung → Berufserfahrung")
  })

  it("enforces placeholders for ALL personal data", () => {
    expect(prompt).toContain("[Vorname Nachname]")
    expect(prompt).toContain("NEVER generate a real name")
  })

  it("enforces the 1.5 page maximum", () => {
    expect(prompt).toContain("1.5 pages")
  })

  it("forbids inventing experience", () => {
    expect(prompt).toContain("Do not invent experience")
  })

  it("includes the candidate's role answers verbatim", () => {
    expect(prompt).toContain("Built an ETL pipeline")
  })

  it("truncates long job descriptions to bound the context", () => {
    const long = cvGenerationPrompt({
      userProfile: {
        skills: [],
        experienceSummary: "",
        educationSummary: "",
        germanLevel: "B1",
      },
      job: {
        title: "T",
        company: "C",
        description: "x".repeat(5000),
        requiredSkills: [],
      },
      roleAnswers: {},
    })
    expect(long.length).toBeLessThan(4000)
  })
})

describe("coverLetterPrompt encodes the Anschreiben rules", () => {
  const prompt = coverLetterPrompt({
    userProfile: { skills: ["React"], experienceSummary: "Frontend intern", germanLevel: "B1" },
    job: {
      title: "Werkstudent Frontend",
      company: "Startup UG",
      description: "React app for logistics.",
      sourceUrl: "https://example.com/job",
    },
    roleAnswers: {},
    cvContent: "# CV content here",
    dateBerlin: "10.06.2026",
  })

  it("bans the 'Hiermit bewerbe ich mich' cliché", () => {
    expect(prompt).toContain("Hiermit bewerbe ich mich")
    expect(prompt).toContain("Do NOT use")
  })

  it("caps at 350 words", () => {
    expect(prompt).toContain("Max 350 words")
  })

  it("requires formal Sie form and the availability line", () => {
    expect(prompt).toContain('"Sie" form')
    expect(prompt).toContain("20 Stunden pro Woche")
  })

  it("passes the CV for factual consistency", () => {
    expect(prompt).toContain("# CV content here")
  })

  it("uses the injected Berlin date (deterministic for tests)", () => {
    expect(prompt).toContain("10.06.2026")
  })
})

describe("followUpPrompt", () => {
  const prompt = followUpPrompt({
    job: { title: "Werkstudent QA", company: "Beta GmbH" },
    daysSinceSubmission: 10,
  })

  it("demands exactly 3 sentences in formal German", () => {
    expect(prompt).toContain("EXACTLY 3 sentences")
    expect(prompt).toContain('"Sie" form')
  })

  it("uses placeholders, never personal data", () => {
    expect(prompt).toContain("[Vorname Nachname]")
    expect(prompt).toContain("[Datum]")
  })
})

describe("roleQuestionsPrompt", () => {
  const prompt = roleQuestionsPrompt("Werkstudent Data", "Long description ".repeat(100))

  it("asks for exactly 4 questions in English", () => {
    expect(prompt).toContain("exactly 4")
    expect(prompt).toContain("In English")
  })

  it("truncates the job description to 800 chars", () => {
    expect(prompt.length).toBeLessThan(1800)
  })
})
