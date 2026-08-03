// Agent 7 — pure presentation helpers (unit-tested in tests/ui-helpers.test.ts).
// No React, no IO: everything here must stay deterministic.

import type { ApplicationStatus } from "@/server/routers/applications"

// ── Eval score colors (spec: ≥8 green, ≥6 amber, else red) ───────────────────

export function scoreBand(score: number | null | undefined): "green" | "amber" | "red" | "none" {
  if (score === null || score === undefined) return "none"
  if (score >= 8) return "green"
  if (score >= 6) return "amber"
  return "red"
}

export const SCORE_BAR_CLASS: Record<ReturnType<typeof scoreBand>, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  none: "bg-slate-300",
}

export const SCORE_TEXT_CLASS: Record<ReturnType<typeof scoreBand>, string> = {
  green: "text-green-700",
  amber: "text-amber-700",
  red: "text-red-700",
  none: "text-slate-500",
}

// ── Tracker status presentation ───────────────────────────────────────────────

export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger"

export const STATUS_META: Record<ApplicationStatus, { label: string; variant: BadgeVariant }> = {
  generated: { label: "Draft ready", variant: "info" },
  approved: { label: "Approved", variant: "info" },
  submitted: { label: "Submitted", variant: "neutral" },
  interview_invited: { label: "Interview", variant: "success" },
  offer_received: { label: "Offer", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  withdrawn: { label: "Withdrawn", variant: "neutral" },
}

/** The only statuses the tracker may set — matches the router's input schema. */
export type TrackerNextStatus = "interview_invited" | "rejected" | "offer_received" | "withdrawn"

/**
 * Post-submission transitions the tracker UI may offer. Must stay a subset of
 * the server's VALID_TRANSITIONS (asserted by a unit test) — the server is
 * still the enforcement point; this only decides which buttons to render.
 * `submitted` is deliberately never offered: it has its own explicit flow.
 */
export const TRACKER_NEXT: Partial<Record<ApplicationStatus, readonly TrackerNextStatus[]>> = {
  submitted: ["interview_invited", "rejected", "offer_received", "withdrawn"],
  interview_invited: ["offer_received", "rejected", "withdrawn"],
  offer_received: ["withdrawn"],
}

// ── Dashboard "Your Jobs" table ───────────────────────────────────────────────

export type TableFilter = "all" | "review" | "applied" | "declined"

const APPLIED: readonly ApplicationStatus[] = ["submitted", "interview_invited", "offer_received"]
const DECLINED: readonly ApplicationStatus[] = ["rejected", "withdrawn"]

/**
 * Which tab a row belongs under. `approved` is deliberately in none of the
 * three named tabs: it is drafted but not sent, so it only shows under All.
 */
export function matchesFilter(status: ApplicationStatus, filter: TableFilter): boolean {
  switch (filter) {
    case "all":
      return true
    case "review":
      return status === "generated"
    case "applied":
      return APPLIED.includes(status)
    case "declined":
      return DECLINED.includes(status)
  }
}

/**
 * Where a row's primary action leads. `submitted` is reachable ONLY from
 * `approved` via the submit screen, so no already-sent row may route there.
 */
export function rowHref(id: string, status: ApplicationStatus): string {
  if (status === "generated") return `/applications/${id}/review`
  if (status === "approved") return `/applications/${id}/submit`
  return "/tracker"
}

// ── Misc formatting ───────────────────────────────────────────────────────────

export function daysSince(date: string | Date | null | undefined, now = new Date()): number | null {
  if (!date) return null
  const then = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(then.getTime())) return null
  const diff = now.getTime() - then.getTime()
  if (diff < 0) return 0
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

/**
 * Scrapers write 0 when a listing omits the wage, so `€0/h` is never a real
 * rate — it is a missing one, and showing it as a number reads like the job
 * pays nothing.
 */
export function formatRate(hourlyRate: number | null): string {
  return hourlyRate === null || hourlyRate <= 0 ? "Rate not stated" : `€${hourlyRate}/h`
}

/** Match scores are 0–10. A 0 means "no signal", not "a terrible match". */
export function formatMatchScore(score: number | null | undefined): string | null {
  return score === null || score === undefined || score <= 0 ? null : score.toFixed(1)
}

export function formatHours(hoursPerWeek: number | null): string {
  return hoursPerWeek === null ? "Hours not stated" : `${hoursPerWeek} h/week`
}
