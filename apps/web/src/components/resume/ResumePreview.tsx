"use client"

import type { TemplateId } from "@/lib/resume"
import type { ResumeContent } from "@agora/db/schema"
import { cn } from "@agora/ui"
import { motion, useReducedMotion } from "framer-motion"
import "@/app/resume-print.css"
import { Harvard } from "./templates/Harvard"
import { Modern } from "./templates/Modern"
import { Simple } from "./templates/Simple"

function template(id: TemplateId, content: ResumeContent) {
  switch (id) {
    case "modern":
      return <Modern content={content} />
    case "simple":
      return <Simple content={content} />
    default:
      return <Harvard content={content} />
  }
}

/**
 * The A4 page. Pure presentation — no fetching, no state. The paper is crisp
 * white on purpose: the glass belongs to the chrome around it, not the
 * document. `resume-paper` is what app/resume-print.css targets for export.
 */
export function ResumePreview({
  content,
  template: id,
  className,
}: {
  content: ResumeContent
  template: TemplateId
  className?: string | undefined
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      key={id}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "resume-paper mx-auto min-h-[297mm] w-full max-w-[210mm] rounded-lg border border-line bg-white p-[14mm] text-[10pt] leading-relaxed text-slate-800 shadow-glass",
        className,
      )}
    >
      {template(id, content)}
    </motion.div>
  )
}
