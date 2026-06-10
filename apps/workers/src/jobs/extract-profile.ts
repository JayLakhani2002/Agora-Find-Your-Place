import { embedProfile, getObjectBuffer, invokeClaudeJSON } from "@agora/ai"
import { getDb, userProfiles } from "@agora/db"
import { eq } from "drizzle-orm"

export interface ExtractProfileJob {
  userId: string
  storageKey: string
}

/** Structured, PII-FREE profile the LLM is allowed to return. */
interface ExtractedProfile {
  skills: string[]
  experienceSummary: string
  educationSummary: string
}

// DATA MINIMIZATION IS THE LAW HERE — the prompt forbids extracting any PII.
const SYSTEM_PROMPT = `You extract structured, PRIVACY-SAFE data from a CV for a job-matching service.

Extract ONLY:
- skills (technologies, tools, languages, methods)
- job titles and a short experience SUMMARY (no employer names unless skill-relevant)
- education LEVEL and field of study (e.g. "MSc Data Science, German university, 2024–2026")

NEVER extract or output: full name, address, phone, email, ID/passport numbers,
nationality, photo, date of birth, marital status, or any other personal identifier.

Return ONLY valid JSON, no prose, in exactly this shape:
{"skills": string[], "experienceSummary": string, "educationSummary": string}`

async function extractCvText(buffer: Buffer): Promise<string> {
  // PDFs are the common case. unpdf is serverless-friendly (no native deps).
  const isPdf = buffer.subarray(0, 5).toString("latin1") === "%PDF-"
  if (isPdf) {
    // Dynamic import — unpdf is ESM-only; this keeps the worker's CommonJS build safe.
    const { extractText, getDocumentProxy } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractText(pdf, { mergePages: true })
    return text
  }
  // Fallback: treat as UTF-8 text (e.g. .txt). .docx is not supported in v1.
  return buffer.toString("utf-8")
}

/**
 * CV → structured profile. Downloads the CV from Scaleway, extracts text, asks Claude
 * (Sonnet, Bedrock EU) for a PII-free structured profile, embeds it (Cohere search_query),
 * and writes skills/summaries/embedding to the user's profile row.
 * Idempotent: enqueue with jobId `extract_profile_${userId}`.
 */
export async function extractProfile(job: ExtractProfileJob): Promise<void> {
  const { userId, storageKey } = job
  const db = getDb()

  const buffer = await getObjectBuffer(storageKey)
  const cvText = (await extractCvText(buffer)).slice(0, 12000) // cap prompt size
  if (!cvText.trim()) throw new Error(`extractProfile: no text extracted from ${storageKey}`)

  const extracted = await invokeClaudeJSON<ExtractedProfile>({
    model: "sonnet",
    system: SYSTEM_PROMPT,
    prompt: `CV CONTENT:\n\n${cvText}`,
    maxTokens: 1024,
  })

  const skills = Array.isArray(extracted.skills) ? extracted.skills.slice(0, 50) : []
  const experienceSummary = extracted.experienceSummary ?? ""
  const educationSummary = extracted.educationSummary ?? ""

  // Embed the PII-free summary as the search query over jobs.
  const embeddingText = [skills.join(", "), experienceSummary, educationSummary]
    .filter(Boolean)
    .join("\n")
  const profileEmbedding = await embedProfile(embeddingText)

  await db
    .update(userProfiles)
    .set({ skills, experienceSummary, educationSummary, profileEmbedding, updatedAt: new Date() })
    .where(eq(userProfiles.userId, userId))
}
