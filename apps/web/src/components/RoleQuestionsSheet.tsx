"use client"

import { trpc } from "@/lib/trpc/client"
import { Button, Spinner } from "@agora/ui"
import { X } from "lucide-react"
import { useState } from "react"

interface RoleQuestionsSheetProps {
  jobId: string
  jobTitle: string
  onClose: () => void
  onSubmitted: (applicationId: string) => void
}

/**
 * Bottom sheet shown right after a right-swipe: 4 role-specific questions
 * (Haiku-generated, Redis-cached server-side). Answers travel only in the
 * queue payload — they are generation input, never stored PII.
 */
export function RoleQuestionsSheet({
  jobId,
  jobTitle,
  onClose,
  onSubmitted,
}: RoleQuestionsSheetProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const questions = trpc.applications.getRoleQuestions.useQuery({ jobId })
  const create = trpc.applications.create.useMutation({
    onSuccess: ({ applicationId }) => onSubmitted(applicationId),
  })

  function submit(roleAnswers: Record<string, string>) {
    create.mutate({ jobId, roleAnswers })
  }

  const filled = Object.fromEntries(
    Object.entries(answers)
      .map(([q, a]) => [q, a.trim()])
      .filter(([, a]) => a !== ""),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <dialog
        open
        aria-modal="true"
        aria-label={`Quick questions for ${jobTitle}`}
        className="relative m-0 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border-0 bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">Quick questions</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-m-2 cursor-pointer rounded-lg p-2 text-muted transition-colors duration-200 hover:text-ink"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">
          Your answers make the documents for “{jobTitle}” specific to you. Optional — skip and
          we'll draft from your profile alone.
        </p>

        {questions.isLoading && (
          <div className="flex items-center gap-3 py-8">
            <Spinner /> <span className="text-sm text-muted">Preparing questions…</span>
          </div>
        )}
        {questions.isError && (
          <p className="py-4 text-sm text-red-600">
            Couldn't load questions — you can still continue without them.
          </p>
        )}

        {questions.data && (
          <div className="flex flex-col gap-4">
            {questions.data.questions.map((q, i) => (
              <label key={q} className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold">
                  {i + 1}. {q}
                </span>
                <textarea
                  value={answers[q] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q]: e.target.value }))}
                  maxLength={2000}
                  rows={2}
                  className="rounded-lg border border-line p-3 text-base transition-colors duration-200 focus:border-primary focus:outline-none"
                />
              </label>
            ))}
          </div>
        )}

        {create.isError && <p className="mt-3 text-sm text-red-600">{create.error.message}</p>}

        <div className="mt-5 flex gap-3">
          <Button
            variant="ghost"
            onClick={() => submit({})}
            disabled={create.isPending}
            className="flex-1"
          >
            Skip
          </Button>
          <Button
            variant="cta"
            onClick={() => submit(filled)}
            disabled={create.isPending || questions.isLoading}
            className="flex-1"
          >
            {create.isPending ? "Starting…" : "Generate documents"}
          </Button>
        </div>
      </dialog>
    </div>
  )
}
