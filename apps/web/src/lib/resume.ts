// Pure resume helpers — no React, no IO. Unit-tested in tests/resume.test.ts.
//
// The score is deliberately a deterministic completeness rubric, not an LLM
// call: it has to update on every keystroke in the editor, and paying a model
// per character would be absurd. Quality scoring already exists elsewhere —
// applications carry six eval scores from the generation worker.

import type { ResumeContent, ResumeSection } from "@agora/db/schema"

export const DEFAULT_SECTION_ORDER: ResumeSection[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "languages",
  "certificates",
]

export const TEMPLATES = [
  { id: "harvard", label: "Harvard", recommended: true },
  { id: "modern", label: "Modern", recommended: false },
  { id: "simple", label: "Simple", recommended: false },
] as const

export type TemplateId = (typeof TEMPLATES)[number]["id"]

export function isTemplateId(value: string): value is TemplateId {
  return TEMPLATES.some((t) => t.id === value)
}

export function emptyResume(): ResumeContent {
  return {
    contact: {
      firstName: "",
      lastName: "",
      jobTitle: "",
      email: "",
      phone: "",
      location: "",
      linkedinUrl: "",
      portfolioUrl: "",
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    languages: [],
    certificates: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    showSkillLevels: false,
  }
}

/** One rubric line. `weight` values across all checks sum to 100. */
type ScoreCheck = {
  id: string
  label: string
  weight: number
  passed: (c: ResumeContent) => boolean
}

const CHECKS: ScoreCheck[] = [
  {
    id: "name",
    label: "Add your full name",
    weight: 10,
    passed: (c) => c.contact.firstName.trim() !== "" && c.contact.lastName.trim() !== "",
  },
  {
    id: "contact",
    label: "Add an email and phone number",
    weight: 10,
    passed: (c) => c.contact.email.trim() !== "" && c.contact.phone.trim() !== "",
  },
  {
    id: "title",
    label: "Add the job title you're targeting",
    weight: 10,
    passed: (c) => c.contact.jobTitle.trim() !== "",
  },
  {
    id: "summary",
    label: "Write a 2–4 sentence professional summary",
    weight: 15,
    // ~40 chars filters out "Hi" without demanding a specific length.
    passed: (c) => c.summary.trim().length >= 40,
  },
  {
    id: "experience",
    label: "Add at least one role",
    weight: 15,
    passed: (c) => c.experience.length >= 1,
  },
  {
    id: "bullets",
    label: "Give every role at least two bullet points",
    weight: 15,
    passed: (c) =>
      c.experience.length >= 1 &&
      c.experience.every((e) => e.bullets.filter((b) => b.trim() !== "").length >= 2),
  },
  {
    id: "education",
    label: "Add your education",
    weight: 10,
    passed: (c) => c.education.length >= 1,
  },
  {
    id: "skills",
    label: "List at least five skills",
    weight: 15,
    passed: (c) => c.skills.length >= 5,
  },
]

export type ResumeScore = {
  /** 0–100. */
  score: number
  missing: { id: string; label: string }[]
}

export function scoreResume(content: ResumeContent): ResumeScore {
  let score = 0
  const missing: { id: string; label: string }[] = []

  for (const check of CHECKS) {
    if (check.passed(content)) {
      score += check.weight
    } else {
      missing.push({ id: check.id, label: check.label })
    }
  }

  return { score, missing }
}

/** Display name for a resume header, falling back so the preview is never blank. */
export function displayName(content: ResumeContent): string {
  const full = `${content.contact.firstName} ${content.contact.lastName}`.trim()
  return full === "" ? "Your Name" : full
}
