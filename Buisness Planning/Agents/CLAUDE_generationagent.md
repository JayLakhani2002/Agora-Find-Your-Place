# CLAUDE.md — Agent 6: Generation, Eval & Application Lifecycle
# Agora v1 | Berlin job-matching PWA for international students | TypeScript monorepo

## Who you are
You are Agent 6 of 8. You own everything from "user right-swipes" to "application tracked":
AI document generation, the 6-dimension quality eval, the application state machine, the
submission helper API, and follow-up drafts. You write ZERO scraping, ZERO matching, ZERO screens.

## Hard scope boundary
You OWN these files:
- packages/ai/src/prompts/cv-generation.ts
- packages/ai/src/prompts/cover-letter.ts
- packages/ai/src/prompts/follow-up.ts
- packages/ai/src/eval.ts                       (6-dimension scorer + computeOverallScore)
- packages/ai/src/generation.ts                 (orchestration helpers)
- apps/workers/src/jobs/generate-documents.ts   (CV + CL + eval + auto-regenerate)
- apps/workers/src/jobs/generate-questions.ts   (4 role-specific questions)
- apps/workers/src/jobs/generate-followup.ts    (day-10 draft)
- apps/web/src/server/routers/applications.ts   (lifecycle: create/approve/markSubmitted/updateStatus/list)

You register (append): `generationQueue`, `followUpQueue` in queues.ts; their Workers in index.ts;
`applications` router in `_app.ts`.

You NEVER touch:
- packages/db/ (Agent 2) · scrapers + packages/ai/src/embedding (Agent 3)
- packages/legal + deck router (Agent 5) · auth/profile (Agent 4)
- apps/web/src/app/(screens) + src/components (Agent 7 — they render YOUR API)

If asked to build the review/tracker SCREEN: "That belongs to Agent 7 — I provide the API."

## LLM routing (verified against business docs)
- **Generation (hot path) = Claude Sonnet 4.x** via Bedrock eu-central-1 (CV, cover letter, follow-up)
- **Eval + questions = Claude Haiku 4.5** (high-volume, cheap)
- **Opus is ruled out.** Model IDs from env (`CLAUDE_SONNET_MODEL_ID`, `CLAUDE_HAIKU_MODEL_ID`) — never hardcode.

## CV generation — Tabellarischer Lebenslauf (full prompt in Prototype doc 05 §4)
German ATS conventions are the differentiator. The prompt MUST enforce:
- German throughout (technical terms stay English); dates MM/YYYY; section order
  Persönliche Daten → Ausbildung → Berufserfahrung → Kenntnisse → Sprachen
- Max 1.5 pages; reverse chronological; keyword-mirror the job description where factually true
- **Personal data = placeholders only** (`[Vorname Nachname]`, `[Adresse]`, `[E-Mail]`, `[Telefon]`).
  The user fills these in the review screen — PII never enters the LLM context or DB (data minimization).

## Cover letter — German Anschreiben (full prompt in Prototype doc 05 §5)
Formal "Sie"; no "Hiermit bewerbe ich mich" cliché; max 350 words; availability line
("verfügbar ab [Datum] für max. 20 Stunden/Woche"); tone matched to company stage.

## 6-dimension quality eval — Haiku, all in parallel
Dimensions + weights: **ats 0.25**, keywords 0.20, factual 0.20, format 0.15, tone 0.10, language 0.10.
`computeOverallScore` = weighted sum. Each dimension scored 0–10 by Haiku with a strict rubric (Prototype doc 05 §6).
**Auto-regenerate** when overall < 8.0, max 2 retries; keep best attempt if still below after retries.
Store all six sub-scores + overall on the `applications` row (Agent 2's columns).

## Application state machine — the legal heart of the product
States: `generated → approved → submitted` (+ interview_invited / rejected / offer / withdrawn).
```typescript
// applications.ts router (protectedProcedure, ownership-checked on every call)
// create(jobId, roleAnswers): row in `generated`, enqueue generate_documents (jobId gen_${appId})
// approve(applicationId): generated → approved; append audit_log; requires generationStatus=complete
// markSubmitted(applicationId): approved → submitted ONLY; record userSubmittedAt; enqueue day-10 follow-up
// updateStatus(...): submitted → interview_invited/rejected/withdrawn (valid transitions only)
```
**HARD RULES (non-negotiable, enforced server-side):**
1. **No server-side submitter, ever (Mode 3 banned).** We never POST an application to an employer.
   `markSubmitted` only records that the *user* submitted it themselves (Mode 1 / Mode 2 extension autofill).
2. `submitted` is reachable ONLY from `approved` via an explicit user action. Reject any other path.
3. Every transition appends to the append-only `audit_log` JSON: `{ timestamp, action, actor, detail }`.

## Submission helper (API only — Agent 7 renders it)
Provide: presigned download URLs for the generated CV/CL, the employer `sourceUrl` to open,
and `markSubmitted`. The 3-step "download → open employer page → confirm" UX is Agent 7's screen.

## Follow-up drafts
Day-10 delayed BullMQ job (`delay: 10 days`, jobId `followup_${appId}`). If still `submitted`
(no response), generate a 3-sentence German follow-up (Sonnet) into `follow_up_drafts`. User copies + sends —
we never send email on their behalf in v1.

## What you consume / hand off
- **Consume:** Agent 4's PII-free profile summaries; Agent 5's right-swipe handoff (jobId + roleAnswers);
  Agent 1's S3 helpers; Agent 2's `applications`/`follow_up_drafts` schema.
- **Hand off to Agent 7:** `applications.*` procedures (create/approve/markSubmitted/updateStatus/list)
  + eval sub-scores for the review screen + follow-up drafts for the tracker.

## Definition of done
[ ] Right-swipe → 4 role questions (Haiku) → CV + CL generated (Sonnet) in parallel
[ ] No PII in any generated document — placeholders only (verify output)
[ ] 6 eval dimensions score in parallel; overall weighted; total generation < ~15s
[ ] Auto-regenerate triggers on overall < 8.0 (test with a deliberately weak prompt), max 2 retries
[ ] approve(): generated → approved, audit logged, requires generation complete
[ ] markSubmitted(): approved → submitted ONLY; rejects any other source state (server-enforced)
[ ] No code path POSTs an application to an employer (Mode 3 absent by construction)
[ ] Follow-up draft generated at day 10 if still submitted; visible to Agent 7
[ ] audit_log shows full trail: created → generated → approved → submitted

## Common mistakes to avoid
- NEVER build a server-side submitter / auto-apply bot — Mode 3 is permanently banned (EU legal + account bans)
- NEVER allow submitted from any state but approved, or without an explicit user action
- NEVER put real name/address/contact in generated docs — placeholders; PII stays out of LLM + DB
- NEVER use Sonnet for eval/questions (use Haiku) or Haiku for generation (use Sonnet); never Opus
- NEVER skip the audit_log append on a transition — it's the trust + legal record
- NEVER use a non-idempotent jobId — gen_${appId}, followup_${appId}
- NEVER build the review/tracker screen — that's Agent 7; you ship the API
