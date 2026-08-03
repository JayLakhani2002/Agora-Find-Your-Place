import type { LucideIcon } from "lucide-react"
import { Bookmark, CreditCard, FileText, Layers, ListChecks, Search, Settings } from "lucide-react"

export type NavItem = {
  href: string
  label: string
  Icon: LucideIcon
  group: string
  /** Shown in the mobile bottom bar. Keep this to four — more will not fit. */
  primary?: boolean
}

/**
 * Single source of truth for navigation: the desktop sidebar renders every
 * item grouped, the mobile bottom bar renders only `primary` ones.
 * Add a route here only once its page exists — dead links are worse than a
 * short menu.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: Layers, group: "Find work", primary: true },
  { href: "/jobs", label: "Job Search", Icon: Search, group: "Find work", primary: true },
  { href: "/saved", label: "Saved Jobs", Icon: Bookmark, group: "Find work" },
  { href: "/resumes", label: "Resumes", Icon: FileText, group: "Documents" },
  { href: "/tracker", label: "Tracker", Icon: ListChecks, group: "Applications", primary: true },
  { href: "/pricing", label: "Credits", Icon: CreditCard, group: "Account" },
  { href: "/settings", label: "Settings", Icon: Settings, group: "Account", primary: true },
]

export const NAV_GROUPS: readonly string[] = [...new Set(NAV_ITEMS.map((i) => i.group))]

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
