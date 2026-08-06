import { cn } from "@/lib/cn"

/**
 * Background aurora mesh (BUILD-GUIDE §2 texture layer). Decorative, behind everything,
 * pointer-events none. Backgrounds and blooms only — never a flat fill, never text.
 *
 *   warm  — the sand aura at the top of the hero shell
 *   cool  — brand→teal on the dark bands
 *   ember — the warm close on the final CTA band
 *
 * The scaled, blurred mesh sits inside its own `overflow-hidden` frame. Transforms DO
 * extend scrollable overflow, so without this frame a drifting aurora would widen the
 * document and give the page a horizontal scrollbar. Clipping it here also keeps the
 * fix local — no `overflow` on the band, which would interact with the pinned scene.
 */
export function Aurora({
  tone = "warm",
  dark = false,
  slow = false,
  className,
}: {
  tone?: "warm" | "cool" | "ember"
  dark?: boolean
  slow?: boolean
  className?: string
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className={cn(
          "aurora",
          `aurora-${tone}`,
          dark && "aurora-dark",
          slow && "aurora-slow",
          className,
        )}
      />
    </div>
  )
}
