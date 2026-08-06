import { cn } from "@/lib/cn"

type Row = { role: string; status: string; tone: "good" | "warm" | "neutral" }

/** Product frame: rows from the application tracker (§4.3, step 04). */
export function TrackerRows({
  rows,
  alt,
  className,
}: {
  rows: readonly Row[]
  alt: string
  className?: string
}) {
  return (
    <figure className={cn("flex flex-col gap-2", className)} aria-label={alt} role="img">
      <figcaption className="sr-only">{alt}</figcaption>
      {rows.map((row) => (
        <span
          key={row.role}
          className="flex items-center justify-between gap-3 rounded-frame border border-ivory-line bg-white px-3.5 py-3"
        >
          <span className="truncate text-[0.875rem] font-medium text-text">{row.role}</span>
          <span
            className={cn(
              "chip shrink-0",
              row.tone === "good" && "chip-brand",
              row.tone === "warm" && "chip-launch",
            )}
          >
            {row.status}
          </span>
        </span>
      ))}
    </figure>
  )
}
