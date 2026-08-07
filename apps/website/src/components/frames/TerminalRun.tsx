import { FilmSteps, filmStepWindows, scrubRamp } from "@/components/ui/FilmSteps"
import { cn } from "@/lib/cn"

/**
 * TerminalRun — a CLI transcript that types itself from the scroll position.
 *
 * Same shell as EngineTheater.tsx (title bar, three dots, mono body, status dot) deliberately:
 * the reader should learn "dark mono panel = the engine doing work" once and have it hold
 * everywhere. What is NOT shared is the mechanism. EngineTheater runs a GSAP timeline on a
 * repeat loop; this has no GSAP, no timers and no effects at all. Lines reveal purely from
 * `--scrub-p` via FilmSteps, so the transcript is scrubbable in both directions and its finished
 * state is what a phone, a crawler and a reduced-motion visitor render (see FilmSteps.tsx).
 *
 * WHY THE BAR IS DECORATIVE AND THE STRING IS NOT. A step row draws a filling bar, but the
 * `result` string is the only thing that states an outcome. A bar can be misread, cropped, or
 * lost to a rendering failure; a bar is also the easiest place to imply a quantity nobody
 * measured. So the bar is `aria-hidden`, the result reads at 16.19:1 on ink, and nothing is
 * communicated by fill alone.
 *
 * NO `role="img"` HERE, DELIBERATELY DIVERGING FROM THE OTHER frames/* COMPONENTS.
 *
 * MatchCard, DiffCard and the rest wrap themselves in `role="img"` with an `aria-label`, which
 * collapses the subtree so assistive tech hears the label and nothing inside. That is defensible
 * for a decorative sample card. It is not defensible here, because one line in this transcript is
 * the `prompt` — the beat where a person approves before anything is submitted. That is the
 * honest part of the story and it must not be the one detail only sighted visitors receive.
 *
 * Making `alt` carry it instead would work only for as long as whoever next edits the copy
 * remembers to keep it in sync with `lines`. A legal marking that depends on copy discipline is
 * a marking that will eventually be wrong. So the transcript stays real, readable DOM text, and
 * `alt` is a plain summary in an sr-only caption rather than a replacement for the content.
 */

export type TerminalLine =
  | { kind: "command"; text: string }
  | { kind: "step"; label: string; result: string }
  | { kind: "prompt"; text: string }
  | { kind: "done"; text: string }

export interface TerminalRunProps {
  title: string
  lines: readonly TerminalLine[]
  alt: string
  className?: string
}

export function TerminalRun({ title, lines, alt, className }: TerminalRunProps) {
  // Computed here, not inside FilmSteps, because a step row needs its own window twice: once for
  // the row's opacity (FilmSteps) and once for the bar's width. One table, one source of truth.
  const windows = filmStepWindows(lines.length)

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-card bg-ink text-text-on-dark shadow-float ring-1 ring-ink-line",
        className,
      )}
    >
      <figcaption className="sr-only">{alt}</figcaption>

      <div className="flex items-center gap-2 border-b border-ink-line px-4 py-3 sm:px-5">
        <span aria-hidden="true" className="flex shrink-0 gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-clay-soft/60" />
        </span>
        <span className="ml-1.5 min-w-0 truncate font-data text-[0.75rem] text-text-on-dark/80">
          {title}
        </span>
        {/* No status TEXT, unlike EngineTheater: this component takes no status string and
            inventing one ("live", "running") would be a claim rather than a graphic. */}
        <span
          aria-hidden="true"
          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-clay-soft"
        />
      </div>

      <FilmSteps
        windows={windows}
        className="flex flex-col gap-2.5 px-4 py-5 font-data text-[0.75rem] leading-relaxed sm:px-5 sm:text-[0.8125rem]"
      >
        {lines.map((line, i) => (
          <Line key={lineKey(line)} line={line} window={windows[i]} />
        ))}
      </FilmSteps>
    </figure>
  )
}

/** Content-derived so React keeps a row's identity if the copy file reorders lines. */
const lineKey = (line: TerminalLine) =>
  `${line.kind}:${line.kind === "step" ? line.label : line.text}`

// `window` is explicitly `| undefined` rather than optional: `noUncheckedIndexedAccess` makes
// `windows[i]` possibly-undefined, and `exactOptionalPropertyTypes` then refuses to pass that
// into an optional prop. Stating the undefined is the honest signature.
function Line({
  line,
  window: w,
}: { line: TerminalLine; window: { from: number; to: number } | undefined }) {
  if (line.kind === "command") {
    return (
      <p className="flex items-start gap-2">
        <span aria-hidden="true" className="shrink-0 text-clay-soft">
          $
        </span>
        <span className="min-w-0 break-words text-text-on-dark">{line.text}</span>
      </p>
    )
  }

  if (line.kind === "prompt") {
    /*
     * The confirmation. It is boxed and lifted onto ink-card so it visually STOPS the transcript
     * — the point of the whole run is that the machine pauses and a person answers, and a line
     * styled like every other line reads as the machine narrating rather than asking.
     * on-dark/ink-card is 14.58:1, clay-soft/ink-card 6.13:1.
     */
    return (
      <p className="flex items-start gap-2 rounded-frame border border-ink-line bg-ink-card px-3 py-2.5">
        <span aria-hidden="true" className="shrink-0 text-clay-soft">
          ?
        </span>
        <span className="min-w-0 break-words font-medium text-text-on-dark">{line.text}</span>
      </p>
    )
  }

  if (line.kind === "done") {
    return (
      <p className="mt-1 flex items-start gap-2 border-t border-ink-line pt-3">
        <span aria-hidden="true" className="shrink-0 text-clay-soft">
          ✓
        </span>
        <span className="min-w-0 break-words text-text-on-dark">{line.text}</span>
      </p>
    )
  }

  return (
    <div>
      {/*
       * `items-end` rather than `items-baseline`: a long label wraps at 390px, and baseline
       * alignment would strand the leader dots up against its FIRST line, halfway up the row.
       * `min-w-0` on the label and `shrink-0` on the result mean the leader is the only thing
       * that ever gives way — the result string never truncates, because it is the payload.
       */}
      <div className="flex items-end gap-2">
        <span className="min-w-0 break-words text-text-on-dark-mute">{line.label}</span>
        <span
          aria-hidden="true"
          className="mb-[0.34em] h-0 min-w-[1rem] flex-1 border-ink-line border-b border-dotted"
        />
        <span className="shrink-0 text-text-on-dark">{line.result}</span>
      </div>
      <div aria-hidden="true" className="mt-1.5 h-[2px] w-full rounded-full bg-ink-line">
        <div
          className="h-[2px] rounded-full bg-clay-soft/70"
          // Same window as the row's own reveal, so the bar finishes filling exactly as the
          // result becomes legible. Width is a calc() on --scrub-p like everything else — see
          // FilmSteps.tsx for why this is a style property and never an attribute.
          style={{ width: `calc(${scrubRamp(w?.from ?? 0, w?.to ?? 1)} * 100%)` }}
        />
      </div>
    </div>
  )
}
