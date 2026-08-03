"use client"

import type { ResumeContent, ResumeEntry, ResumeRatedItem } from "@agora/db/schema"
import { Button } from "@agora/ui"
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"

// Shared control styling — there is no Input primitive in @agora/ui, and one
// component for eight identical <input>s is cheaper than eight copies of this
// class string. 44px minimum height is the PWA tap-target rule.
const controlClass =
  "min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"

const iconButtonClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"

/** Immutably move `from` to `to`; a no-op when `to` falls off either end. */
function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr
  const next = [...arr]
  const [item] = next.splice(from, 1)
  if (item === undefined) return arr
  next.splice(to, 0, item)
  return next
}

function Field(props: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string | undefined
  placeholder?: string | undefined
  disabled?: boolean | undefined
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={props.id} className="text-xs font-semibold text-muted">
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type ?? "text"}
        value={props.value}
        placeholder={props.placeholder ?? ""}
        disabled={props.disabled ?? false}
        onChange={(e) => props.onChange(e.target.value)}
        className={controlClass}
      />
    </div>
  )
}

function SectionShell(props: {
  title: string
  hint?: string | undefined
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-glass backdrop-blur-md">
      <h3 className="text-sm font-bold text-ink">{props.title}</h3>
      {props.hint && <p className="mt-0.5 text-xs text-muted">{props.hint}</p>}
      <div className="mt-3 flex flex-col gap-3">{props.children}</div>
    </section>
  )
}

// ── Contact ───────────────────────────────────────────────────────────────────

type ContactKey = keyof ResumeContent["contact"]

const CONTACT_FIELDS: { key: ContactKey; label: string; type?: string; placeholder?: string }[] = [
  { key: "firstName", label: "First name", placeholder: "Amira" },
  { key: "lastName", label: "Last name", placeholder: "Haddad" },
  { key: "jobTitle", label: "Target job title", placeholder: "Frontend Engineer" },
  { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
  { key: "phone", label: "Phone", type: "tel", placeholder: "+49 151 000 000" },
  { key: "location", label: "Location", placeholder: "Berlin, Germany" },
  { key: "linkedinUrl", label: "LinkedIn", type: "url", placeholder: "linkedin.com/in/…" },
  { key: "portfolioUrl", label: "Portfolio", type: "url", placeholder: "yoursite.dev" },
]

export function ContactEditor({
  contact,
  onChange,
}: {
  contact: ResumeContent["contact"]
  onChange: (contact: ResumeContent["contact"]) => void
}) {
  return (
    <SectionShell title="Contact details" hint="Recruiters skim this first — keep it exact.">
      <div className="grid gap-3 sm:grid-cols-2">
        {CONTACT_FIELDS.map((f) => (
          <Field
            key={f.key}
            id={`contact-${f.key}`}
            label={f.label}
            value={contact[f.key]}
            type={f.type}
            placeholder={f.placeholder}
            onChange={(value) => onChange({ ...contact, [f.key]: value })}
          />
        ))}
      </div>
    </SectionShell>
  )
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function SummaryEditor({
  summary,
  onChange,
}: {
  summary: string
  onChange: (summary: string) => void
}) {
  return (
    <SectionShell title="Professional summary" hint="Two to four sentences. Lead with the outcome.">
      <div className="flex flex-col gap-1">
        <label htmlFor="resume-summary" className="text-xs font-semibold text-muted">
          Summary
        </label>
        <textarea
          id="resume-summary"
          rows={5}
          value={summary}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Frontend engineer with 4 years building accessible EU-market products…"
          className={controlClass}
        />
        <p className="text-right text-[11px] text-muted">{summary.trim().length} characters</p>
      </div>
    </SectionShell>
  )
}

// ── Experience / education (one component, two uses) ──────────────────────────

function emptyEntry(): ResumeEntry {
  return {
    id: crypto.randomUUID(),
    title: "",
    organisation: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    bullets: [],
  }
}

export function EntriesEditor(props: {
  idPrefix: string
  title: string
  hint?: string | undefined
  titleLabel: string
  organisationLabel: string
  bulletsLabel: string
  entries: ResumeEntry[]
  onChange: (entries: ResumeEntry[]) => void
}) {
  const { entries, onChange, idPrefix } = props

  const patch = (index: number, next: Partial<ResumeEntry>) =>
    onChange(entries.map((e, i) => (i === index ? { ...e, ...next } : e)))

  return (
    <SectionShell title={props.title} hint={props.hint}>
      {entries.length === 0 && (
        <p className="text-xs text-muted">Nothing here yet — add your first entry.</p>
      )}

      {entries.map((entry, index) => {
        const base = `${idPrefix}-${entry.id}`
        return (
          <div key={entry.id} className="rounded-xl border border-line bg-surface/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-1">
              <span className="truncate text-xs font-semibold text-ink">
                {entry.title.trim() || `Entry ${index + 1}`}
              </span>
              <div className="flex shrink-0">
                <button
                  type="button"
                  aria-label={`Move ${entry.title.trim() || `entry ${index + 1}`} up`}
                  disabled={index === 0}
                  onClick={() => onChange(move(entries, index, index - 1))}
                  className={iconButtonClass}
                >
                  <ChevronUp className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${entry.title.trim() || `entry ${index + 1}`} down`}
                  disabled={index === entries.length - 1}
                  onClick={() => onChange(move(entries, index, index + 1))}
                  className={iconButtonClass}
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${entry.title.trim() || `entry ${index + 1}`}`}
                  onClick={() => onChange(entries.filter((_, i) => i !== index))}
                  className={`${iconButtonClass} hover:bg-red-50 hover:text-red-600`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id={`${base}-title`}
                label={props.titleLabel}
                value={entry.title}
                onChange={(v) => patch(index, { title: v })}
              />
              <Field
                id={`${base}-org`}
                label={props.organisationLabel}
                value={entry.organisation}
                onChange={(v) => patch(index, { organisation: v })}
              />
              <Field
                id={`${base}-location`}
                label="Location"
                value={entry.location}
                placeholder="Berlin / Remote"
                onChange={(v) => patch(index, { location: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  id={`${base}-start`}
                  label="Start"
                  value={entry.startDate}
                  placeholder="Mar 2022"
                  onChange={(v) => patch(index, { startDate: v })}
                />
                <Field
                  id={`${base}-end`}
                  label="End"
                  value={entry.endDate ?? ""}
                  placeholder={entry.current ? "Present" : "Jul 2024"}
                  disabled={entry.current}
                  onChange={(v) => patch(index, { endDate: v })}
                />
              </div>
            </div>

            <label
              htmlFor={`${base}-current`}
              className="mt-3 flex min-h-11 items-center gap-2 text-sm text-ink"
            >
              <input
                id={`${base}-current`}
                type="checkbox"
                checked={entry.current}
                onChange={(e) =>
                  patch(index, {
                    current: e.target.checked,
                    endDate: e.target.checked ? null : "",
                  })
                }
                className="h-5 w-5 rounded border-line accent-primary"
              />
              I'm still here
            </label>

            <div className="mt-1 flex flex-col gap-1">
              <label htmlFor={`${base}-bullets`} className="text-xs font-semibold text-muted">
                {props.bulletsLabel}
              </label>
              <textarea
                id={`${base}-bullets`}
                rows={4}
                value={entry.bullets.join("\n")}
                onChange={(e) => patch(index, { bullets: e.target.value.split("\n") })}
                placeholder={"Cut checkout latency 40% by…\nLed a team of 3 to…"}
                className={controlClass}
              />
              <p className="text-[11px] text-muted">One bullet per line.</p>
            </div>
          </div>
        )
      })}

      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...entries, emptyEntry()])}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add entry
      </Button>
    </SectionShell>
  )
}

// ── Skills / languages / certificates (one component, three uses) ────────────

export function RatedItemsEditor(props: {
  idPrefix: string
  title: string
  hint?: string | undefined
  nameLabel: string
  levelLabel: string
  levelPlaceholder?: string | undefined
  items: ResumeRatedItem[]
  onChange: (items: ResumeRatedItem[]) => void
}) {
  const { items, onChange, idPrefix } = props

  const patch = (index: number, next: Partial<ResumeRatedItem>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...next } : it)))

  return (
    <SectionShell title={props.title} hint={props.hint}>
      {items.length === 0 && <p className="text-xs text-muted">Nothing added yet.</p>}

      {items.map((item, index) => {
        const base = `${idPrefix}-${item.id}`
        return (
          <div key={item.id} className="flex items-end gap-2">
            <div className="flex-1">
              <Field
                id={`${base}-name`}
                label={props.nameLabel}
                value={item.name}
                onChange={(v) => patch(index, { name: v })}
              />
            </div>
            <div className="w-28 shrink-0 sm:w-36">
              <Field
                id={`${base}-level`}
                label={props.levelLabel}
                value={item.level}
                placeholder={props.levelPlaceholder}
                onChange={(v) => patch(index, { level: v })}
              />
            </div>
            <button
              type="button"
              aria-label={`Delete ${item.name.trim() || `${props.nameLabel} ${index + 1}`}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className={`${iconButtonClass} hover:bg-red-50 hover:text-red-600`}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )
      })}

      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...items, { id: crypto.randomUUID(), name: "", level: "" }])}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add
      </Button>
    </SectionShell>
  )
}
