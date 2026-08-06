import { cn } from "@/lib/cn"

/**
 * Product frame: step 03, the application filled in and waiting on the user.
 *
 * The note under the button is the product's central promise, not marketing garnish —
 * nothing leaves without an explicit approval, and the frame has to say so.
 */
export function ApplyCard({
  title,
  role,
  fields,
  cta,
  note,
  alt,
  className,
}: {
  title: string
  role: string
  fields: readonly { label: string; value: string }[]
  cta: string
  note: string
  alt: string
  className?: string
}) {
  return (
    <figure className={cn("card p-5", className)} aria-label={alt} role="img">
      <figcaption className="sr-only">{alt}</figcaption>
      <p className="receipt text-[0.6875rem] uppercase tracking-[0.14em]">{title}</p>
      <p className="mt-1.5 text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] text-text">
        {role}
      </p>
      <dl className="mt-4 flex flex-col gap-2 border-t border-ivory-line pt-4">
        {fields.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[0.8125rem] text-text-soft">{f.label}</dt>
            <dd className="font-data text-[0.75rem] text-clay">{f.value}</dd>
          </div>
        ))}
      </dl>
      <span className="btn btn-primary mt-4 w-full text-[0.875rem]">{cta}</span>
      <p className="mt-2.5 text-center text-[0.75rem] text-text-soft">{note}</p>
    </figure>
  )
}
