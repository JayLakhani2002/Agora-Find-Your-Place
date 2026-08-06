"use client"

import { useId } from "react"

/**
 * Blueprint — scene 04 of the hero film. THE ROADMAP SCENE.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * DO NOT REPLACE THIS DRAWING WITH FOOTAGE. Not a screen recording, not a mockup render,
 * not a "just for now" video. The drawing IS the compliance control.
 *
 * Scenes 01–03 are recordings of things that exist. Everything in scene 04 — WhatsApp,
 * Claude/MCP, agent submission — is NOT BUILT. Depicting an unbuilt feature as working
 * software is a misleading commercial act under UWG §5, and this is the exact page AWS reads
 * when it reviews the Bedrock use-case form (root CLAUDE.md). A chip saying "at launch" under
 * a convincing screenshot has already lost that argument: people believe the picture and skim
 * the label. Nobody has ever mistaken a construction drawing for a building.
 *
 * So this is drawn: dashed hairlines, empty wireframe boxes, dimension lines, a plan-sheet
 * title block. It must never look real, and "make it look more real" is a request to break
 * the law, not a design note. Same drawing grammar as sections/Platforms.tsx on purpose —
 * one visual language across the page, so the reader learns "dashed clay = not built yet"
 * once and it holds everywhere.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * THE CLOCK COMES FROM CSS, NOT FROM A PROP.
 *
 * FilmScrub.tsx runs one rAF loop for the whole film and publishes each scene's local
 * progress as `--scrub-p` on that scene's overlay container. This component reads it back in
 * `calc()`. It takes no progress prop, holds no state, and re-renders exactly once — the
 * scrub costs a custom-property write and a style recalc, not a React pass over ~200 nodes
 * per frame. The overlays are plain ReactNode, so the alternative was a callback across the
 * RSC boundary or a setState per scroll frame; both were worse.
 *
 * Two things fall out of that, and both are the point:
 *  - Reversal is free. Every value is a pure function of `--scrub-p`, so scrubbing backwards
 *    undraws. There is no direction to get wrong and no keyframe to fight.
 *  - There is no `static` prop and no reduced-motion branch. `--scrub-p: 1` IS the finished
 *    sheet, and that is the registered initial value (see globals.css), so the mobile, no-JS
 *    and reduced-motion paths are the same code path as everything else. A separate static
 *    renderer is a second thing that can rot without anyone noticing.
 *
 * The ramps are linear rather than the smoothstep this used to compute in JS. `transition`
 * easing is unavailable — nothing here is a state change to transition — and at scrub speed
 * the difference is not perceptible.
 *
 * ACCESSIBILITY — why the copy is real DOM text and not <text> inside the SVG.
 *
 * The graphic is decorative: it carries no information a sighted reader gets that a blind
 * reader doesn't. So the <svg> is aria-hidden and `copy.alt` describes the sheet in prose.
 * But the strings ON the sheet are not decorative — they are the substance of the roadmap
 * claim, and a blind visitor must reach the same conclusion a sighted one does: these three
 * things are drawings of future work. That rules out <text> in an aria-hidden SVG (invisible
 * to AT) and it rules out re-stating the copy in an aria-label (duplicated, unstyleable,
 * unselectable, untranslatable by the browser).
 *
 * So every string is a normal DOM node absolutely positioned over the drawing in the SVG's
 * own coordinate space — exact, because the container's aspect-ratio equals the viewBox's,
 * so `meet` scaling maps user units to percentages 1:1. Real text also gets real font
 * scaling, real selection, and real machine translation for free.
 *
 * Two consequences worth keeping:
 *  - Text opacity follows the scrub, but the nodes are never removed and never aria-hidden.
 *    A screen reader reads the finished sheet no matter where the scroll happens to be
 *    parked; only the eye waits for the pen.
 *  - The `chip-launch` tags and the title block never reference `--scrub-p`, and both pin it
 *    back to 1 so inheritance can never reach them. Legal markings do not animate — if a
 *    visitor stops the film a tenth of the way in, or a crop of this scene ends up in a deck,
 *    "not built" is already on screen. That redundancy (title block + per-panel chips + the
 *    film's own status rail) is deliberate; any one of the three could be lost to a crop.
 */

export interface BlueprintProps {
  copy: {
    titleBlock: string
    chat: { title: string; question: string; answer: string }
    // `readonly`, because the copy comes from `content/en.ts`, which is `as const`. This
    // component never mutates either array, so widening the prop is cheaper and safer than
    // making every caller spread a frozen tuple into a fresh one.
    terminal: { title: string; prompt: string; response: readonly string[] }
    form: { title: string; fields: readonly string[]; button: string; annotation: string }
    launchTag: string
    /** Screen-reader description of the whole sheet, since the drawing itself is decorative SVG. */
    alt: string
  }
}

/* Every panel shares one cell size so the three read as one plan sheet rather than three sketches. */
const VB_W = 320
const VB_H = 400

/**
 * A 0..1 ramp across the scene, as a CSS expression. The `var()` fallback is belt to the
 * @property initial value's braces: if that registration is ever dropped from globals.css,
 * an unset custom property still resolves to 1 — a fully drawn sheet — instead of collapsing
 * the whole declaration.
 */
const ramp = (a: number, b: number) =>
  `clamp(0, (var(--scrub-p, 1) - ${a}) * ${Number((1 / (b - a)).toFixed(3))}, 1)`

/** Opacity over a window, optionally capped below 1 for linework that should stay faint. */
const fade = (a: number, b: number, max = 1) => `calc(${ramp(a, b)}${max === 1 ? "" : ` * ${max}`})`

/** The pen position for PenFrame's mask sweep: 1 (nothing drawn) → 0 (fully drawn). */
const draw = (a: number, b: number) => `calc(1 - ${ramp(a, b)})`

/** Rounded rect as a path, not <rect> — PenFrame needs a single stroke route to trace. */
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}` +
  `h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`

const pct = (v: number, total: number) => `${(v / total) * 100}%`

/**
 * A dashed outline that draws itself in stroke order.
 *
 * A single stroke cannot be both visually dashed AND revealed by stroke-dashoffset — the
 * dasharray is already spent on the dash texture. First attempt faded the dashed frames in
 * as a block, which reads as a slide transition, not a pen. So the reveal moves into a mask:
 * a fat solid stroke sweeps the identical path with the classic `dasharray=1 1 /
 * dashoffset=1-p` trick (pathLength normalises it, so the same numbers work for every shape),
 * and the visible dashed path is only painted where the sweep has already been.
 *
 * The offset goes through `style`, not the attribute — presentation attributes take numbers,
 * and this one is a calc().
 */
function PenFrame({
  maskId,
  d,
  from,
  to,
  sw = 1.1,
  dash = "4 3",
}: {
  maskId: string
  d: string
  from: number
  to: number
  sw?: number
  dash?: string
}) {
  return (
    <>
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="-12"
        y="-12"
        width={VB_W + 24}
        height={VB_H + 24}
      >
        <path
          d={d}
          fill="none"
          stroke="#fff"
          strokeWidth={sw + 9}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          style={{ strokeDashoffset: draw(from, to) }}
        />
      </mask>
      <path
        d={d}
        mask={`url(#${maskId})`}
        fill="none"
        stroke="currentColor"
        strokeWidth={sw}
        strokeDasharray={dash}
        strokeLinejoin="round"
      />
    </>
  )
}

/**
 * Real copy pinned to a point in the drawing's coordinate space. `cy` is the vertical CENTRE
 * of the annotation and the box has no fixed height — a longer string than the panel was
 * drawn for spills symmetrically and stays readable instead of being clipped. Losing a word
 * of a roadmap disclaimer to `overflow: hidden` is the one failure mode not worth trading for
 * tidiness.
 */
function Note({
  x,
  cy,
  w,
  opacity,
  children,
  className = "",
  hidden = false,
}: {
  x: number
  cy: number
  w: number
  opacity: string
  children: React.ReactNode
  className?: string
  hidden?: boolean
}) {
  return (
    <div
      aria-hidden={hidden || undefined}
      className={`absolute -translate-y-1/2 leading-snug ${className}`}
      style={{ left: pct(x, VB_W), top: pct(cy, VB_H), width: pct(w, VB_W), opacity }}
    >
      {children}
    </div>
  )
}

/** Setting-out mark — the same centre-cross Platforms uses to say "this is a survey, not a UI". */
function Crosshair({ x, y, o }: { x: number; y: number; o: string }) {
  return (
    <g style={{ opacity: o }} fill="none" stroke="currentColor" strokeWidth="0.5">
      <circle cx={x} cy={y} r="2.4" />
      <path d={`M${x} ${y - 8}v16M${x - 8} ${y}h16`} />
    </g>
  )
}

/** Pins `--scrub-p` back to 1 for subtrees that must never move with the scrub. */
const PINNED = { "--scrub-p": "1" } as React.CSSProperties

export function Blueprint({ copy }: BlueprintProps) {
  const uid = useId()

  return (
    <figure className="mx-auto w-full max-w-shell px-5 sm:px-8">
      {/*
       * The prose stand-in for the drawing. First in source order so a screen reader is told
       * what kind of thing this is before it starts reading annotations off it.
       */}
      <p className="sr-only">{copy.alt}</p>

      <div className="rounded-card border border-dashed border-clay/35 bg-ivory p-5 sm:p-7">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-6">
          <ChatPanel uid={uid} copy={copy.chat} tag={copy.launchTag} />
          <TerminalPanel uid={uid} copy={copy.terminal} tag={copy.launchTag} />
          <FormPanel uid={uid} copy={copy.form} tag={copy.launchTag} />
        </div>
      </div>

      {/*
       * Title block. Wraps rather than truncates — at 390px this string is wider than the
       * column, and `whitespace-nowrap` here would push the page into horizontal scroll,
       * which the site forbids outright. Two lines of a legible disclaimer beats one line of
       * an ellipsised one. `receipt` is 13px (the `micro` floor) and text-ink is 16.23:1.
       */}
      <figcaption className="mt-6 flex justify-start lg:justify-end" style={PINNED}>
        <span className="inline-flex max-w-full items-center gap-3 rounded-frame border border-dashed border-clay/45 px-4 py-2.5">
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
            className="h-4 w-4 shrink-0 text-clay"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M1 1h14v14H1z" strokeDasharray="3 2" />
              <path d="M1 5h14M5 5v10" />
            </g>
          </svg>
          <span className="receipt uppercase tracking-[0.14em] text-ink">{copy.titleBlock}</span>
        </span>
      </figcaption>
    </figure>
  )
}

/**
 * Shared panel shell. `container-type: inline-size` lets the annotations scale with the
 * column instead of the viewport — the columns are near-identical widths at 390px (stacked)
 * and at 1320px (three across), so one cqw ramp covers both without a breakpoint. The
 * Tailwind text size underneath is not redundant: it is what applies if `cqw` is unsupported,
 * because an invalid clamp() drops the whole declaration and body text at 17px would burst
 * these boxes.
 */
function Panel({
  title,
  tag,
  children,
}: {
  title: string
  tag: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <div
        className="relative aspect-[320/400] w-full text-[0.8125rem] text-clay"
        style={{ containerType: "inline-size", fontSize: "clamp(0.75rem, 3.6cqw, 0.875rem)" }}
      >
        {children}
      </div>
      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
        style={PINNED}
      >
        <p className="font-semibold text-ink">{title}</p>
        <span className="chip chip-launch">{tag}</span>
      </div>
    </div>
  )
}

/* ── Panel A · phone, chat ────────────────────────────────────────────────────────────── */

const PHONE = rr(48, 14, 224, 372, 22)
const SCREEN = rr(60, 40, 200, 320, 12)
const Q_BUBBLE = rr(96, 62, 164, 62, 12)
const A_BUBBLE = rr(64, 140, 184, 166, 12)
const JOB_ROW = rr(76, 214, 160, 78, 8)

function ChatPanel({
  uid,
  copy,
  tag,
}: {
  uid: string
  copy: BlueprintProps["copy"]["chat"]
  tag: string
}) {
  return (
    <Panel title={copy.title} tag={tag}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        <PenFrame maskId={`${uid}-phone`} d={PHONE} from={0.0} to={0.14} />
        <g fill="none" stroke="currentColor">
          <path d="M138 27h44" strokeWidth="1.2" style={{ opacity: fade(0.0, 0.14) }} />
          <path
            d={SCREEN}
            strokeWidth="0.6"
            strokeDasharray="2 4"
            style={{ opacity: fade(0.06, 0.17, 0.7) }}
          />
          {/* Extension lines running off the sheet — a drawing gets measured, a screenshot doesn't. */}
          <path
            d="M18 14h30M272 14h30"
            strokeWidth="0.6"
            strokeDasharray="2 4"
            style={{ opacity: fade(0.33, 0.4, 0.9) }}
          />
        </g>
        <PenFrame maskId={`${uid}-q`} d={Q_BUBBLE} from={0.13} to={0.21} sw={0.9} />
        <PenFrame maskId={`${uid}-a`} d={A_BUBBLE} from={0.21} to={0.29} sw={0.9} />
        {/*
         * The job row is drawn EMPTY on purpose. Filling it with a plausible title, employer
         * and salary would invent a listing — and inventing data on a marketing page is the
         * same UWG §5 problem the whole scene exists to avoid. The reader gets the shape of
         * an answer; the answer itself is left un-drawn.
         */}
        <g style={{ opacity: fade(0.29, 0.38) }}>
          <path
            d={JOB_ROW}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeDasharray="4 3"
          />
          <g fill="none" stroke="currentColor" strokeWidth="0.8">
            <path d="M88 232h110M88 248h74" opacity="0.75" />
            <path d={rr(88, 264, 48, 16, 8)} strokeWidth="0.6" strokeDasharray="3 2" />
            <path d={rr(144, 264, 38, 16, 8)} strokeWidth="0.6" strokeDasharray="3 2" />
          </g>
        </g>
        <Crosshair x={272} y={352} o={fade(0.33, 0.4, 0.8)} />
      </svg>

      <Note x={104} cy={93} w={148} opacity={fade(0.16, 0.23)} className="text-right text-ink">
        {copy.question}
      </Note>
      <Note x={76} cy={176} w={160} opacity={fade(0.24, 0.31)} className="text-ink">
        {copy.answer}
      </Note>
    </Panel>
  )
}

/* ── Panel B · terminal ───────────────────────────────────────────────────────────────── */

const WINDOW = rr(20, 78, 280, 224, 10)

function TerminalPanel({
  uid,
  copy,
  tag,
}: {
  uid: string
  copy: BlueprintProps["copy"]["terminal"]
  tag: string
}) {
  // Response length is prop-driven, so the line pitch has to close up rather than run off the
  // bottom of the window. 130 units is the drawable band between the prompt and the frame.
  const lines = copy.response
  const step = Math.min(26, 130 / Math.max(lines.length, 1))
  const bar = fade(0.4, 0.48)

  return (
    <Panel title={copy.title} tag={tag}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        <PenFrame maskId={`${uid}-term`} d={WINDOW} from={0.32} to={0.46} />
        <g fill="none" stroke="currentColor">
          <path d="M20 108h280" strokeWidth="0.9" style={{ opacity: bar }} />
          <g style={{ opacity: bar }}>
            <circle cx="34" cy="93" r="3.4" />
            <circle cx="46" cy="93" r="3.4" />
            <circle cx="58" cy="93" r="3.4" />
          </g>
          <path
            d="M34 128l7 6-7 6"
            strokeWidth="1.3"
            strokeLinejoin="round"
            style={{ opacity: fade(0.48, 0.53) }}
          />
          <path
            d={`M26 152v${Math.max(lines.length, 1) * step}`}
            strokeWidth="0.6"
            strokeDasharray="2 4"
            style={{ opacity: fade(0.56, 0.64, 0.8) }}
          />
          <path
            d="M4 78h16M300 78h16"
            strokeWidth="0.6"
            strokeDasharray="2 4"
            style={{ opacity: fade(0.66, 0.72, 0.9) }}
          />
        </g>
        <Crosshair x={286} y={288} o={fade(0.66, 0.72, 0.8)} />
      </svg>

      {/*
       * The title bar label repeats the panel caption, so it is aria-hidden — a screen reader
       * should hear "Claude / MCP" once, not twice. This is the only copy in the component
       * hidden from AT, and only because the visible caption already carries it.
       */}
      <Note
        x={72}
        cy={93}
        w={210}
        opacity={fade(0.44, 0.5)}
        hidden
        className="receipt truncate text-ink"
      >
        {copy.title}
      </Note>
      <Note x={48} cy={134} w={240} opacity={fade(0.5, 0.56)} className="receipt text-ink">
        {copy.prompt}
      </Note>
      {lines.map((line, i) => (
        <Note
          key={line}
          x={34}
          cy={158 + i * step + step / 2}
          w={250}
          opacity={fade(0.56 + i * 0.035, 0.63 + i * 0.035)}
          className="receipt"
        >
          {line}
        </Note>
      ))}
    </Panel>
  )
}

/* ── Panel C · application form ───────────────────────────────────────────────────────── */

const SHEET = rr(28, 10, 264, 300, 8)

function FormPanel({
  uid,
  copy,
  tag,
}: {
  uid: string
  copy: BlueprintProps["copy"]["form"]
  tag: string
}) {
  const fields = copy.fields
  const n = Math.max(fields.length, 1)
  const step = Math.min(58, 168 / n)
  const btnY = 60 + n * step + 16

  return (
    <Panel title={copy.title} tag={tag}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        <PenFrame maskId={`${uid}-sheet`} d={SHEET} from={0.64} to={0.76} />
        <g fill="none" stroke="currentColor">
          <path d="M28 44h264" strokeWidth="0.9" style={{ opacity: fade(0.7, 0.78) }} />
          {/* Hatching — Platforms' shorthand for "this face is cut, not photographed". */}
          <g strokeWidth="0.5" style={{ opacity: fade(0.72, 0.8, 0.7) }}>
            <path d="M32 20l10 10M32 28l10 10M40 14l10 10" />
          </g>
        </g>
        {fields.map((label, i) => (
          <path
            key={label}
            d={rr(48, 60 + i * step, 224, step - 14, 6)}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeDasharray="4 3"
            style={{ opacity: fade(0.72 + i * 0.03, 0.79 + i * 0.03) }}
          />
        ))}
        {/* The button is the heaviest line on the sheet: it is the thing the annotation points at. */}
        <path
          d={rr(48, btnY, 224, 46, 10)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="6 4"
          style={{ opacity: fade(0.84, 0.91) }}
        />
        {/*
         * The dimension line. Not decoration — it is the sentence "your approval, per
         * application" made into a measurement, which is the only honest way to draw a
         * submission step that does not exist yet.
         */}
        <g fill="none" stroke="currentColor" style={{ opacity: fade(0.9, 0.97) }}>
          <path
            d={`M48 ${btnY + 50}v32M272 ${btnY + 50}v32`}
            strokeWidth="0.6"
            strokeDasharray="2 4"
          />
          <path d={`M48 ${btnY + 78}h224`} strokeWidth="0.8" />
          <path
            d={`M56 ${btnY + 75}l-8 3 8 3M264 ${btnY + 75}l8 3-8 3`}
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      {fields.map((label, i) => (
        <Note
          key={label}
          x={58}
          cy={60 + i * step + (step - 14) / 2}
          w={204}
          opacity={fade(0.74 + i * 0.03, 0.81 + i * 0.03)}
          className="receipt text-ink"
        >
          {label}
        </Note>
      ))}
      <Note
        x={48}
        cy={btnY + 23}
        w={224}
        opacity={fade(0.86, 0.92)}
        className="text-center font-semibold text-ink"
      >
        {copy.button}
      </Note>
      <Note
        x={30}
        cy={btnY + 106}
        w={260}
        opacity={fade(0.93, 1.0)}
        className="receipt text-center text-ink"
      >
        {copy.annotation}
      </Note>
    </Panel>
  )
}
