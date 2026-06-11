// Agent 6 — generation orchestration helpers.
// Generation (CV / cover letter / follow-up) = Sonnet. Questions = Haiku.
// Opus is ruled out and not even representable (ClaudeModel = "sonnet" | "haiku").

import { invokeClaude, invokeClaudeJSON } from "./bedrock/claude"
import {
  COVER_LETTER_SYSTEM_PROMPT,
  type CoverLetterJob,
  type CoverLetterProfile,
  coverLetterPrompt,
} from "./prompts/cover-letter"
import {
  CV_SYSTEM_PROMPT,
  type CvJob,
  type CvUserProfile,
  cvGenerationPrompt,
} from "./prompts/cv-generation"
import { FOLLOW_UP_SYSTEM_PROMPT, type FollowUpJob, followUpPrompt } from "./prompts/follow-up"

// ── PII placeholder verification (pure, unit-tested) ──────────────────────────

/**
 * Placeholder tokens that MUST appear in a generated document. Their presence
 * is the cheap structural proof that the model used placeholders instead of
 * inventing personal data (the profile itself is already PII-free upstream).
 */
export const REQUIRED_PLACEHOLDER = "[Vorname Nachname]"

/** Patterns that must NEVER appear — they indicate leaked/invented PII shapes. */
const PII_PATTERNS: readonly RegExp[] = [
  // a real-looking email (the placeholder [email@placeholder.com] is exempted)
  /(?<!\[)[\w.+-]+@(?!placeholder\.com)[\w-]+\.[a-z]{2,}(?!\])/i,
  // a real-looking German phone number (placeholder [+49 xxx] is exempted)
  /\+49[ -]?\d{3,}/,
]

export type PlaceholderCheck = { ok: boolean; problems: string[] }

/**
 * Verify a generated document contains the name placeholder and no
 * real-looking contact data. Deterministic, no AI.
 */
export function verifyPlaceholders(doc: string): PlaceholderCheck {
  const problems: string[] = []
  if (!doc.includes(REQUIRED_PLACEHOLDER)) {
    problems.push(`missing required placeholder ${REQUIRED_PLACEHOLDER}`)
  }
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(doc)) {
      problems.push(`document matches PII pattern ${pattern}`)
    }
  }
  return { ok: problems.length === 0, problems }
}

// ── Document generation (Sonnet) ──────────────────────────────────────────────

export async function generateCV(args: {
  userProfile: CvUserProfile
  job: CvJob
  roleAnswers: Record<string, string>
}): Promise<string> {
  return invokeClaude({
    model: "sonnet",
    maxTokens: 2048,
    temperature: 0.3,
    system: CV_SYSTEM_PROMPT,
    prompt: cvGenerationPrompt(args),
  })
}

export async function generateCoverLetter(args: {
  userProfile: CoverLetterProfile
  job: CoverLetterJob
  roleAnswers: Record<string, string>
  cvContent: string
}): Promise<string> {
  const dateBerlin = new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })
  return invokeClaude({
    model: "sonnet",
    maxTokens: 1024,
    temperature: 0.3,
    system: COVER_LETTER_SYSTEM_PROMPT,
    prompt: coverLetterPrompt({ ...args, dateBerlin }),
  })
}

export async function generateFollowUp(args: {
  job: FollowUpJob
  daysSinceSubmission: number
}): Promise<string> {
  return invokeClaude({
    model: "sonnet",
    maxTokens: 512,
    temperature: 0.3,
    system: FOLLOW_UP_SYSTEM_PROMPT,
    prompt: followUpPrompt(args),
  })
}

// ── Role questions (Haiku — high-volume, cheap) ───────────────────────────────

export function roleQuestionsPrompt(jobTitle: string, jobDescription: string): string {
  return `Generate exactly 4 targeted questions to collect information for writing a strong Werkstudent CV and cover letter for this role.

Role: ${jobTitle}
Description: ${jobDescription.slice(0, 800)}

Rules:
- Question 1: Most relevant technical/domain project they've done
- Question 2: A specific skill from the job description to probe depth
- Question 3: Availability and time commitment
- Question 4: Motivation (kept short, 1–2 sentences expected)
- Keep questions short — max 15 words each
- In English (user is international)

Return JSON: {"questions": ["Q1", "Q2", "Q3", "Q4"]}`
}

export async function generateRoleQuestions(
  jobTitle: string,
  jobDescription: string,
): Promise<string[]> {
  const parsed = await invokeClaudeJSON<{ questions: string[] }>({
    model: "haiku",
    maxTokens: 512,
    prompt: roleQuestionsPrompt(jobTitle, jobDescription),
  })
  const questions = Array.isArray(parsed?.questions)
    ? parsed.questions.filter((q): q is string => typeof q === "string" && q.length > 0).slice(0, 4)
    : []
  if (questions.length === 0) {
    throw new Error("generateRoleQuestions: model returned no usable questions")
  }
  return questions
}
