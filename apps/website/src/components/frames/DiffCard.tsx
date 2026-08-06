import { cn } from "@/lib/cn"

type DiffRow = { kind: "del" | "add"; text: string }

/**
 * Product frame: step 02's mini diff view — the generic bullet struck through, the
 * tailored rewrite added under it. This is the "every change visible" promise made
 * literal, and it is why the Prep step can claim the rewrite is auditable.
 *
 * The +/− markers are decorative; the kind is also carried by <del>/<ins> semantics, so
 * the meaning survives without colour (a11y: colour is never the only signal).
 */
export function DiffCard({
  title,
  rows,
  alt,
  className,
}: {
  title: string
  rows: readonly DiffRow[]
  alt: string
  className?: string
}) {
  return (
    <figure className={cn("card overflow-hidden", className)} aria-label={alt} role="img">
      <figcaption className="sr-only">{alt}</figcaption>
      <p className="receipt border-b border-ivory-line px-4 py-2.5 text-[0.6875rem] uppercase tracking-[0.14em]">
        {title}
      </p>
      <ul className="flex flex-col">
        {rows.map((row) => {
          const Body = row.kind === "add" ? "ins" : "del"
          return (
            <li
              key={row.text}
              className={cn(
                "flex gap-2.5 border-b border-ivory-line/70 px-4 py-2.5 text-[0.8125rem] leading-snug last:border-b-0",
                row.kind === "add" ? "bg-clay-wash" : "bg-ivory-deep/60",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "font-data text-[0.8125rem] leading-snug",
                  row.kind === "add" ? "text-clay" : "text-text-soft",
                )}
              >
                {row.kind === "add" ? "+" : "−"}
              </span>
              <Body
                className={cn(
                  "no-underline",
                  row.kind === "add" ? "text-text" : "text-text-soft line-through",
                )}
              >
                {row.text}
              </Body>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
