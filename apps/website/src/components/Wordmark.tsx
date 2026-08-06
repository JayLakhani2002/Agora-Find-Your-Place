import { Logo } from "@/components/ui/Logo"
import { en } from "@/content/en"
import { cn } from "@/lib/cn"

/**
 * The full lockup: the lit-window mark, then "agora" in the display face.
 *
 * The name drops `.jobs` (Jay, v6). A logo that spells out the category dates the moment
 * the company outgrows it, and the mark now carries the identity — the wordmark only has
 * to say the name. The domain can still be agora.jobs; the logo doesn't have to.
 *
 * Everything inherits `currentColor`, so placing this on ink versus ivory needs no
 * variant — only the lit pane holds its clay, everywhere.
 */
export function Wordmark({
  className,
  markClassName = "h-7 w-7",
}: {
  className?: string
  markClassName?: string | undefined
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo className={markClassName} />
      <span className="font-display font-bold tracking-[-0.03em]">{en.brand.name}</span>
    </span>
  )
}
