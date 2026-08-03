"use client"

import { TEMPLATES, type TemplateId } from "@/lib/resume"
import { trpc } from "@/lib/trpc/client"
import { daysSince } from "@/lib/ui"
import { Badge, Button, Card, Spinner } from "@agora/ui"
import { motion, useReducedMotion } from "framer-motion"
import { FileText, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

// No cursor utility here on purpose: the browser already gives <input> a text
// caret and <select> a pointer. Setting one and overriding it on the input only
// worked by accident of Tailwind's utility ordering.
const FIELD =
  "min-h-11 w-full rounded-lg border border-line bg-white p-2.5 text-base transition-colors duration-200 focus:border-primary focus:outline-none"

function templateLabel(id: string): string {
  return TEMPLATES.find((t) => t.id === id)?.label ?? id
}

function updatedLabel(date: Date | string): string {
  const days = daysSince(date)
  if (days === null) return "Updated recently"
  if (days === 0) return "Updated today"
  if (days === 1) return "Updated yesterday"
  return `Updated ${days} days ago`
}

export default function ResumesPage() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const list = trpc.resumes.list.useQuery()
  const savedJobs = trpc.jobs.saved.useQuery()
  const reduce = useReducedMotion()

  const dialogRef = useRef<HTMLDialogElement>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // New-resume form
  const [title, setTitle] = useState("")
  const [template, setTemplate] = useState<TemplateId>("harvard")
  const [fromResumeId, setFromResumeId] = useState("")
  const [jobId, setJobId] = useState("")

  const create = trpc.resumes.create.useMutation({
    onSuccess: ({ id }) => {
      dialogRef.current?.close()
      router.push(`/resumes/${id}`)
    },
  })
  const duplicate = trpc.resumes.create.useMutation({
    onSuccess: () => utils.resumes.list.invalidate(),
  })
  const remove = trpc.resumes.remove.useMutation({
    onSuccess: () => {
      setConfirmId(null)
      return utils.resumes.list.invalidate()
    },
  })
  const setBase = trpc.resumes.setBase.useMutation({
    onSuccess: () => utils.resumes.list.invalidate(),
  })

  const resumes = list.data ?? []

  function openDialog() {
    setTitle("")
    setTemplate("harvard")
    setFromResumeId("")
    setJobId("")
    create.reset()
    dialogRef.current?.showModal()
  }

  function submitCreate() {
    const source = resumes.find((r) => r.id === fromResumeId)
    const fallback = source ? `${source.title} (copy)` : "Untitled resume"
    create.mutate({
      title: title.trim() || fallback,
      template,
      jobId: jobId || null,
      fromResumeId: fromResumeId || null,
    })
  }

  if (list.isLoading) {
    return (
      <main className="flex justify-center py-10">
        <Spinner className="h-8 w-8" />
      </main>
    )
  }

  if (list.isError) {
    return (
      <main>
        <Card className="text-center">
          <p className="mb-4 text-sm text-muted">{list.error.message}</p>
          <Button onClick={() => list.refetch()}>Try again</Button>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Resumes</h1>
          <p className="text-sm text-muted">
            Keep one base resume and tailor copies per job. Nothing is sent anywhere — you download
            and apply yourself.
          </p>
        </div>
        <Button variant="cta" onClick={openDialog}>
          <Plus size={18} aria-hidden /> New resume
        </Button>
      </header>

      {resumes.length === 0 ? (
        <Card className="text-center">
          <FileText size={28} aria-hidden className="mx-auto mb-2 text-primary" />
          <h2 className="mb-2 text-lg font-bold">No resumes yet</h2>
          <p className="mb-4 text-sm text-muted">
            Start with a blank Harvard-style resume — it takes about ten minutes.
          </p>
          <Button variant="cta" onClick={openDialog}>
            Create your first resume
          </Button>
        </Card>
      ) : (
        <ul className="grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r, i) => (
            <motion.li
              key={r.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={reduce ? {} : { y: -3 }}
              transition={{ duration: 0.2, delay: reduce ? 0 : Math.min(i * 0.04, 0.3) }}
            >
              <Card className="flex h-full flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-ink">{r.title}</h2>
                  {r.isBase && <Badge variant="success">Base resume</Badge>}
                  {r.jobId && <Badge variant="info">Tailored</Badge>}
                </div>
                <p className="text-sm text-muted">
                  {templateLabel(r.template)} · {updatedLabel(r.updatedAt)}
                </p>

                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Link href={`/resumes/${r.id}`} className="flex-1">
                    <Button variant="primary" size="sm" className="w-full">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={duplicate.isPending}
                    onClick={() =>
                      duplicate.mutate({
                        title: `${r.title} (copy)`,
                        template: r.template,
                        jobId: r.jobId,
                        fromResumeId: r.id,
                      })
                    }
                  >
                    Duplicate
                  </Button>
                  {!r.isBase && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={setBase.isPending}
                      onClick={() => setBase.mutate({ id: r.id })}
                    >
                      Set as base
                    </Button>
                  )}
                  {confirmId === r.id ? (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate({ id: r.id })}
                      >
                        {remove.isPending ? "Deleting…" : "Confirm delete"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(r.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </Card>
            </motion.li>
          ))}
        </ul>
      )}

      {(remove.isError || setBase.isError || duplicate.isError) && (
        <p className="text-sm text-red-600">
          {remove.error?.message ?? setBase.error?.message ?? duplicate.error?.message}
        </p>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="new-resume-heading"
        className="m-auto w-[min(32rem,92vw)] rounded-2xl border border-white/50 bg-white/95 p-6 text-ink shadow-glass backdrop-blur-md backdrop:bg-ink/40"
      >
        <h2 id="new-resume-heading" className="mb-1 text-lg font-bold">
          New resume
        </h2>
        <p className="mb-4 text-sm text-muted">
          Duplicate an existing resume to tailor it, or start from scratch.
        </p>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="new-resume-title">
            Title
            <input
              id="new-resume-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Working Student — Backend"
              className={`${FIELD} cursor-text`}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="new-resume-from">
            Starting point
            <select
              id="new-resume-from"
              value={fromResumeId}
              onChange={(e) => setFromResumeId(e.target.value)}
              className={FIELD}
            >
              <option value="">Blank resume</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  Copy of {r.title}
                </option>
              ))}
            </select>
          </label>

          <label
            className="flex flex-col gap-1.5 text-sm font-medium"
            htmlFor="new-resume-template"
          >
            Template
            <select
              id="new-resume-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value as TemplateId)}
              className={FIELD}
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                  {t.recommended ? " (recommended)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="new-resume-job">
            Tailor to a saved job (optional)
            <select
              id="new-resume-job"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className={FIELD}
            >
              <option value="">No specific job</option>
              {(savedJobs.data?.jobs ?? []).map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.company}
                </option>
              ))}
            </select>
          </label>

          {create.isError && <p className="text-sm text-red-600">{create.error.message}</p>}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => dialogRef.current?.close()}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="cta"
              className="flex-1"
              onClick={submitCreate}
              disabled={create.isPending}
            >
              {create.isPending ? "Creating…" : "Create resume"}
            </Button>
          </div>
        </div>
      </dialog>
    </main>
  )
}
