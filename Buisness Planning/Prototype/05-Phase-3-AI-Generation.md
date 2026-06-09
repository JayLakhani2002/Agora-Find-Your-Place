# Agora Jobs — Phase 3: AI Document Generation & Quality Eval
**Document:** PROTO-005 · **Version:** 1.0  
**Duration:** Week 5–7  
**Depends on:** Phase 2 complete  
**Output:** User right-swipes a job, answers 4 questions, receives AI-generated CV + Cover Letter with quality scores

---

## 1. Goals

Phase 3 is the core product differentiator. After a right-swipe:

1. User answers 4 role-specific questions (2–3 minutes)
2. Claude Sonnet generates a Tabellarischer Lebenslauf CV + German Cover Letter simultaneously
3. A 6-dimension quality evaluator scores both documents
4. If any score < 8.0, auto-regeneration triggers (up to 2 retries)
5. User reviews the documents in a 3-tab interface (CV / Cover Letter / Pre-fills)
6. User approves — application moves to `approved` state

---

## 2. Generation Architecture

```
Right Swipe + Role Questions
        │
        ▼
BullMQ: ai-generation queue
        │
        ▼
Worker: generate_documents job
        │
   ┌────┴────────────────┐
   │                     │
   ▼                     ▼
Generate CV          Generate Cover Letter
(Claude Sonnet)      (Claude Sonnet)
   │                     │
   └────────┬────────────┘
            │
            ▼
   Quality Eval (Claude Haiku x6 dimensions)
            │
     ┌──────┴──────┐
     │             │
  Score ≥ 8.0   Score < 8.0
     │             │
     ▼             ▼
  Save to S3   Regenerate (max 2 retries)
     │
     ▼
  Notify user (polling / websocket)
     │
     ▼
  User review screen
```

---

## 3. Role-Specific Questions (Post-Swipe)

After right-swipe, show 4 questions. These are dynamically generated per role, then cached:

```typescript
// apps/workers/src/jobs/generate-questions.ts
const QUESTIONS_PROMPT = (jobTitle: string, jobDescription: string) => `
Generate exactly 4 targeted questions to collect information for writing a strong Werkstudent CV and cover letter for this role.

Role: ${jobTitle}
Description: ${jobDescription.slice(0, 800)}

Rules:
- Question 1: Most relevant technical/domain project they've done
- Question 2: A specific skill from the job description to probe depth
- Question 3: Availability and time commitment
- Question 4: Motivation (kept short, 1–2 sentences expected)
- Keep questions short — max 15 words each
- In English (user is international)

Return JSON: {"questions": ["Q1", "Q2", "Q3", "Q4"]}
`
```

---

## 4. CV Generation Prompt (Tabellarischer Lebenslauf)

This is the most critical prompt in the system. It must produce ATS-passable German CVs.

`packages/ai/src/prompts/cv-generation.ts`:

```typescript
export const CV_GENERATION_PROMPT = ({
  userProfile,
  job,
  roleAnswers,
}: {
  userProfile: {
    skills: string[]
    experienceSummary: string
    educationSummary: string
    germanLevel: string
  }
  job: {
    title: string
    company: string
    description: string
    requiredSkills: string[]
  }
  roleAnswers: Record<string, string>
}) => `
You are a professional German job application writer specializing in Werkstudent CVs for international students.

Write a Tabellarischer Lebenslauf (German tabular CV) following STRICT German ATS conventions.

## Candidate Profile
Skills: ${userProfile.skills.join(", ")}
Experience: ${userProfile.experienceSummary}
Education: ${userProfile.educationSummary}
German level: ${userProfile.germanLevel}

## Target Role
Company: ${job.company}
Position: ${job.title}
Required skills: ${job.requiredSkills.join(", ")}
Job description: ${job.description.slice(0, 1000)}

## Candidate's Answers to Role Questions
${Object.entries(roleAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")}

## Mandatory German CV Format Rules
1. LANGUAGE: German throughout. Exception: technical terms stay in English (Python, React, etc.)
2. DATES: Always MM/YYYY format (e.g., "06/2024 – 08/2024"). Never "June 2024" or "2024-06"
3. SECTION ORDER: Persönliche Daten → Ausbildung → Berufserfahrung → Kenntnisse → Sprachen → Hobbys (optional)
4. LENGTH: Maximum 1.5 pages — be concise. German recruiters do not read long CVs
5. BERUFSERFAHRUNG: Reverse chronological. Max 3 bullet points per role in past tense
6. WERKSTUDENT HEADER: Start Ausbildung section with current university enrollment
7. KENNTNISSE: Separate into "Programmierung:", "Frameworks:", "Tools:", "Methoden:"
8. SPRACHKENNTNISSE: German + English levels (use "Muttersprache", "C1 Zertifiziert", "B1 – Grundkenntnisse")
9. PHOTOGRAPH: Include placeholder "[Foto]" — user will add their own
10. NO PERSONAL DATA IN GENERATION: Use placeholder "[Vorname Nachname]", "[Adresse]", "[E-Mail]", "[Telefon]"

## ATS Keyword Rules
- Mirror exact keywords from the job description where factually accurate
- Place most important keywords in the first 50% of the document
- Do not invent experience or skills the candidate did not mention

## Critical: Personal Data Placeholders
NEVER generate a real name, address, phone number, email, or nationality.
Use ONLY these placeholders: [Vorname Nachname], [Straße, PLZ Berlin], [email@placeholder.com], [+49 xxx]
The user will fill in their personal details in the review screen.

Output the CV as clean markdown with clear section headers. Do not include HTML or LaTeX.
`
```

---

## 5. Cover Letter Generation Prompt

`packages/ai/src/prompts/cover-letter.ts`:

```typescript
export const COVER_LETTER_PROMPT = ({
  userProfile,
  job,
  roleAnswers,
  cvContent,
}: {
  userProfile: { skills: string[]; experienceSummary: string; germanLevel: string }
  job: { title: string; company: string; description: string; sourceUrl: string }
  roleAnswers: Record<string, string>
  cvContent: string   // Generated CV for consistency
}) => `
Write a German Anschreiben (cover letter) for a Werkstudent application.

## Role
Position: ${job.title}
Company: ${job.company}

## Candidate
${userProfile.experienceSummary}
Skills: ${userProfile.skills.join(", ")}
German level: ${userProfile.germanLevel}
Role answers: ${JSON.stringify(roleAnswers)}

## Format Rules
1. LANGUAGE: German. Formal "Sie" form throughout
2. HEADER: [Vorname Nachname] | [Adresse] | [E-Mail] | [Telefon] | Berlin, ${new Date().toLocaleDateString("de-DE")}
3. RECIPIENT: ${job.company} | [Ansprechpartner, falls bekannt] | [Firmenadresse]
4. BETREFF: "Bewerbung als Werkstudent/in – ${job.title}"
5. OPENING: Do NOT use "Hiermit bewerbe ich mich" — this is a cliché. Start with a specific hook
6. BODY: Max 3 paragraphs:
   - Why this company specifically (reference something real from their job description)  
   - Relevant skills/projects aligned to their needs
   - Availability: "Ich stehe ab [Datum] für max. 20 Stunden pro Woche zur Verfügung"
7. CLOSING: "Mit freundlichen Grüßen" + placeholder [Vorname Nachname]
8. LENGTH: Max 350 words. German recruiters stop reading at 400
9. TONE: Match to company stage — if startup: direct and enthusiastic. If corporate: formal and structured

## Critical: No invented facts
Only reference skills, projects, and experience from the candidate answers above.
`
```

---

## 6. Quality Evaluation (6 Dimensions)

Each dimension is scored by Claude Haiku with a strict 0–10 rubric. All 6 run in parallel.

```typescript
// packages/ai/src/eval.ts

type EvalDimension = "ats" | "keywords" | "factual" | "format" | "tone" | "language"

const EVAL_PROMPTS: Record<EvalDimension, (doc: string, jobDesc: string) => string> = {
  ats: (doc, job) => `
Score 0-10: How well will this CV parse through German ATS systems (Softgarden, Personio, d.vinci)?
Check: standard section names, date format MM/YYYY, no tables/columns (ATS can't parse), no photos embedded as images, keywords present.
Document:\n${doc.slice(0, 2000)}\nJob:\n${job.slice(0, 500)}
Return JSON: {"score": 8.5, "issues": ["date format inconsistent on line 3"]}
`,
  keywords: (doc, job) => `
Score 0-10: How many required job keywords appear in the CV?
Required skills from job: ${job.slice(0, 500)}
Document:\n${doc.slice(0, 2000)}
Return JSON: {"score": 7.0, "missing_keywords": ["FastAPI", "Docker"], "present_keywords": ["Python", "SQL"]}
`,
  factual: (doc, _) => `
Score 0-10: Are all claims in this document factually consistent with no contradictions?
Check: no impossible date overlaps, no implausible skill levels, no invented company names.
Document:\n${doc.slice(0, 2000)}
Return JSON: {"score": 10.0, "issues": []}
`,
  format: (doc, _) => `
Score 0-10: Does this document follow German Tabellarischer Lebenslauf format conventions?
Check: section order (Persönliche Daten → Ausbildung → Berufserfahrung), reverse chronological, date format, max 1.5 pages length estimate, no "Lebenslauf" title at top (redundant in German CVs).
Document:\n${doc.slice(0, 2000)}
Return JSON: {"score": 9.0, "issues": []}
`,
  tone: (doc, job) => `
Score 0-10: Is the tone appropriate for this company and role?
Job context:\n${job.slice(0, 300)}
Document (cover letter):\n${doc.slice(0, 1000)}
Check: formal "Sie" form, no clichés like "hiermit bewerbe ich mich", professional but not stiff for startups.
Return JSON: {"score": 8.5, "issues": []}
`,
  language: (doc, _) => `
Score 0-10: Quality of German writing — grammar, spelling, natural phrasing.
Note: technical English terms (Python, React) are expected and correct.
Document:\n${doc.slice(0, 2000)}
Return JSON: {"score": 9.0, "issues": ["awkward phrasing in paragraph 2"]}
`,
}

export async function evaluateDocument(
  document: string,
  jobDescription: string,
  dimensions: EvalDimension[] = ["ats", "keywords", "factual", "format", "tone", "language"]
): Promise<Record<EvalDimension, { score: number; issues: string[] }>> {
  // All 6 dimensions run in parallel
  const results = await Promise.all(
    dimensions.map(async (dim) => {
      const response = await bedrockClient.send(new InvokeModelCommand({
        modelId: process.env.CLAUDE_HAIKU_MODEL_ID!,
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 256,
          messages: [{ role: "user", content: EVAL_PROMPTS[dim](document, jobDescription) }],
        }),
        contentType: "application/json",
        accept: "application/json",
      }))
      const parsed = JSON.parse(/* stream decode */response.body.toString())
      const content = JSON.parse(parsed.content[0].text)
      return [dim, { score: content.score, issues: content.issues ?? [] }] as const
    })
  )

  return Object.fromEntries(results) as Record<EvalDimension, { score: number; issues: string[] }>
}

export function computeOverallScore(
  scores: Record<EvalDimension, { score: number }>
): number {
  const weights: Record<EvalDimension, number> = {
    ats: 0.25,        // most important — determines if it gets read
    keywords: 0.20,
    factual: 0.20,
    format: 0.15,
    tone: 0.10,
    language: 0.10,
  }
  return Object.entries(weights).reduce((sum, [dim, weight]) => {
    return sum + (scores[dim as EvalDimension]?.score ?? 0) * weight
  }, 0)
}
```

### 6.1 Auto-Regeneration Logic

```typescript
// apps/workers/src/jobs/generate-documents.ts
const MAX_RETRIES = 2

export async function generateDocuments(applicationId: string) {
  const application = await db.query.applications.findFirst(...)
  let attempt = 0

  while (attempt <= MAX_RETRIES) {
    attempt++

    // Generate CV + Cover Letter in parallel
    const [cv, coverLetter] = await Promise.all([
      generateCV({ profile, job, roleAnswers }),
      generateCoverLetter({ profile, job, roleAnswers }),
    ])

    // Evaluate both documents
    const [cvEval, clEval] = await Promise.all([
      evaluateDocument(cv, job.description),
      evaluateDocument(coverLetter, job.description, ["ats", "keywords", "tone", "language"]),
    ])

    const cvOverall = computeOverallScore(cvEval)
    const clOverall = computeOverallScore(clEval)

    if (cvOverall >= 8.0 && clOverall >= 8.0) {
      // Save to S3 and update DB
      const [cvKey, clKey] = await Promise.all([
        uploadToS3(`applications/${applicationId}/cv-v${attempt}.md`, cv),
        uploadToS3(`applications/${applicationId}/cl-v${attempt}.md`, coverLetter),
      ])

      await db.update(applications)
        .set({
          cvStorageKey: cvKey,
          coverLetterStorageKey: clKey,
          evalScoreAts: cvEval.ats.score,
          evalScoreKeywords: cvEval.keywords.score,
          evalScoreFactual: cvEval.factual.score,
          evalScoreFormat: cvEval.format.score,
          evalScoreTone: clEval.tone.score,
          evalScoreLanguage: clEval.language.score,
          evalScoreOverall: cvOverall,
          generationStatus: "complete",
          status: "generated",
        })
        .where(eq(applications.id, applicationId))

      return { success: true, attempt }
    }

    if (attempt > MAX_RETRIES) {
      // Use best attempt even if below threshold
      await db.update(applications)
        .set({ generationStatus: "complete", status: "generated" })
        .where(eq(applications.id, applicationId))
    }
  }
}
```

---

## 7. User Review Screen

3-tab interface: CV / Cover Letter / Pre-fills

```typescript
// apps/web/src/app/applications/[id]/review/page.tsx
// Key interaction: user can edit any field inline before approving

export function ReviewScreen({ applicationId }: { applicationId: string }) {
  const { data } = trpc.applications.getWithDocuments.useQuery({ applicationId })
  const approve = trpc.applications.approve.useMutation()

  // Score display component
  const ScoreBar = ({ label, score }: { label: string; score: number }) => (
    <div className="flex items-center gap-3">
      <span className="text-sm w-24 text-muted-foreground">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className="text-sm font-mono font-medium">{score.toFixed(1)}</span>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Quality scores panel */}
      <div className="bg-card rounded-xl border p-4 mb-6">
        <h3 className="font-semibold mb-3">Quality Assessment</h3>
        <div className="space-y-2">
          <ScoreBar label="ATS Parse" score={data?.evalScoreAts ?? 0} />
          <ScoreBar label="Keywords" score={data?.evalScoreKeywords ?? 0} />
          <ScoreBar label="Factual" score={data?.evalScoreFactual ?? 0} />
          <ScoreBar label="Format" score={data?.evalScoreFormat ?? 0} />
          <ScoreBar label="Tone" score={data?.evalScoreTone ?? 0} />
          <ScoreBar label="Language" score={data?.evalScoreLanguage ?? 0} />
          <div className="pt-2 border-t">
            <ScoreBar label="Overall" score={data?.evalScoreOverall ?? 0} />
          </div>
        </div>
      </div>

      {/* Document tabs */}
      <Tabs defaultValue="cv">
        <TabsList className="w-full">
          <TabsTrigger value="cv" className="flex-1">CV</TabsTrigger>
          <TabsTrigger value="cover-letter" className="flex-1">Cover Letter</TabsTrigger>
          <TabsTrigger value="prefills" className="flex-1">Pre-fills</TabsTrigger>
        </TabsList>
        <TabsContent value="cv">
          <DocumentEditor content={data?.cvContent} />
        </TabsContent>
        <TabsContent value="cover-letter">
          <DocumentEditor content={data?.coverLetterContent} />
        </TabsContent>
        <TabsContent value="prefills">
          <PrefillsView job={data?.job} />
        </TabsContent>
      </Tabs>

      {/* Approve button — triggers state transition */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800 mb-3">
          By approving, you confirm these documents accurately represent your profile. 
          You will then submit them directly on the employer&apos;s application page.
        </p>
        <button
          onClick={() => approve.mutate({ applicationId })}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold"
        >
          Approve & Continue to Submission →
        </button>
      </div>
    </div>
  )
}
```

---

## 8. tRPC Application Router

```typescript
export const applicationsRouter = router({
  create: protectedProcedure
    .input(z.object({
      jobId: z.string(),
      roleAnswers: z.record(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const [app] = await ctx.db.insert(applications).values({
        userId: ctx.user.id,
        jobId: input.jobId,
        status: "generated",
        generationStatus: "pending",
        auditLog: [{ timestamp: new Date().toISOString(), action: "created", actor: "user" }],
      }).returning()

      await generationQueue.add("generate_documents", {
        applicationId: app!.id,
        roleAnswers: input.roleAnswers,
      }, {
        jobId: `gen_${app!.id}`,   // idempotent
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      })

      return { applicationId: app!.id }
    }),

  approve: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const app = await ctx.db.query.applications.findFirst({
        where: and(
          eq(applications.id, input.applicationId),
          eq(applications.userId, ctx.user.id)
        ),
      })
      if (!app) throw new TRPCError({ code: "NOT_FOUND" })
      if (app.generationStatus !== "complete") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Generation not complete" })
      }

      await ctx.db.update(applications)
        .set({
          status: "approved",
          userApprovedAt: new Date(),
          auditLog: [
            ...(app.auditLog as AuditEntry[]),
            { timestamp: new Date().toISOString(), action: "approved_by_user", actor: "user" },
          ],
        })
        .where(eq(applications.id, input.applicationId))
    }),
})
```

---

## 9. Definition of Done (Phase 3)

- [ ] Right-swipe triggers role questions screen
- [ ] 4 dynamic questions generated per job (or served from cache on second request)
- [ ] CV generated in Tabellarischer Lebenslauf format with German section headers
- [ ] Cover Letter generated in German with proper "Sie" form and no clichés
- [ ] No PII in generated documents — only placeholders for name/address/contact
- [ ] All 6 eval dimensions score in parallel (< 15 seconds total generation time)
- [ ] Auto-regeneration triggers when any score < 8.0 (tested with deliberately bad prompt)
- [ ] Overall score displayed on review screen with color-coded bars
- [ ] User can edit document content inline before approving
- [ ] "Approve" button transitions status to `approved` with audit log entry
- [ ] ATS parse rate tested against Softgarden's public test uploader: ≥ 85% parse rate
