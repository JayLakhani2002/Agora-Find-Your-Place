"use client"

import { STATUS_META } from "@/lib/ui"
import type { ApplicationStatus } from "@/server/routers/applications"
import { Badge } from "@agora/ui"

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
