import { Children } from "react"

/**
 * FilmSteps — reveal N children in order as the scene scrubs.
 *
 * This is Blueprint.tsx's window maths pulled out of the drawing. Everything that file
 * documents about the technique still applies here and is not restated; read it first. The
 * short version, because it is the whole design:
 *
 *   FilmScrub.tsx publishes each scene's local progress as `--scrub-p` on that scene's overlay
 *   container. Every value below is a pure CSS calc() on that variable. No state, no effect, no
 *   rAF, no progress prop — so scrubbing backwards un-reveals for free, and there is no second
 *   "static" renderer to rot. `--scrub-p: 1` IS the finished sequence, and 1 is the registered
 *   initial value (globals.css) as well as every `var()` fallback here, so the mobile, no-JS and
 *   reduced-motion paths land on "fully revealed" without a branch.
 *
 * NO `aria-hidden`, NO conditional mount. A screen reader gets the finished sequence no matter
 * where the scroll is parked — only the eye waits. Opacity is the entire mechanism precisely
 * because it does not touch the accessibility tree. (Note that the frame components consuming
 * this put `role="img"` on their own <figure>, which collapses their subtree for AT and moves
 * the burden onto their `alt`. That is their editorial call, not this component's.)
 *
 * No hooks here on purpose: this renders on the server and ships zero JS. Do not add
 * "use client" without a reason to.
 */

const r = (n: number) => Number(n.toFixed(4))

/**
 * A 0..1 ramp across one window, as a CSS expression.
 *
 * Exported because TerminalRun needs the SAME ramp for a step's progress bar that FilmSteps uses
 * for that step's opacity — deriving one window in two places is a drift bug waiting to happen.
 *
 * The `var()` fallback is belt to the @property initial value's braces: if that registration is
 * ever dropped from globals.css, an unset custom property must still resolve to 1 (revealed)
 * rather than collapsing the declaration and leaving a blank panel. The `max` guard is not
 * theoretical — a caller-supplied zero-width window divides by zero, and `calc(… * infinity)`
 * is invalid, which silently drops the opacity declaration for that step only.
 */
export const scrubRamp = (from: number, to: number) =>
  `clamp(0, (var(--scrub-p, 1) - ${r(from)}) * ${r(1 / Math.max(to - from, 0.001))}, 1)`

/**
 * Even split of 0..1 across `count` steps, each fade running 1.35 slots wide so a step is still
 * arriving as the next one starts — the difference between a sequence and a slideshow.
 *
 * The last window is capped at 1 on purpose: a step whose `to` overshoots never reaches full
 * opacity, and at `--scrub-p: 1` (the static path) that would leave the final line permanently
 * dimmed on every phone and every no-JS render.
 */
export function filmStepWindows(count: number): { from: number; to: number }[] {
  const span = 1 / Math.max(count, 1)
  return Array.from({ length: count }, (_, i) => ({
    from: i * span,
    to: Math.min(1, (i + 1.35) * span),
  }))
}

export interface FilmStepsProps {
  children: React.ReactNode
  /** Fraction of the scene each step occupies before the next begins. Default: even split. */
  // readonly because callers pass windows sliced from `filmStepWindows` or taken straight out of
  // `content/en.ts`, which is `as const`. Nothing here mutates them.
  windows?: readonly { readonly from: number; readonly to: number }[]
  /** Steps stay visible once revealed (default), or hand off one at a time. */
  mode?: "accumulate" | "handoff"
  className?: string
}

export function FilmSteps({ children, windows, mode = "accumulate", className }: FilmStepsProps) {
  // toArray flattens fragments and drops nullish children, so `windows` stays indexed against
  // what actually renders. Mapping over `children` directly misaligns every window after the
  // first `{cond && <x/>}` a caller writes.
  const items = Children.toArray(children)
  const win = windows ?? filmStepWindows(items.length)

  return (
    <div className={className}>
      {items.map((child, i) => {
        const w = win[i] ?? { from: 0, to: 1 }
        const enter = scrubRamp(w.from, w.to)
        // In handoff the step is subtracted away again over the NEXT step's window, so exactly
        // one is lit at a time. The last step has no successor and therefore stays — which is
        // also what the static path renders, so handoff never fails to an empty box.
        const next = mode === "handoff" ? win[i + 1] : undefined
        const opacity = next ? `calc(${enter} * (1 - ${scrubRamp(next.from, next.to)}))` : enter

        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: position IS the identity — step 3 is step 3 whatever node the caller puts in it, and the list never reorders.
            key={i}
            style={{
              opacity,
              // Transform follows the ENTER ramp even in handoff: a step that is fading out
              // should leave in place, not slide back down where it came from.
              // 6px, because anything larger reads as a slide transition rather than a sequence
              // arriving, and at scrub speed nobody perceives the distance anyway.
              transform: `translateY(calc((1 - ${enter}) * 6px))`,
            }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}
