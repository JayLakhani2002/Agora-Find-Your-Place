import { cn } from "@/lib/cn"
import type { ReactNode } from "react"

/**
 * Shared phone-frame wrapper for all product mockups. Pure presentation —
 * the contents (and any animation) belong to the mock inside.
 */
export function DeviceFrame({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode
  tone?: "light" | "dark"
  className?: string | undefined
}) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[9/18] w-[min(72vw,280px)] overflow-hidden rounded-[2.2rem] border-[6px] shadow-xl",
        tone === "dark"
          ? "border-ink-soft bg-ink text-text-on-ink"
          : "border-ink bg-marble text-text",
        className,
      )}
    >
      {/* Notch */}
      <div
        aria-hidden
        className={cn(
          "absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full",
          tone === "dark" ? "bg-text-on-ink/15" : "bg-ink/15",
        )}
      />
      <div className="h-full w-full overflow-hidden pt-7">{children}</div>
    </div>
  )
}
