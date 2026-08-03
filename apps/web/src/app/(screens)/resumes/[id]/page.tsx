"use client"

import { EditorPanel } from "@/components/resume/EditorPanel"
import { ResumePreview } from "@/components/resume/ResumePreview"
import { TEMPLATES, type TemplateId, isTemplateId } from "@/lib/resume"
import { trpc } from "@/lib/trpc/client"
import type { ResumeContent } from "@agora/db/schema"
import { Button, Spinner, Tabs, cn } from "@agora/ui"
import { ArrowLeft, Check, Download, LayoutTemplate } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

/** Everything the editor can change; also the unit of autosave. */
type Draft = { title: string; template: TemplateId; content: ResumeContent }

type SaveState = "saved" | "dirty" | "saving" | "error"

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "Saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn't save — keep typing to retry",
}

const SAVE_CLASS: Record<SaveState, string> = {
  saved: "text-green-700",
  dirty: "text-amber-700",
  saving: "text-muted",
  error: "text-red-600",
}

const AUTOSAVE_MS = 800

export default function ResumeEditorPage() {
  const { id } = useParams<{ id: string }>()
  const utils = trpc.useUtils()
  const query = trpc.resumes.get.useQuery({ id })

  const [draft, setDraft] = useState<Draft | null>(null)
  const [save, setSave] = useState<SaveState>("saved")
  const [view, setView] = useState("edit")

  // JSON of the draft last handed to the server; the dirty check and the
  // unmount flush both compare against it.
  const sentJson = useRef<string | null>(null)
  const draftRef = useRef<Draft | null>(null)
  draftRef.current = draft

  const dialogRef = useRef<HTMLDialogElement>(null)

  // Seed once. A background refetch must never clobber what the user is typing,
  // so this only fires while draft is still null.
  const row = query.data
  useEffect(() => {
    if (!row) return
    setDraft((current) => {
      if (current) return current
      const next: Draft = {
        title: row.title,
        template: isTemplateId(row.template) ? row.template : "harvard",
        content: row.content,
      }
      sentJson.current = JSON.stringify(next)
      return next
    })
  }, [row])

  // One persist path for both the debounce and the flush, so a save can never
  // depend on a mutation hook that has already been torn down.
  const persistRef = useRef<(d: Draft) => Promise<void>>(async () => {})
  persistRef.current = async (d: Draft) => {
    const json = JSON.stringify(d)
    sentJson.current = json
    setSave("saving")
    try {
      await utils.client.resumes.update.mutate({ id, ...d })
      void utils.resumes.list.invalidate()
      setSave(JSON.stringify(draftRef.current) === json ? "saved" : "dirty")
    } catch {
      sentJson.current = null
      setSave("error")
    }
  }

  // Debounced autosave. The cleanup cancels the timer on every keystroke — the
  // unmount flush below is what stops the last pending edit being dropped.
  useEffect(() => {
    if (!draft || JSON.stringify(draft) === sentJson.current) return
    setSave("dirty")
    const timer = setTimeout(() => void persistRef.current(draft), AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [draft])

  // Flush, not cancel: navigating away mid-debounce still writes the last edit.
  useEffect(() => {
    return () => {
      const pending = draftRef.current
      if (pending && JSON.stringify(pending) !== sentJson.current) {
        void persistRef.current(pending)
      }
    }
  }, [])

  // The flush can't survive a tab close, so warn instead.
  useEffect(() => {
    if (save === "saved") return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [save])

  if (query.isLoading || (!draft && !query.isError)) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </main>
    )
  }
  if (query.isError || !draft) {
    return (
      <main className="pt-8">
        <div className="rounded-2xl border border-white/50 bg-white/80 p-6 text-center text-sm text-red-600 shadow-glass backdrop-blur-md">
          {query.error?.message ?? "Resume not found."}
          <div className="mt-4">
            <Link href="/resumes">
              <Button variant="outline">Back to resumes</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const currentDraft = draft
  const templateLabel = TEMPLATES.find((t) => t.id === currentDraft.template)?.label

  return (
    <main className="flex flex-col gap-4">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-white/50 bg-white/80 p-3 shadow-glass backdrop-blur-md print:hidden">
        <Link
          href="/resumes"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Save &amp; Exit
        </Link>

        <label htmlFor="resume-title" className="sr-only">
          Resume title
        </label>
        <input
          id="resume-title"
          value={currentDraft.title}
          onChange={(e) => setDraft({ ...currentDraft, title: e.target.value })}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-base font-bold text-ink hover:border-line focus:border-primary focus:bg-white focus:outline-none"
        />

        <span aria-live="polite" className={cn("shrink-0 text-xs font-semibold", SAVE_CLASS[save])}>
          {SAVE_LABEL[save]}
        </span>

        <Button variant="ghost" size="sm" onClick={() => dialogRef.current?.showModal()}>
          <LayoutTemplate className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{templateLabel ?? "Template"}</span>
        </Button>

        <Button variant="cta" size="sm" onClick={() => window.print()}>
          <Download className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Download PDF</span>
          <span className="sm:hidden">PDF</span>
        </Button>
      </header>

      {/* Below md the panes stack behind a toggle; from md both are visible. */}
      <Tabs
        items={[
          { value: "edit", label: "Edit" },
          { value: "preview", label: "Preview" },
        ]}
        value={view}
        onChange={setView}
        className="md:hidden print:hidden"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Hiding uses "hidden md:flex", never "block": EditorPanel's own root is
            a flex column, and twMerge would drop that if we forced display:block. */}
        <EditorPanel
          content={currentDraft.content}
          onChange={(content) => setDraft({ ...currentDraft, content })}
          template={currentDraft.template}
          onOpenTemplates={() => dialogRef.current?.showModal()}
          className={cn("min-w-0 print:hidden", view !== "edit" && "hidden md:flex")}
        />

        <div
          className={cn(
            "min-w-0 md:sticky md:top-24 md:max-h-[calc(100dvh-8rem)] md:overflow-y-auto",
            "print:static print:block print:max-h-none print:overflow-visible",
            view !== "preview" && "hidden md:block",
          )}
        >
          <ResumePreview content={currentDraft.content} template={currentDraft.template} />
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="template-dialog-heading"
        className="m-auto w-[min(28rem,90vw)] rounded-2xl border border-white/50 bg-white p-5 shadow-glass backdrop:bg-ink/40"
      >
        <h2 id="template-dialog-heading" className="text-base font-bold text-ink">
          Choose a template
        </h2>
        <div className="mt-4 flex flex-col gap-2">
          {TEMPLATES.map((t) => {
            const active = t.id === currentDraft.template
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setDraft({ ...currentDraft, template: t.id })
                  dialogRef.current?.close()
                }}
                className={cn(
                  "flex min-h-11 items-center justify-between rounded-xl border-2 px-4 text-left text-sm font-semibold transition-colors duration-150",
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-line text-ink hover:border-primary/50",
                )}
              >
                <span>
                  {t.label}
                  {t.recommended && <span className="ml-2 text-xs text-muted">Recommended</span>}
                </span>
                {active && <Check className="h-4 w-4" aria-hidden />}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => dialogRef.current?.close()}>
            Close
          </Button>
        </div>
      </dialog>
    </main>
  )
}
