import { Split } from "@/components/ui/Split"
import { en } from "@/content/en"

/**
 * Platforms — "five doors, one room".
 *
 * This was a grid of five identical cards, four of which described things that do not exist.
 * Identical shapes made them read as five equal features with four apologies attached, and a
 * tag is a weak signal against a card that looks shipped.
 *
 * So the picture carries the claim instead: a colonnade with one lit doorway you can walk
 * through and four measured DRAWINGS. Nobody mistakes a construction drawing for a building,
 * which is exactly the point — UWG §5 forbids implying an unbuilt feature exists, and this
 * encoding is far harder to misread than a chip. The `at launch` tags stay in plain text on
 * every closed door; the drawing reinforces them, it never replaces them.
 *
 * The only link in the section is the open door, because it is the only thing that opens.
 * Closed doors are inert markup with no pointer cursor and no hover affordance beyond their
 * linework warming — motion and colour that mean "you are looking at this", never "this works".
 */
export function Platforms() {
  const { platforms } = en
  return (
    <section id="platforms" className="band scroll-mt-24 bg-ivory-deep/60 py-band-lg">
      <div className="shell">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p data-reveal className="eyebrow">
              {platforms.eyebrow}
            </p>
            <h2 className="mt-5 max-w-[20ch] text-d2 font-bold text-ink">
              <Split text={platforms.headline} />
            </h2>
            <p data-reveal className="mt-6 max-w-prose text-lead text-text-mute">
              {platforms.body}
            </p>
          </div>
          <a href={en.nav.ctaHref} data-magnetic className="btn btn-primary shrink-0 self-start">
            {platforms.cta}
          </a>
        </div>

        {/*
         * Five doors do not fit a 390px screen, and a horizontal scroller would hide the last
         * two from anyone using a keyboard. So the colonnade reflows: 2 columns on a phone,
         * 3 on a tablet, all five in one row from `lg`, where the gap closes to zero and the
         * entablature and stylobate lines — drawn edge to edge in every door — join up into a
         * single continuous building. Each door also carries its own capital and base, so a
         * wrapped row still reads as architecture rather than a cut-off drawing.
         */}
        <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-0">
          <li data-reveal className="flex">
            <a href={en.nav.ctaHref} className="group flex w-full flex-col rounded-card">
              <span className="block aspect-[2/3] text-ink">
                <OpenDoor />
              </span>
              {/* The sign. Solid card, solid border, brand chip — the only one that is real. */}
              <div className="mt-5 flex flex-1 flex-col rounded-frame border border-ivory-line bg-white px-4 py-4 text-center shadow-card transition-colors duration-base ease-out group-hover:border-clay/50">
                <h3 className="text-[1.0625rem] font-semibold text-ink">{platforms.open.name}</h3>
                <p className="mt-1 text-[0.875rem] leading-relaxed text-text-mute">
                  {platforms.open.body}
                </p>
                <p className="mt-auto pt-3">
                  <span className="chip chip-brand">{platforms.open.tag}</span>
                </p>
              </div>
            </a>
          </li>

          {platforms.closed.map((door) => (
            <li key={door.id} data-reveal className="flex flex-col">
              {/* No link, no button, no pointer — there is nothing behind this door yet. */}
              <span className="block aspect-[2/3] cursor-default text-clay transition-colors duration-base ease-out hover:text-clay-soft">
                <ClosedDoor />
              </span>
              {/* Dashed sign to match the dashed drawing — a label pinned to a plan, not a product. */}
              <div className="mt-5 flex flex-1 flex-col rounded-frame border border-dashed border-ivory-line px-4 py-4 text-center">
                <h3 className="text-[1.0625rem] font-semibold text-ink">{door.name}</h3>
                <p className="mt-1 text-[0.875rem] leading-relaxed text-text-mute">{door.body}</p>
                <p className="mt-auto pt-3">
                  <span className="chip chip-launch">{door.tag}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>

        <p data-reveal className="receipt mt-12 max-w-prose">
          {platforms.note}
        </p>
      </div>
    </section>
  )
}

/**
 * Entablature, two columns, stylobate — identical in both doors so the row reads as one
 * building. The three horizontal runs span the full viewBox width, which is what lets them
 * meet across the zero-gap `lg` grid.
 */
function Colonnade() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.1">
      <path d="M0 8h120M0 16h120M0 165h120" />
      <path d="M4 16h16v5H4zM100 16h16v5h-16zM4 160h16v5H4zM100 160h16v5h-16z" />
      <path d="M8 21v139M16 21v139M104 21v139M112 21v139" />
    </g>
  )
}

/** The web app: the room behind it is lit, and the light falls out onto the step. */
function OpenDoor() {
  return (
    <svg
      viewBox="0 0 120 180"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="agora-door-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--clay-wash)" />
          <stop offset="1" stopColor="var(--clay-soft)" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="agora-door-spill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--clay-soft)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--clay-soft)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M28 28h64v137H28z" fill="url(#agora-door-light)" />
      <path d="M28 165h64l14 13H14z" fill="url(#agora-door-spill)" />
      <Colonnade />
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M28 165V28h64v137" />
        {/* The leaf, swung inward — filled, so it reads as a solid panel against the light. */}
        <path d="M31 32 49 43v115l-18 5z" fill="var(--ivory)" />
        <path d="M46 96v8" />
      </g>
    </svg>
  )
}

/**
 * The four that are drawn, not built: dashed leaf, swing arc, dimension line, setting-out
 * marks. Every stroke says "sheet", not "product".
 */
function ClosedDoor() {
  return (
    <svg
      viewBox="0 0 120 180"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <Colonnade />
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
        <path d="M28 165V28h64v137" />
        <path d="M32 34h56v131H32z" strokeDasharray="4 3" />
        <path d="M60 34v131" strokeDasharray="4 3" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.8">
        <path d="M88 165A56 56 0 0 0 32 109" strokeDasharray="2 4" />
        <path d="M0 28h28M92 28h28" strokeDasharray="2 4" />
        <path d="M34 38l10 10M34 46l10 10M34 54l10 10" />
        <path d="M28 169v7M92 169v7M28 172h64m-6-3 6 3-6 3m-52-6-6 3 6 3" />
        <circle cx="76" cy="100" r="2" />
        <path d="M76 92v16M68 100h16" strokeWidth="0.4" />
      </g>
    </svg>
  )
}
