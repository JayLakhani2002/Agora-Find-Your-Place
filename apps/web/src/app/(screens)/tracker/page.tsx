"use client"

import { CopyButton } from "@/components/CopyButton"
import { StatusBadge } from "@/components/StatusBadge"
import { trpc } from "@/lib/trpc/client"
import { STATUS_META, TRACKER_NEXT, daysSince } from "@/lib/ui"
import type { ApplicationStatus } from "@/server/routers/applications"
import { Badge, Button, Card, Spinner } from "@agora/ui"
import Link from "next/link"

export default function TrackerPage() {
  const utils = trpc.useUtils()
  const list = trpc.applications.list.useQuery()
  const updateStatus = trpc.applications.updateStatus.useMutation({
    onSuccess: () => utils.applications.list.invalidate(),
  })
  const markSent = trpc.applications.markFollowUpSent.useMutation({
    onSuccess: () => utils.applications.list.invalidate(),
  })

  if (list.isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </main>
    )
  }
  if (list.isError) {
    return (
      <main className="pt-8">
        <Card className="text-center text-sm text-red-600">{list.error.message}</Card>
      </main>
    )
  }

  const apps = list.data ?? []

  return (
    <main className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Your applications</h1>
        <p className="text-sm text-muted">
          {apps.length === 0
            ? "Nothing here yet."
            : `${apps.length} application${apps.length === 1 ? "" : "s"}`}
        </p>
      </header>

      {apps.length === 0 && (
        <Card className="text-center">
          <p className="mb-4 text-sm text-muted">
            Swipe right on a job and your application will show up here.
          </p>
          <Link href="/dashboard">
            <Button variant="cta">Open the deck</Button>
          </Link>
        </Card>
      )}

      {apps.map((app) => {
        const status = app.status as ApplicationStatus
        const days = daysSince(app.userSubmittedAt ?? app.createdAt)
        const nextStatuses = TRACKER_NEXT[status] ?? []
        return (
          <Card key={app.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate font-bold">{app.job?.title ?? "Job removed"}</h2>
                <p className="truncate text-sm text-muted">{app.job?.company}</p>
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              {days !== null && (
                <span>
                  {app.userSubmittedAt ? "Submitted" : "Created"}{" "}
                  {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`}
                </span>
              )}
              {app.overallScore !== null && (
                <Badge variant="info">Quality {app.overallScore.toFixed(1)}</Badge>
              )}
              {app.generationStatus !== "complete" && status === "generated" && (
                <Badge variant="warning">Drafting…</Badge>
              )}
            </div>

            {status === "generated" && (
              <Link href={`/applications/${app.id}/review`}>
                <Button variant="cta" size="sm" className="w-full">
                  Review draft
                </Button>
              </Link>
            )}
            {status === "approved" && (
              <Link href={`/applications/${app.id}/submit`}>
                <Button variant="cta" size="sm" className="w-full">
                  Submission helper
                </Button>
              </Link>
            )}

            {app.followUpDrafts.map((draft) => (
              <div key={draft.id} className="rounded-lg bg-sky-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  Follow-up draft {draft.sentAt ? "· sent" : ""}
                </p>
                <p className="mb-2 whitespace-pre-wrap text-sm">{draft.draftText}</p>
                <div className="flex gap-2">
                  <CopyButton text={draft.draftText} label="Copy draft" />
                  {!draft.sentAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={markSent.isPending}
                      onClick={() => markSent.mutate({ draftId: draft.id })}
                    >
                      Mark as sent
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {nextStatuses.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                <span className="w-full text-xs text-muted">Heard back? Update the status:</span>
                {nextStatuses.map((next) => (
                  <Button
                    key={next}
                    variant={next === "withdrawn" || next === "rejected" ? "ghost" : "outline"}
                    size="sm"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ applicationId: app.id, status: next })}
                  >
                    {STATUS_META[next].label}
                  </Button>
                ))}
              </div>
            )}
          </Card>
        )
      })}

      {updateStatus.isError && (
        <p className="text-center text-sm text-red-600">{updateStatus.error.message}</p>
      )}
    </main>
  )
}
