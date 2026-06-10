import { cn } from "./cn"

export interface ProgressProps {
  /** 0–100 */
  value: number
  /** Tailwind class for the filled bar, e.g. "bg-green-500" */
  barClassName?: string
  className?: string
  label?: string
}

/**
 * Horizontal progress / score bar. The visual is decorative for assistive
 * tech — callers render the numeric value as adjacent text; an optional
 * sr-only line repeats it so the bar is never the only carrier of meaning.
 */
export function Progress({ value, barClassName, className, label }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <>
      <div
        aria-hidden
        className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-200", className)}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            barClassName ?? "bg-primary",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label && (
        <span className="sr-only">
          {label}: {Math.round(clamped)} percent
        </span>
      )}
    </>
  )
}
