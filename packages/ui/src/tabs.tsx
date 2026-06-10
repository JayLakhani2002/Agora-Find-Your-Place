"use client"

import type { ReactNode } from "react"
import { cn } from "./cn"

export interface TabItem {
  value: string
  label: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Controlled tab bar (no headless-ui dependency). The active panel is the
 * caller's responsibility — this renders only the accessible tablist.
 */
export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn("flex gap-1 rounded-xl bg-sky-100/70 p-1", className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "min-h-11 flex-1 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors duration-200",
              active ? "bg-white text-primary shadow-sm" : "text-muted hover:text-primary",
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
