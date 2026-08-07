import { cn } from "@/lib/cn"

/**
 * Browser — the minimum chrome that reads as "this is a website", and nothing else.
 *
 * Three dots, one address bar, the page. No tabs, no back/forward, no bookmarks bar, no
 * extension row. Every one of those is a UI element we would have to INVENT, and an invented
 * affordance on a marketing page is either meaningless decoration or a claim about a browser we
 * do not ship. The chrome's whole job is to say "the thing below is a real page in a real
 * browser" in the first 200ms of looking at it.
 *
 * The shell is opaque (`bg-ivory`), not translucent, because these frames sit over moving
 * footage in the hero film — anything relying on the backdrop for contrast is legible on some
 * frames and not others. Same reason the address bar is a solid ivory pill rather than a tinted
 * one: `.receipt` is text-soft, 5.43:1 on ivory, and that number only holds against ivory.
 *
 * No `alt`: this component carries no meaning of its own. The `url` is real text a screen reader
 * should read, and whatever is passed as `children` brings its own description.
 */
export interface BrowserProps {
  url: string
  children: React.ReactNode
  className?: string
}

export function Browser({ url, children, className }: BrowserProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card bg-ivory shadow-float ring-1 ring-ivory-line",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-ivory-line bg-ivory-deep px-3 py-2.5">
        <span aria-hidden="true" className="flex shrink-0 gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ivory-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-ivory-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-ivory-line" />
        </span>
        {/*
         * `min-w-0` is what actually stops a long URL from pushing the frame past the viewport
         * at 390px — a flex child's default min-width is its content, so `truncate` alone does
         * nothing here and the page picks up a horizontal scrollbar, which the site forbids.
         */}
        <p className="receipt min-w-0 flex-1 truncate rounded-pill border border-ivory-line bg-ivory px-3 py-1 text-[0.75rem]">
          {url}
        </p>
      </div>
      <div className="bg-ivory">{children}</div>
    </div>
  )
}
