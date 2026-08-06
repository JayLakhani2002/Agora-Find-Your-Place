"use client"

import { CopyButton } from "@/components/CopyButton"
import { ScoreBars } from "@/components/ScoreBars"
import { trpc } from "@/lib/trpc/client"
import { Button, Card, Spinner, Tabs } from "@agora/ui"
import { useQuery } from "@tanstack/react-query"
import { Download } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const TAB_ITEMS = [
  { value: "cv", label: "CV" },
  { value: "cl", label: "Cover letter" },
  { value: "prefills", label: "Pre-fills" },
]

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState("cv")

  const app = trpc.applications.getWithDocuments.useQuery(
    { applicationId: id },
    {
      // Poll while the worker is drafting; stop once it lands (or fails).
      refetchInterval: (query) => {
        const status = query.state.data?.generationStatus
        return status === "complete" || status === "failed" ? false : 2500
      },
    },
  )
  const utils = trpc.useUtils()
  const approve = trpc.applications.approve.useMutation({
    // Invalidate BEFORE navigating. The submit page mounts the same query key, and the
    // 60s global staleTime meant it re-used this page's cached row (status "generated")
    // and told the user "Review comes first" — a dead end, since coming back and
    // approving again fails with `Cannot approve from status "approved"`.
    onSuccess: async () => {
      await utils.applications.getWithDocuments.invalidate({ applicationId: id })
      utils.applications.list.invalidate()
      router.push(`/applications/${id}/submit`)
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
        <Card className="text-center">
          <p className="text-sm text-red-600">{app.error?.message ?? "Application not found"}</p>
        </Card>
      </main>
    )
  }

  const data = app.data

  if (data.generationStatus === "failed") {
    return (
      <main className="pt-8">
        <Card className="text-center">
          <h1 className="mb-2 text-lg font-bold">Generation failed</h1>
          <p className="mb-4 text-sm text-muted">
            Something went wrong drafting your documents. Swipe the job again from your deck, or
            contact support if it keeps happening.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Back to deck</Button>
          </Link>
        </Card>
      </main>
    )
  }

  if (data.generationStatus !== "complete") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full text-center">
          <Spinner className="mx-auto mb-3 h-8 w-8" />
          <h1 className="mb-1 text-lg font-bold">Drafting your application…</h1>
          <p className="text-sm text-muted">
            {data.job ? `${data.job.title} at ${data.job.company}. ` : ""}
            CV and cover letter are being written and quality-checked — usually under a minute.
          </p>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">Review your application</h1>
        {data.job && (
          <p className="text-sm text-muted">
            {data.job.title} · {data.job.company}
          </p>
        )}
      </header>

      <Card>
        <ScoreBars scores={data.evalScores} />
      </Card>

      <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />

      {tab === "cv" && <DocumentPanel url={data.cvUrl} filename="lebenslauf.md" docLabel="CV" />}
      {tab === "cl" && (
        <DocumentPanel
          url={data.coverLetterUrl}
          filename="anschreiben.md"
          docLabel="Cover letter"
        />
      )}
      {tab === "prefills" && <PrefillsPanel job={data.job} />}

      <div className="sticky bottom-20 mt-2">
        {data.status === "generated" && (
          <Button
            variant="cta"
            size="lg"
            className="w-full"
            disabled={approve.isPending}
            onClick={() => approve.mutate({ applicationId: id })}
          >
            {approve.isPending ? "Approving…" : "Approve — I'm happy with this"}
          </Button>
        )}
        {data.status === "approved" && (
          <Link href={`/applications/${id}/submit`} className="block">
            <Button variant="cta" size="lg" className="w-full">
              Continue to submission
            </Button>
          </Link>
        )}
        {data.status !== "generated" && data.status !== "approved" && (
          <Link href="/tracker" className="block">
            <Button variant="outline" size="lg" className="w-full">
              View in tracker
            </Button>
          </Link>
        )}
        {approve.isError && (
          <p className="mt-2 text-center text-sm text-red-600">{approve.error.message}</p>
        )}
      </div>
    </main>
  )
}

/**
 * Markdown document viewer with inline editing. Edits are local — they apply
 * to your download and copy, keeping the reviewed original on file unchanged.
 */
function DocumentPanel({
  url,
  filename,
  docLabel,
}: {
  url: string | null
  filename: string
  docLabel: string
}) {
  const [text, setText] = useState<string | null>(null)

  const doc = useQuery({
    queryKey: ["document", url],
    enabled: url !== null,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      // Presigned S3 URL — external storage, not our API (tRPC rule intact).
      const res = await fetch(url as string)
      if (!res.ok) throw new Error(`Download failed (${res.status})`)
      return res.text()
    },
  })

  useEffect(() => {
    if (doc.data !== undefined && text === null) setText(doc.data)
  }, [doc.data, text])

  if (!url) return <Card className="text-sm text-muted">Document not available yet.</Card>
  // isError FIRST: on a failed download isLoading goes false but `text` stays null, so
  // the loading branch below matched forever and the error state was unreachable —
  // a storage outage rendered "Loading CV…" indefinitely.
  if (doc.isError) {
    return <Card className="text-sm text-red-600">Couldn't load the document — try again.</Card>
  }
  if (doc.isLoading || text === null) {
    return (
      <Card className="flex items-center gap-3">
        <Spinner /> <span className="text-sm text-muted">Loading {docLabel}…</span>
      </Card>
    )
  }

  function download() {
    const blob = new Blob([text ?? ""], { type: "text/markdown" })
    const href = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = href
    a.download = filename
    a.click()
    URL.revokeObjectURL(href)
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Edit freely — changes apply to your download and copy.</p>
        <CopyButton text={text} />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        aria-label={`${docLabel} content`}
        className="w-full rounded-lg border border-line p-3 font-mono text-sm leading-relaxed transition-colors duration-200 focus:border-primary focus:outline-none"
      />
      <Button variant="outline" onClick={download}>
        <Download size={16} aria-hidden /> Download {docLabel}
      </Button>
    </Card>
  )
}

/** Copy-paste blocks for the employer's application form. */
function PrefillsPanel({
  job,
}: {
  job: { title: string; company: string; location: string | null } | null
}) {
  const profile = trpc.profile.get.useQuery()

  const blocks: { label: string; value: string }[] = [
    ...(job
      ? [
          { label: "Position", value: job.title },
          { label: "Company", value: job.company },
        ]
      : []),
    { label: "Availability", value: "Verfügbar für max. 20 Stunden pro Woche (Werkstudent)" },
    ...(profile.data?.germanLevel
      ? [{ label: "German level", value: profile.data.germanLevel.toUpperCase() }]
      : []),
  ]

  return (
    <Card className="flex flex-col gap-4 p-4">
      <p className="text-xs text-muted">
        Common form fields, ready to paste into the employer's application page.
      </p>
      {blocks.map((b) => (
        <div key={b.label} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{b.label}</p>
            <p className="truncate text-sm">{b.value}</p>
          </div>
          <CopyButton text={b.value} />
        </div>
      ))}
      <p className="rounded-lg bg-sky-50 p-3 text-xs text-muted">
        Your documents use placeholders like [Vorname Nachname] — replace them with your real
        details before submitting. We never store your personal data.
      </p>
    </Card>
  )
}
