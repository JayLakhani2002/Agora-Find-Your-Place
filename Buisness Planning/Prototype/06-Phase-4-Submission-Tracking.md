# Agora Jobs — Phase 4: Assisted Submission & Application Tracking
**Document:** PROTO-006 · **Version:** 1.0  
**Duration:** Week 7–8  
**Depends on:** Phase 3 complete (application in `approved` state)  
**Output:** User submits their application on the employer's page (Mode 1) and tracks status in Agora

---

## 1. Goals

Phase 4 closes the core loop. After approving their documents:

1. User downloads their PDF documents
2. Agora opens the employer's application page (Mode 1)
3. User submits on the employer's site — **always a user action, never automated**
4. User marks as submitted in Agora → status becomes `submitted`
5. Tracker shows all applications with status pipeline
6. At day 10 of no response: Agora generates a follow-up email draft

**Critical constraint:** The server NEVER submits applications. There is no browser automation, no Playwright bot, no auto-fill POST request. Mode 1 = the employer's page opens in the user's browser; the user clicks Submit themselves.

---

## 2. Submission Helper (Mode 1)

### 2.1 The Handoff Screen

After approval, the user sees the "Submission Helper" screen:

```typescript
// apps/web/src/app/applications/[id]/submit/page.tsx

export function SubmissionHelper({ applicationId }: { applicationId: string }) {
  const { data: app } = trpc.applications.getDetails.useQuery({ applicationId })
  const markSubmitted = trpc.applications.markSubmitted.useMutation()
  const [step, setStep] = useState<"download" | "open" | "confirm">("download")

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-1">Submit your application</h1>
      <p className="text-muted-foreground mb-6">3 quick steps — you stay in control</p>

      {/* Step 1: Download documents */}
      <StepCard
        number={1}
        title="Download your documents"
        active={step === "download"}
        complete={step !== "download"}
      >
        <div className="space-y-2">
          <DownloadButton
            label="CV — Tabellarischer Lebenslauf.pdf"
            storageKey={app?.cvStorageKey}
            onDownload={() => {}}
          />
          <DownloadButton
            label="Cover Letter — Anschreiben.pdf"
            storageKey={app?.coverLetterStorageKey}
            onDownload={() => setStep("open")}
          />
        </div>
      </StepCard>

      {/* Step 2: Open employer page */}
      <StepCard
        number={2}
        title="Open the application page"
        active={step === "open"}
        complete={step === "confirm"}
      >
        <p className="text-sm text-muted-foreground mb-3">
          The employer&apos;s application form will open in a new tab.
          Upload your downloaded documents and fill in any form fields.
        </p>
        <button
          onClick={() => {
            window.open(app?.job.sourceUrl, "_blank", "noopener,noreferrer")
            setStep("confirm")
          }}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium"
        >
          Open {app?.job.company} Application →
        </button>
      </StepCard>

      {/* Step 3: Confirm submission */}
      <StepCard
        number={3}
        title="Confirm you submitted"
        active={step === "confirm"}
        complete={false}
      >
        <p className="text-sm text-muted-foreground mb-3">
          Once you&apos;ve clicked Submit on {app?.job.company}&apos;s site, come back here and confirm.
          We&apos;ll start tracking your application and remind you to follow up.
        </p>
        <button
          onClick={() => markSubmitted.mutate({ applicationId })}
          disabled={markSubmitted.isPending}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold"
        >
          {markSubmitted.isPending ? "Saving..." : "✓ I submitted it"}
        </button>
      </StepCard>
    </div>
  )
}
```

### 2.2 Mark Submitted Mutation

```typescript
// apps/web/src/server/routers/applications.ts

markSubmitted: protectedProcedure
  .input(z.object({ applicationId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const app = await ctx.db.query.applications.findFirst({
      where: and(
        eq(applications.id, input.applicationId),
        eq(applications.userId, ctx.user.id)
      ),
    })

    if (!app) throw new TRPCError({ code: "NOT_FOUND" })

    // ONLY allow transition from `approved` to `submitted`
    // This ensures the user approved the documents before claiming submission
    if (app.status !== "approved") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Application must be approved before marking as submitted",
      })
    }

    await ctx.db.update(applications)
      .set({
        status: "submitted",
        userSubmittedAt: new Date(),
        auditLog: [
          ...(app.auditLog as AuditEntry[]),
          {
            timestamp: new Date().toISOString(),
            action: "submitted_by_user",
            actor: "user",
            detail: "User confirmed manual submission on employer portal",
          },
        ],
        updatedAt: new Date(),
      })
      .where(eq(applications.id, input.applicationId))

    // Enqueue follow-up monitor (checks at day 10)
    await followUpQueue.add("schedule_followup_check", {
      applicationId: input.applicationId,
      userId: ctx.user.id,
    }, {
      jobId: `followup_${input.applicationId}`,
      delay: 10 * 24 * 60 * 60 * 1000,   // 10 days in ms
      removeOnComplete: true,
    })
  }),
```

---

## 3. Application Tracker

### 3.1 Tracker Screen

```typescript
// apps/web/src/app/tracker/page.tsx

const STATUS_CONFIG = {
  generated:        { label: "Documents Ready",    color: "blue",   icon: "📄" },
  approved:         { label: "Ready to Submit",    color: "amber",  icon: "✅" },
  submitted:        { label: "Applied",            color: "emerald", icon: "📨" },
  interview_invited: { label: "Interview!",        color: "purple", icon: "🎉" },
  offer_received:   { label: "Offer Received",     color: "green",  icon: "🏆" },
  rejected:         { label: "Not Selected",       color: "gray",   icon: "❌" },
  withdrawn:        { label: "Withdrawn",          color: "gray",   icon: "↩️" },
} as const

export function TrackerScreen() {
  const { data: applications } = trpc.applications.list.useQuery()

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Your Applications</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Applied" value={applications?.filter(a => a.status === "submitted").length ?? 0} />
        <StatCard label="In Review" value={applications?.filter(a => a.status === "submitted").length ?? 0} />
        <StatCard label="Interviews" value={applications?.filter(a => a.status === "interview_invited").length ?? 0} />
        <StatCard label="Offers" value={applications?.filter(a => a.status === "offer_received").length ?? 0} />
      </div>

      {/* Application list */}
      <div className="space-y-3">
        {applications?.map((app) => (
          <ApplicationCard key={app.id} application={app} />
        ))}
        {applications?.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No applications yet. Go find your first role →
          </p>
        )}
      </div>
    </div>
  )
}

function ApplicationCard({ application }: { application: Application }) {
  const config = STATUS_CONFIG[application.status]
  const daysSinceSubmit = application.userSubmittedAt
    ? Math.floor((Date.now() - new Date(application.userSubmittedAt).getTime()) / 86400000)
    : null

  return (
    <div className="border rounded-xl p-4 bg-card">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{application.job.title}</h3>
          <p className="text-sm text-muted-foreground">{application.job.company}</p>
        </div>
        <Badge className={`bg-${config.color}-50 text-${config.color}-700 border-${config.color}-200`}>
          {config.icon} {config.label}
        </Badge>
      </div>

      {/* Days counter */}
      {daysSinceSubmit !== null && application.status === "submitted" && (
        <p className="text-xs text-muted-foreground mt-2">
          Applied {daysSinceSubmit} day{daysSinceSubmit !== 1 ? "s" : ""} ago
          {daysSinceSubmit >= 10 && " · Follow-up ready ↓"}
        </p>
      )}

      {/* Follow-up draft if available */}
      {application.followUpDraft && (
        <FollowUpDraftCard draft={application.followUpDraft} />
      )}

      {/* Status update buttons */}
      {application.status === "submitted" && (
        <div className="flex gap-2 mt-3">
          <StatusUpdateButton applicationId={application.id} newStatus="interview_invited" label="Got interview" />
          <StatusUpdateButton applicationId={application.id} newStatus="rejected" label="Rejected" />
        </div>
      )}
    </div>
  )
}
```

---

## 4. Follow-Up Draft Generation

### 4.1 BullMQ Worker (triggered at day 10)

```typescript
// apps/workers/src/jobs/generate-followup.ts

const FOLLOWUP_PROMPT = ({
  applicantName: string   // from profile placeholder — never real PII in prompt
  jobTitle: string
  company: string
  daysSinceApply: number
  originalCoverLetterExcerpt: string
}) => `
Write a professional follow-up email for a Werkstudent job application in German.

Context:
- Position: ${jobTitle} at ${company}
- Applied ${daysSinceApply} days ago
- Original application excerpt: "${originalCoverLetterExcerpt.slice(0, 200)}"

Rules:
1. Max 3 sentences — short is professional in German business culture
2. Polite, not pushy. The tone is "friendly reminder", not "please respond"
3. Reference the role title specifically so they know which application
4. Close with availability to discuss
5. Language: German, formal "Sie"
6. Start with: "Sehr geehrte Damen und Herren," (if no specific contact known)

Return ONLY the email body text, no subject line, no "Subject:" prefix.
`

export async function generateFollowUp(applicationId: string) {
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
    with: { job: true, user: true },
  })

  if (!app || app.status !== "submitted") return   // user already heard back

  const daysSince = Math.floor(
    (Date.now() - new Date(app.userSubmittedAt!).getTime()) / 86400000
  )

  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId: process.env.CLAUDE_SONNET_MODEL_ID!,
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: FOLLOWUP_PROMPT({
          applicantName: "[Vorname Nachname]",
          jobTitle: app.job.title,
          company: app.job.company,
          daysSinceApply: daysSince,
          originalCoverLetterExcerpt: "",   // could pass excerpt if stored
        }),
      }],
    }),
    contentType: "application/json",
    accept: "application/json",
  }))

  const draftText = /* parse */ ""

  await db.insert(followUpDrafts).values({
    applicationId,
    draftText,
  })

  // Notify user (push notification stub — add later)
}
```

### 4.2 Follow-Up Card in Tracker

```typescript
function FollowUpDraftCard({ draft }: { draft: FollowUpDraft }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
      <p className="text-xs font-semibold text-blue-700 mb-2">
        Follow-up draft ready — review and send from your email client
      </p>
      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
        {draft.draftText}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(draft.draftText)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        className="mt-2 text-xs text-blue-600 underline"
      >
        {copied ? "Copied!" : "Copy to clipboard"}
      </button>
    </div>
  )
}
```

---

## 5. Status Update Flow

Users self-report status changes (interview invited, rejected, offer):

```typescript
updateStatus: protectedProcedure
  .input(z.object({
    applicationId: z.string(),
    newStatus: z.enum(["interview_invited", "rejected", "offer_received", "withdrawn"]),
  }))
  .mutation(async ({ ctx, input }) => {
    const app = await ctx.db.query.applications.findFirst({
      where: and(
        eq(applications.id, input.applicationId),
        eq(applications.userId, ctx.user.id)
      ),
    })
    if (!app) throw new TRPCError({ code: "NOT_FOUND" })

    // Valid transitions only
    const validTransitions: Record<string, string[]> = {
      submitted: ["interview_invited", "rejected", "withdrawn"],
      interview_invited: ["offer_received", "rejected", "withdrawn"],
    }
    if (!validTransitions[app.status]?.includes(input.newStatus)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid status transition" })
    }

    await ctx.db.update(applications)
      .set({
        status: input.newStatus,
        auditLog: [
          ...(app.auditLog as AuditEntry[]),
          {
            timestamp: new Date().toISOString(),
            action: `status_updated_to_${input.newStatus}`,
            actor: "user",
          },
        ],
        updatedAt: new Date(),
      })
      .where(eq(applications.id, input.applicationId))

    // If interview: enqueue interview prep generation
    if (input.newStatus === "interview_invited") {
      await generationQueue.add("generate_interview_prep", {
        applicationId: input.applicationId,
      }, { jobId: `interviewprep_${input.applicationId}` })
    }
  }),
```

---

## 6. Interview Prep (Bonus — if time allows)

When status becomes `interview_invited`, generate a prep package:

```typescript
const INTERVIEW_PREP_PROMPT = (job: Job, userProfile: UserProfile) => `
Generate an interview preparation package for a Werkstudent interview.

Role: ${job.title} at ${job.company}
Candidate skills: ${userProfile.skills.join(", ")}

Create:
1. Company brief (3 bullet points — what they do, stage, culture signals from job description)
2. 8 likely interview questions for this role (mix: behavioral + technical)
3. For each question: a STAR-method answer skeleton using the candidate's actual experience
4. 3 technical topics to brush up on based on the job description
5. German interview etiquette tips (1 paragraph — punctuality, Siezen, etc.)

Format as structured markdown.
`
```

---

## 7. GDPR Erasure Stub (Required Before Beta)

This must exist before any real user data is collected:

```typescript
// apps/web/src/server/routers/gdpr.ts

deleteAccount: protectedProcedure
  .mutation(async ({ ctx }) => {
    // 1. Delete from Clerk
    await clerkClient.users.deleteUser(ctx.user.clerkId)

    // 2. Delete from Scaleway S3 (all user documents)
    const docs = await ctx.db.query.userDocuments.findMany({
      where: eq(userDocuments.userId, ctx.user.id),
    })
    await Promise.all(docs.map((d) => deleteFromS3(d.storageKey)))

    // Also delete generated CV/CL files
    const apps = await ctx.db.query.applications.findMany({
      where: eq(applications.userId, ctx.user.id),
    })
    await Promise.all(
      apps.flatMap((a) => [
        a.cvStorageKey ? deleteFromS3(a.cvStorageKey) : Promise.resolve(),
        a.coverLetterStorageKey ? deleteFromS3(a.coverLetterStorageKey) : Promise.resolve(),
      ])
    )

    // 3. Cascade delete from Postgres (FK cascades handle most of it)
    await ctx.db.delete(users).where(eq(users.id, ctx.user.id))

    // Audit: log erasure request timestamp (anonymized — no PII)
    // Store only: { erasure_requested_at, completed_at } — no user identifiers
  }),
```

---

## 8. Definition of Done (Phase 4)

- [ ] After approval, Submission Helper shows 3-step flow
- [ ] "Open Application Page" opens employer URL in new tab (not same tab)
- [ ] "I submitted it" button only works if status is `approved` (server enforces)
- [ ] Status transitions from `approved` → `submitted` with audit log entry
- [ ] Tracker shows all applications with correct status badges
- [ ] Days counter displays on submitted applications
- [ ] Follow-up draft generated at exactly day 10 (BullMQ delayed job)
- [ ] Follow-up draft visible in tracker with copy-to-clipboard
- [ ] User can update status to `interview_invited` / `rejected`
- [ ] GDPR erasure endpoint deletes all PII from S3, Postgres, and Clerk
- [ ] Full end-to-end test: sign up → profile → swipe → generate → approve → submit → track
- [ ] Audit log shows complete trail: created → generated → approved → submitted
