import { useId } from "react"

/**
 * The Agora mark — a window with one pane lit.
 *
 * Three readings, deliberately stacked:
 *   · the agora was literally a public square, and this is a square
 *   · it is a window with a light on at 2am — the hero photograph, reduced to a glyph
 *   · a four-pane grid with one cell active is also a screen, and a match found
 *
 * Construction is geometric on a 32-unit grid: the frame and the mullions sit on exact
 * centre lines, the lit pane fills a true quadrant, and the corner radius is a single
 * value reused by the clip so the lit pane follows the frame perfectly instead of being
 * hand-nudged to fit.
 *
 * The frame and mullions use `currentColor`, so the mark inherits ink on light surfaces
 * and white on dark ones with no variants to maintain. The lit pane stays clay in every
 * context — it is the one fixed colour, because it is the thing the logo is *about*.
 */
export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  // Multiple instances (nav + footer) would otherwise collide on the clip id.
  const clipId = useId()

  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <rect x="4.4" y="4.4" width="23.2" height="23.2" rx="4.4" />
        </clipPath>
      </defs>

      {/* The lit pane — top-right quadrant, clipped to the frame's rounded corner. */}
      <g clipPath={`url(#${clipId})`}>
        <rect x="16" y="0" width="16" height="16" fill="#B5502E" />
      </g>

      {/* Frame and mullions, drawn over the pane so the joins stay crisp. */}
      <rect
        x="4.4"
        y="4.4"
        width="23.2"
        height="23.2"
        rx="4.4"
        stroke="currentColor"
        strokeWidth="2.6"
      />
      <path d="M16 4.4V27.6M4.4 16H27.6" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  )
}
