"use client"

import { safeHttpUrl } from "@/lib/safe-url"
import { trpc } from "@/lib/trpc/client"
import { Button, Card, Spinner, cn } from "@agora/ui"
import { Check, Download, ExternalLink, Send } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

/**
 * Submission helper — Mode 1, and unmistakably so: the USER downloads the
 * documents, the USER opens the employer's page, the USER submits there.
 * Agora only records that it happened. We never auto-submit (Mode 3 banned).
 */
export default function SubmitPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [downloaded, setDownloaded] = useState(false)
  const [opened, setOpened] = useState(false)

  const utils = trpc.useUtils()
  const app = trpc.applications.getWithDocuments.useQuery({ applicationId: id })
  const markSubmitted = trpc.applications.markSubmitted.useMutation({
    // Invalidate before navigating, or the tracker renders this application from a
    // cached pre-submission row for up to the 60s staleTime.
    onSuccess: async () => {
      await utils.applications.getWithDocuments.invalidate({ applicationId: id })
      utils.applications.list.invalidate()
      router.push("/tracker")
    },
  })

  if (app.isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </main>
    )
  }
  if (app.isError || !app.data) {
    return (
      <main className="pt-8">
        <Card className="text-center text-sm text-red-600">
          {app.error?.message ?? "Application not found"}
        </Card>
      </main>
    )
  }

  const data = app.data

  if (data.status === "generated") {
    return (
      <main className="pt-8">
        <Card className="text-center">
          <h1 className="mb-2 text-lg font-bold">Review comes first</h1>
          <p className="mb-4 text-sm text-muted">
            Approve your documents before submitting them to the employer.
          </p>
          <Link href={`/applications/${id}/review`}>
            <Button variant="cta" className="w-full">
              Go to review
            </Button>
          </Link>
        </Card>
      </main>
    )
  }

  if (data.status !== "approved") {
    return (
      <main className="pt-8">
        <Card className="text-center">
          <h1 className="mb-2 text-lg font-bold">Already submitted</h1>
          <p className="mb-4 text-sm text-muted">Track its progress from your tracker.</p>
          <Link href="/tracker">
            <Button variant="outline" className="w-full">
              Open tracker
            </Button>
          </Link>
        </Card>
      </main>
    )
  }

  function openEmployerPage() {
    // Scheme-guarded: employerUrl comes from a scraped listing, and window.open honours
    // javascript: just as readily as https:.
    const url = safeHttpUrl(data?.employerUrl)
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer")
      setOpened(true)
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Submit your application</h1>
        {data.job && (
          <p className="text-sm text-muted">
            {data.job.title} · {data.job.company}
          </p>
        )}
        <p className="mt-2 rounded-lg bg-sky-50 p-3 text-xs text-muted">
          You stay in control: you submit on the employer's site yourself. Agora never sends
          anything on your behalf.
        </p>
      </header>

      <StepCard
        n={1}
        title="Download your documents"
        done={downloaded}
        body="Replace the placeholders ([Vorname Nachname], address, contact) with your real details."
      >
        <div className="flex gap-2">
          {data.cvUrl && (
            <a href={data.cvUrl} download className="flex-1">
              <Button variant="outline" className="w-full" onClick={() => setDownloaded(true)}>
                <Download size={16} aria-hidden /> CV
              </Button>
            </a>
          )}
          {data.coverLetterUrl && (
            <a href={data.coverLetterUrl} download className="flex-1">
              <Button variant="outline" className="w-full" onClick={() => setDownloaded(true)}>
                <Download size={16} aria-hidden /> Cover letter
              </Button>
            </a>
          )}
        </div>
      </StepCard>

      <StepCard
        n={2}
        title="Open the employer's page"
        done={opened}
        body="The job posting opens in a new tab — apply there with your downloaded documents."
      >
        <Button
          variant="primary"
          className="w-full"
          onClick={openEmployerPage}
          disabled={!safeHttpUrl(data.employerUrl)}
        >
          <ExternalLink size={16} aria-hidden />
          {safeHttpUrl(data.employerUrl) ? "Open employer page" : "No employer link available"}
        </Button>
      </StepCard>

      <StepCard
        n={3}
        title="Confirm you submitted"
        done={false}
        body="This starts your tracker entry and schedules a follow-up draft for day 10."
      >
        <Button
          variant="cta"
          size="lg"
          className="w-full"
          disabled={markSubmitted.isPending}
          onClick={() => markSubmitted.mutate({ applicationId: id })}
        >
          <Send size={18} aria-hidden />
          {markSubmitted.isPending ? "Saving…" : "I submitted it on the employer's site"}
        </Button>
        {markSubmitted.isError && (
          <p className="mt-2 text-sm text-red-600">{markSubmitted.error.message}</p>
        )}
      </StepCard>
    </main>
  )
}

function StepCard({
  n,
  title,
  done,
  body,
  children,
}: {
  n: number
  title: string
  done: boolean
  body: string
  children: React.ReactNode
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-200",
            done ? "bg-cta text-white" : "bg-sky-100 text-primary",
          )}
          aria-hidden
        >
          {done ? <Check size={18} /> : n}
        </span>
        <h2 className="font-bold">{title}</h2>
      </div>
      <p className="text-sm text-muted">{body}</p>
      {children}
    </Card>
  )
}
