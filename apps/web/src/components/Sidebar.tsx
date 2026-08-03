"use client"

import { NAV_GROUPS, NAV_ITEMS, isActive } from "@/components/nav-items"
import { cn } from "@agora/ui"
import Link from "next/link"
import { usePathname } from "next/navigation"

/** Desktop-only rail. Mobile keeps the bottom bar (see BottomNav). */
export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 overflow-y-auto border-r border-white/50 bg-white/70 px-3 py-6 backdrop-blur-md md:flex"
    >
      <Link href="/dashboard" className="px-3 text-lg font-bold text-primary">
        Agora
      </Link>

      {NAV_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-1">
          <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {group}
          </h2>
          {NAV_ITEMS.filter((item) => item.group === group).map(({ href, label, Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200",
                  active ? "bg-primary/10 text-primary" : "text-muted hover:text-primary",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 2} aria-hidden />
                {label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
