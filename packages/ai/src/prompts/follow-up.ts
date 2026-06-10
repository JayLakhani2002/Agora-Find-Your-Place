// Agent 6 — day-10 follow-up draft prompt (Sonnet).
// 3 sentences, German, polite nudge. The user copies and sends it themselves —
// we NEVER send email on their behalf in v1.

export type FollowUpJob = {
  title: string
  company: string
}

export const FOLLOW_UP_SYSTEM_PROMPT =
  "You write short, polite German follow-up messages for job applications. " +
  "Exactly 3 sentences. No personal data — placeholders only."

export function followUpPrompt({
  job,
  daysSinceSubmission,
}: {
  job: FollowUpJob
  daysSinceSubmission: number
}): string {
  return `Write a follow-up message for a Werkstudent application that has had no response.

Position: ${job.title}
Company: ${job.company}
Days since submission: ${daysSinceSubmission}

Rules:
1. German, formal "Sie" form
2. EXACTLY 3 sentences: (1) reference the application and date, (2) reaffirm interest with one concrete reason, (3) politely ask about the status
3. Sign-off "Mit freundlichen Grüßen" + placeholder [Vorname Nachname]
4. Use placeholder [Datum] for the submission date — the user fills it in
5. No begging, no pressure, no "ich wollte nur kurz nachfragen" filler

Output plain text only.`
}
