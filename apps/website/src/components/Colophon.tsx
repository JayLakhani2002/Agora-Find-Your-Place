import { claims } from "@/content/claims"
import { berlinDate, liveData } from "@/content/live-data"
import { type CSSProperties, Fragment, type ReactNode } from "react"

/**
 * Colophon — the footer's deploy receipt.
 *
 * This replaced the line "Made in Berlin · Hosted in the EU · GDPR-first", which asserted three
 * things and evidenced none of them. Everything printed here is checkable: coordinates you can
 * paste into a map, the commit this bundle was built from, and the clock off the last nightly
 * scrape. Same mechanic as the rest of the site — a claim the reader can go and verify beats a
 * claim stated more confidently.
 *
 * The EU/GDPR half is deliberately louder than it was, not quieter. A scan of twelve rival
 * platforms found exactly one showing any compliance signal at all, so this is unclaimed
 * ground; folding it into a decorative flourish would give away the only trust wedge nobody
 * else is holding.
 *
 * VALUES ARE NOT COPY. Labels arrive as props because Jay owns `content/en.ts`; the sha, the
 * build date and the scan clock are read here from `process.env` and `claims`/`live-data`,
 * which is the only way the copy file cannot hand-type one of them. That split is the whole
 * point of `content/claims.ts` and it holds here too.
 */

/** Truncated at render, never stored — 7 is what `git log --oneline` and GitHub both show. */
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)

/**
 * `scripts/fetch-live-data.mts` runs as `prebuild` and stamps this on every build, so it is
 * the date the bundle was actually cut. There is no Vercel env var for a commit date, and a
 * hand-typed one is exactly what this component exists to refuse.
 */
const buildDate = berlinDate(liveData.generatedAt)

export interface ColophonProps {
  /** Line 1 lead, e.g. "MADE IN BERLIN". Rendered muted. */
  madeIn: string
  /** Line 1 value — Berlin's coordinates, e.g. "52.5200° N, 13.4050° E". Rendered in clay. */
  coordinates: string
  /** Line 2, whole. The hosting claim, e.g. "HOSTED IN THE EU". Rendered in clay. */
  hosting: string
  /** Line 3 lead, e.g. "GDPR-FIRST". Rendered in clay. */
  gdpr: string
  /** Line 3 detail, e.g. "export or delete everything, any time". Rendered muted. */
  gdprDetail: string
  /** Line 4 label before the commit sha, e.g. "BUILD". */
  buildLabel: string
  /** Line 4 label before the scan clock, e.g. "LAST SCAN". */
  scanLabel: string
  /** Zone suffix on the scan clock, e.g. "CET" — matches how en.ts already labels this clock. */
  timezone: string
  className?: string
}

export function Colophon({
  madeIn,
  coordinates,
  hosting,
  gdpr,
  gdprDetail,
  buildLabel,
  scanLabel,
  timezone,
  className = "",
}: ColophonProps) {
  /*
   * A missing sha drops the segment entirely rather than printing a placeholder. Locally and
   * on any non-Vercel build `VERCEL_GIT_COMMIT_SHA` is simply absent, and a receipt that
   * invents its own build id is worse than a receipt with one fewer field.
   */
  const buildFields = [
    commitSha ? { label: buildLabel, value: commitSha } : null,
    { label: null, value: buildDate },
    { label: scanLabel, value: `${claims.lastScan.value} ${timezone}` },
  ].filter((f): f is { label: string | null; value: string } => f !== null)

  return (
    <div
      className={`flex flex-col gap-6 border-y border-ink-line py-7 font-data text-[0.75rem] leading-[1.9] tracking-[0.01em] text-text-on-dark-mute sm:flex-row sm:items-center sm:gap-8 sm:text-[0.8125rem] ${className}`}
    >
      <Fernsehturm />

      {/* min-w-0 so the mono lines wrap inside the flex row instead of pushing the shell wide. */}
      <div className="min-w-0">
        <Line i={0}>
          {madeIn} · <Val>{coordinates}</Val>
        </Line>
        <Line i={1}>
          <Val>{hosting}</Val>
        </Line>
        <Line i={2}>
          <Val>{gdpr}</Val> · {gdprDetail}
        </Line>
        <Line i={3}>
          {/* The separator sits OUTSIDE the nowrap span, so at 390px this line breaks at a
              `·` like a receipt rather than stranding "LAST SCAN" from its clock. */}
          {buildFields.map((f, i) => (
            <Fragment key={f.value}>
              {i > 0 ? " · " : null}
              <span className="whitespace-nowrap">
                {f.label ? `${f.label} ` : null}
                <Val>{f.value}</Val>
              </span>
            </Fragment>
          ))}
          <span data-colophon-caret aria-hidden="true" className="ml-1">
            ▍
          </span>
        </Line>
      </div>
    </div>
  )
}

/** One printed line. `--i` is its position in the feed; the stagger lives in globals.css. */
function Line({ i, children }: { i: number; children: ReactNode }) {
  return (
    <p data-colophon-line style={{ "--i": i } as CSSProperties}>
      {children}
    </p>
  )
}

/**
 * The checkable token in a line. Clay is reserved for values, prose stays muted — so the eye
 * lands on the things a reader can go and verify. Never wraps: half a coordinate or half a
 * sha is not a value, it is a typo.
 */
function Val({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap text-clay-soft">{children}</span>
}

/**
 * The Fernsehturm, as a measured drawing rather than a landmark illustration.
 *
 * Same sheet as `sections/Platforms.tsx`: single-weight linework at 1.1, annotation at half
 * that and knocked back on opacity, dashed extension lines, arrowheads, a setting-out
 * crosshair. One drawing system across the site — if this reads as a different illustrator,
 * it is wrong.
 *
 * The viewBox is 1:1 with the rendered size on purpose. Drawn in a larger coordinate space and
 * scaled down to 90px, `stroke-width="1.1"` would land at roughly half a pixel and the whole
 * sheet would grey out — the linework has to be authored at the size it is read at.
 *
 * `pathLength="1"` on every stroke normalises them all to a single unit, so one inherited
 * `stroke-dashoffset` on the group draws the whole tower without measuring a single path in
 * JS. The annotation group is deliberately left OUT of that group: its dashes are real dashes,
 * and pathLength normalisation would collapse them into solid lines. It also happens to be the
 * honest reading — the sheet is already annotated, the building is what gets drawn.
 */
function Fernsehturm() {
  return (
    <svg
      viewBox="0 0 30 90"
      className="h-[90px] w-[30px] shrink-0 self-start text-text-on-dark-mute sm:self-center"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        data-colophon-draw
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeDasharray="1"
        strokeLinejoin="round"
      >
        <path pathLength="1" d="M3 86h24" />
        <path pathLength="1" d="M11 86 13.5 80h7l2.5 6" />
        <path pathLength="1" d="M13.5 80 15.4 53M20.5 80 18.6 53" />
        <circle pathLength="1" cx="17" cy="47" r="6.8" />
        {/* The observation deck, drawn as the sphere's equator — the tower's one read at 30px. */}
        <ellipse pathLength="1" cx="17" cy="48.4" rx="6.8" ry="1.7" />
        <path pathLength="1" d="M15.7 41 16.4 30M18.3 41 17.6 30" />
        <path pathLength="1" d="M16.4 30 16.8 12M17.6 30 17.2 12" />
        <path pathLength="1" d="M17 12V4" />
      </g>

      {/* Annotation: centreline, overall height, sphere diameter, setting-out mark. */}
      <g fill="none" stroke="currentColor" strokeWidth="0.55" opacity="0.85">
        <path d="M17 2v87" strokeDasharray="1.2 2.2" />
        <path d="M15 4H3.5M11 86H3.5" strokeDasharray="1.2 2.2" />
        <path d="M5 4v82m0-82-.8 1.8M5 4l.8 1.8m-.8 80.2-.8-1.8m.8 1.8.8-1.8" />
        <path d="M10.2 55v7M23.8 55v7" strokeDasharray="1.2 2.2" />
        <path d="M10.2 60h13.6m-13.6 0 1.8-.8m-1.8.8 1.8.8m11.8-.8-1.8-.8m1.8.8-1.8.8" />
        <circle cx="17" cy="47" r=".8" />
        <path d="M13.5 47h7" strokeWidth="0.35" />
      </g>
    </svg>
  )
}
