import { cn } from "@/lib/cn"

/** Product frame: the fields Agora reads out of an uploaded CV. */
export function ProfileCard({
  title,
  fields,
  alt,
  className,
}: {
  title: string
  fields: readonly { label: string; value: string }[]
  alt: string
  className?: string
}) {
  return (
    <figure className={cn("card p-4", className)} aria-label={alt} role="img">
      <figcaption className="sr-only">{alt}</figcaption>
      <p className="receipt text-[0.6875rem] uppercase tracking-[0.14em]">{title}</p>
      <dl className="mt-3 flex flex-col gap-2">
        {fields.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[0.8125rem] text-text-mute">{f.label}</dt>
            <dd className="font-data text-[0.8125rem] text-text">{f.value}</dd>
          </div>
        ))}
      </dl>
    </figure>
  )
}
