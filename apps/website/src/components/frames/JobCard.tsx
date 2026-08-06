import { cn } from "@/lib/cn"

/**
 * Product frame: a job listing card as the app renders it.
 *
 * Honesty (§3): `company` is a sector label, never a real employer — a fabricated listing
 * under a real company's name would imply a relationship we do not have. Real employer
 * names appear only in the proof wall and the listing ticker, where the rows are real.
 */
export function JobCard({
  company,
  title,
  chips,
  alt,
  className,
  compact = false,
}: {
  company: string
  title: string
  chips: readonly string[]
  alt: string
  className?: string
  compact?: boolean
}) {
  return (
    <figure
      className={cn("card w-full", compact ? "p-4" : "p-5 sm:p-6", className)}
      aria-label={alt}
      role="img"
    >
      <figcaption className="sr-only">{alt}</figcaption>
      <p className="text-[0.8125rem] text-text-soft">{company}</p>
      <p
        className={cn(
          "mt-1 font-semibold tracking-[-0.01em] text-text",
          compact ? "text-[0.9375rem] leading-snug" : "text-lg leading-snug",
        )}
      >
        {title}
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {chips.map((chip, i) => (
          <span key={chip} className={cn("chip", i === 0 && "chip-brand")}>
            {chip}
          </span>
        ))}
      </div>
    </figure>
  )
}
