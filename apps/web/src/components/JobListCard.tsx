"use client"

import { safeHttpUrl } from "@/lib/safe-url"
import { formatHours, formatRate } from "@/lib/ui"
import { Badge, Button, Card } from "@agora/ui"
import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react"

export type JobListItem = {
  id: string
  title: string
  company: string
  location: string
  contractType: string
  hourlyRate: number | null
  hoursPerWeek: number | null
  requiredSkills: string[] | null
  sourceUrl: string
  saved: boolean
}

export function JobListCard({
  job,
  onToggleSave,
  pending,
}: {
  job: JobListItem
  onToggleSave: (job: JobListItem) => void
  pending?: boolean
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold">{job.title}</h3>
          <p className="text-sm text-muted">
            {job.company} · {job.location}
          </p>
        </div>
        <Badge variant="info">{job.contractType}</Badge>
      </div>

      <p className="text-sm text-muted">
        {formatRate(job.hourlyRate)} · {formatHours(job.hoursPerWeek)}
      </p>

      {job.requiredSkills && job.requiredSkills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {job.requiredSkills.slice(0, 6).map((skill) => (
            <li key={skill}>
              <Badge>{skill}</Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant={job.saved ? "primary" : "outline"}
          size="sm"
          disabled={pending}
          onClick={() => onToggleSave(job)}
          aria-pressed={job.saved}
        >
          {job.saved ? <BookmarkCheck size={16} aria-hidden /> : <Bookmark size={16} aria-hidden />}
          {job.saved ? "Saved" : "Save"}
        </Button>
        <a
          href={safeHttpUrl(job.sourceUrl) ?? undefined}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-primary hover:bg-primary/10"
        >
          <ExternalLink size={16} aria-hidden />
          Go to listing
        </a>
      </div>
    </Card>
  )
}
