"use client"

import {
  SCORE_TEXT_CLASS,
  STATUS_META,
  type TableFilter,
  daysSince,
  rowHref,
  scoreBand,
} from "@/lib/ui"
import type { ApplicationStatus } from "@/server/routers/applications"
import { Badge, Card } from "@agora/ui"
import Link from "next/link"

export type ApplicationRow = {
  id: string
  status: ApplicationStatus
  generationStatus: "pending" | "processing" | "complete" | "failed"
  overallScore: number | null
  job: { title: string; company: string; location: string } | null
  userSubmittedAt: Date | string | null
  createdAt: Date | string
}

function rowActionLabel(row: ApplicationRow): string {
  if (row.status === "generated") {
    return row.generationStatus === "complete" ? "Review" : "Preparing…"
  }
  if (row.status === "approved") return "Apply"
  return "Open"
}

function updatedLabel(row: ApplicationRow): string {
  const days = daysSince(row.userSubmittedAt ?? row.createdAt)
  if (days === null) return "—"
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

export function ApplicationsTable({ rows }: { rows: ApplicationRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="text-center">
        <h2 className="mb-2 text-lg font-bold">Nothing here yet</h2>
        <p className="text-sm text-muted">
          Swipe right on a match in Quick Review and it will appear in this list.
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              Company
            </th>
            <th scope="col" className="px-5 py-3 font-semibold">
              Job posting
            </th>
            <th scope="col" className="px-5 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-5 py-3 font-semibold">
              Updated
            </th>
            <th scope="col" className="px-5 py-3 text-right font-semibold">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const meta = STATUS_META[row.status]
            return (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-3 font-medium">{row.job?.company ?? "—"}</td>
                <td className="px-5 py-3">
                  <span>{row.job?.title ?? "Listing removed"}</span>
                  {row.overallScore !== null && (
                    <span
                      className={`ml-2 font-semibold ${SCORE_TEXT_CLASS[scoreBand(row.overallScore)]}`}
                    >
                      {row.overallScore.toFixed(1)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </td>
                <td className="px-5 py-3 text-muted">{updatedLabel(row)}</td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={rowHref(row.id, row.status)}
                    className="inline-flex min-h-9 items-center rounded-lg px-3 font-semibold text-primary hover:bg-primary/10"
                  >
                    {rowActionLabel(row)}
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}
