"use client"

import { NAV_ITEMS, isActive } from "@/components/nav-items"
import { cn } from "@agora/ui"
import Link from "next/link"
import { usePathname } from "next/navigation"

const ITEMS = NAV_ITEMS.filter((item) => item.primary)

/** Mobile-only bar. Desktop uses the sidebar rail (see Sidebar). */
export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/50 bg-white/80 backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex max-w-md">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-200",
                active ? "text-primary" : "text-muted hover:text-primary",
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
