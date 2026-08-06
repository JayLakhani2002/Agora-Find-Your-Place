import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/cn"

/** Product frame: the "your documents are ready" notification card. */
export function DraftCard({
  title,
  body,
  alt,
  className,
}: {
  title: string
  body: string
  alt: string
  className?: string
}) {
  return (
    <figure
      className={cn("card flex items-start gap-3.5 p-5", className)}
      aria-label={alt}
      role="img"
    >
      <figcaption className="sr-only">{alt}</figcaption>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-wash text-indigo">
        <Icon name="check" className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold leading-snug tracking-[-0.01em] text-text">
          {title}
        </span>
        <span className="mt-0.5 block font-data text-[0.8125rem] leading-snug text-text-soft">
          {body}
        </span>
      </span>
    </figure>
  )
}
