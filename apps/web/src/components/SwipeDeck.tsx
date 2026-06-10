"use client"

import { Button } from "@agora/ui"
import {
  AnimatePresence,
  MotionConfig,
  type PanInfo,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion"
import { Bookmark, Check, ExternalLink, X } from "lucide-react"
import { useRef, useState } from "react"
import { type DeckCard, JobCard } from "./JobCard"

export type SwipeAction = "right" | "left" | "save"

const EXIT_X: Record<SwipeAction, number> = { right: 480, left: -480, save: 0 }
const EXIT_Y: Record<SwipeAction, number> = { right: 0, left: 0, save: -560 }

interface SwipeDeckProps {
  cards: DeckCard[]
  onSwipe: (card: DeckCard, action: SwipeAction) => void
  /** Rendered when every card has been swiped. */
  emptyState: React.ReactNode
}

/**
 * Tinder-style deck. Gestures: right = apply, left = pass, up = save,
 * tap = detail. The swipe is optimistic — the card leaves immediately and the
 * parent fires the mutation; the server's unique index makes repeats no-ops.
 */
export function SwipeDeck({ cards, onSwipe, emptyState }: SwipeDeckProps) {
  const [index, setIndex] = useState(0)
  const [detail, setDetail] = useState(false)
  const lastAction = useRef<SwipeAction>("right")

  const top = cards[index]
  const next = cards[index + 1]

  function swipe(card: DeckCard, action: SwipeAction) {
    lastAction.current = action
    setDetail(false)
    setIndex((i) => i + 1)
    onSwipe(card, action)
  }

  if (!top) return <>{emptyState}</>

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative mx-auto h-[420px] w-full max-w-sm select-none">
        {/* The card behind, peeking */}
        {next && (
          <div className="absolute inset-0 translate-y-2 scale-[0.97] opacity-70" aria-hidden>
            <JobCard card={next} />
          </div>
        )}

        <AnimatePresence>
          <TopCard
            key={top.jobId}
            card={top}
            exitX={EXIT_X[lastAction.current]}
            exitY={EXIT_Y[lastAction.current]}
            showDetail={detail}
            onToggleDetail={() => setDetail((d) => !d)}
            onSwipe={(action) => swipe(top, action)}
          />
        </AnimatePresence>
      </div>

      {/* Button fallbacks — every gesture must also be reachable by tap (a11y) */}
      <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-4">
        <Button
          variant="outline"
          aria-label="Pass"
          className="h-14 w-14 rounded-full border-red-400 p-0 text-red-500 hover:bg-red-50"
          onClick={() => swipe(top, "left")}
        >
          <X size={26} aria-hidden />
        </Button>
        <Button
          variant="outline"
          aria-label="Save for later"
          className="h-12 w-12 rounded-full p-0"
          onClick={() => swipe(top, "save")}
        >
          <Bookmark size={22} aria-hidden />
        </Button>
        <Button
          variant="cta"
          aria-label="Apply"
          className="h-14 w-14 rounded-full p-0"
          onClick={() => swipe(top, "right")}
        >
          <Check size={26} aria-hidden />
        </Button>
      </div>
    </MotionConfig>
  )
}

function TopCard({
  card,
  exitX,
  exitY,
  showDetail,
  onToggleDetail,
  onSwipe,
}: {
  card: DeckCard
  exitX: number
  exitY: number
  showDetail: boolean
  onToggleDetail: () => void
  onSwipe: (action: SwipeAction) => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  // Live affordance: green glow toward apply, red toward pass
  const applyOpacity = useTransform(x, [40, 140], [0, 1])
  const passOpacity = useTransform(x, [-140, -40], [1, 0])

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 100) onSwipe("right")
    else if (info.offset.x < -100) onSwipe("left")
    else if (info.offset.y < -80) onSwipe("save")
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      onTap={onToggleDetail}
      initial={{ scale: 0.97, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ x: exitX, y: exitY, opacity: 0, transition: { duration: 0.25 } }}
    >
      <JobCard card={card} />

      <motion.span
        style={{ opacity: applyOpacity }}
        className="pointer-events-none absolute left-4 top-4 rounded-lg border-2 border-cta px-2 py-1 text-sm font-bold uppercase text-cta"
        aria-hidden
      >
        Apply
      </motion.span>
      <motion.span
        style={{ opacity: passOpacity }}
        className="pointer-events-none absolute right-4 top-4 rounded-lg border-2 border-red-500 px-2 py-1 text-sm font-bold uppercase text-red-500"
        aria-hidden
      >
        Pass
      </motion.span>

      {showDetail && (
        <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto rounded-2xl bg-white/95 p-5 backdrop-blur-md">
          <h3 className="text-base font-bold">{card.title}</h3>
          <p className="text-sm text-muted">{card.company}</p>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Why you're eligible
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {card.eligibilityReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-auto flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-primary underline-offset-2 hover:underline"
          >
            <ExternalLink size={16} aria-hidden /> View original posting
          </a>
          <p className="text-xs text-muted">Tap the card to close</p>
        </div>
      )}
    </motion.div>
  )
}
