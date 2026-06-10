import { cn } from "./cn"

/** Simple accessible loading spinner (no icon dependency in the ui package). */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent",
        className,
      )}
    />
  )
}
