import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/cn"

/**
 * Product frame: step 01's match-reason chip stack — the "plain-language why" the copy
 * promises. Reasons are illustrative product output attached to the illustrative JobCard,
 * never to a real listing from the index (§3).
 */
export function MatchCard({
  title,
  reasons,
  alt,
  className,
}: {
  title: string
  reasons: readonly string[]
  alt: string
  className?: string
}) {
  return (
    <figure className={cn("card p-5", className)} aria-label={alt} role="img">
      <figcaption className="sr-only">{alt}</figcaption>
      <p className="receipt text-[0.6875rem] uppercase tracking-[0.14em]">{title}</p>
      <ul className="mt-3.5 flex flex-col gap-2.5">
        {reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-clay-wash text-clay">
              <Icon name="check" className="h-2.5 w-2.5" />
            </span>
            <span className="text-[0.8125rem] leading-snug text-text-mute">{reason}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
