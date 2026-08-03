"use client"

import { ScoreMeter } from "@/components/resume/ScoreMeter"
import {
  ContactEditor,
  EntriesEditor,
  RatedItemsEditor,
  SummaryEditor,
} from "@/components/resume/SectionEditors"
import { TEMPLATES, type TemplateId } from "@/lib/resume"
import type { ResumeContent, ResumeSection } from "@agora/db/schema"
import { Button, cn } from "@agora/ui"
import { Reorder, useReducedMotion } from "framer-motion"
import { ChevronDown, ChevronUp, GripVertical, LayoutTemplate } from "lucide-react"

const SECTION_LABELS: Record<ResumeSection, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
  certificates: "Certificates",
}

interface EditorPanelProps {
  content: ResumeContent
  onChange: (content: ResumeContent) => void
  template: TemplateId
  /** Opens the template <dialog> owned by the page. */
  onOpenTemplates: () => void
  className?: string | undefined
}

export function EditorPanel({
  content,
  onChange,
  template,
  onOpenTemplates,
  className,
}: EditorPanelProps) {
  const reduceMotion = useReducedMotion()
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 520, damping: 42 }

  const templateLabel = TEMPLATES.find((t) => t.id === template)?.label ?? template
  const order = content.sectionOrder

  const setOrder = (next: ResumeSection[]) => onChange({ ...content, sectionOrder: next })

  const moveSection = (index: number, to: number) => {
    if (to < 0 || to >= order.length) return
    const next = [...order]
    const [item] = next.splice(index, 1)
    if (item === undefined) return
    next.splice(to, 0, item)
    setOrder(next)
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <ScoreMeter content={content} />

      {/* Template + section order */}
      <section className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-glass backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink">Layout</h3>
            <p className="truncate text-xs text-muted">Template: {templateLabel}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenTemplates}>
            <LayoutTemplate className="h-4 w-4" aria-hidden />
            Change
          </Button>
        </div>

        <p id="section-order-hint" className="mt-4 text-xs font-semibold text-muted">
          Section order — drag, or use the arrows.
        </p>
        <Reorder.Group
          axis="y"
          values={order}
          onReorder={setOrder}
          aria-describedby="section-order-hint"
          className="mt-2 flex flex-col gap-1.5"
        >
          {order.map((section, index) => (
            <Reorder.Item
              key={section}
              value={section}
              transition={spring}
              className="flex min-h-11 cursor-grab items-center gap-2 rounded-xl border border-line bg-surface/70 px-2 active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="flex-1 truncate text-sm font-semibold text-ink">
                {SECTION_LABELS[section]}
              </span>
              <button
                type="button"
                aria-label={`Move ${SECTION_LABELS[section]} up`}
                disabled={index === 0}
                onClick={() => moveSection(index, index - 1)}
                className="flex h-11 w-9 items-center justify-center rounded-lg text-muted hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Move ${SECTION_LABELS[section]} down`}
                disabled={index === order.length - 1}
                onClick={() => moveSection(index, index + 1)}
                className="flex h-11 w-9 items-center justify-center rounded-lg text-muted hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </section>

      <ContactEditor
        contact={content.contact}
        onChange={(contact) => onChange({ ...content, contact })}
      />

      {/* The form follows the resume's own section order, so the left pane and
          the preview always read top-to-bottom in the same sequence. */}
      {order.map((section) => {
        switch (section) {
          case "summary":
            return (
              <SummaryEditor
                key={section}
                summary={content.summary}
                onChange={(summary) => onChange({ ...content, summary })}
              />
            )
          case "experience":
            return (
              <EntriesEditor
                key={section}
                idPrefix="exp"
                title="Experience"
                hint="Newest first. Two or more bullets per role."
                titleLabel="Role"
                organisationLabel="Company"
                bulletsLabel="What you did"
                entries={content.experience}
                onChange={(experience) => onChange({ ...content, experience })}
              />
            )
          case "education":
            return (
              <EntriesEditor
                key={section}
                idPrefix="edu"
                title="Education"
                titleLabel="Qualification"
                organisationLabel="Institution"
                bulletsLabel="Highlights (optional)"
                entries={content.education}
                onChange={(education) => onChange({ ...content, education })}
              />
            )
          case "skills":
            return (
              <div key={section} className="flex flex-col gap-2">
                <label
                  htmlFor="show-skill-levels"
                  className="flex min-h-11 items-center gap-2 self-start rounded-xl px-1 text-sm text-ink"
                >
                  <input
                    id="show-skill-levels"
                    type="checkbox"
                    checked={content.showSkillLevels}
                    onChange={(e) => onChange({ ...content, showSkillLevels: e.target.checked })}
                    className="h-5 w-5 rounded border-line accent-primary"
                  />
                  Show skill levels on the resume
                </label>
                <RatedItemsEditor
                  idPrefix="skill"
                  title="Skills"
                  hint="Five or more. Mirror the words in the job ad."
                  nameLabel="Skill"
                  levelLabel="Level"
                  levelPlaceholder="Advanced"
                  items={content.skills}
                  onChange={(skills) => onChange({ ...content, skills })}
                />
              </div>
            )
          case "languages":
            return (
              <RatedItemsEditor
                key={section}
                idPrefix="lang"
                title="Languages"
                nameLabel="Language"
                levelLabel="Level"
                levelPlaceholder="C1"
                items={content.languages}
                onChange={(languages) => onChange({ ...content, languages })}
              />
            )
          case "certificates":
            return (
              <RatedItemsEditor
                key={section}
                idPrefix="cert"
                title="Certificates"
                nameLabel="Certificate"
                levelLabel="Year"
                levelPlaceholder="2024"
                items={content.certificates}
                onChange={(certificates) => onChange({ ...content, certificates })}
              />
            )
        }
      })}
    </div>
  )
}
