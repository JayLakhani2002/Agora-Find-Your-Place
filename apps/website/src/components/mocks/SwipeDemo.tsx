"use client"

import { en } from "@/content/en"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { useEffect, useRef, useState } from "react"

type Job = (typeof en.howItWorks.demoJobs)[number]

/**
 * Step 2 — interactive swipe deck. Top card drags on x; past ±100px it flings
 * off and the next card promotes (cycling, so the demo never runs dry).
 * Touch: drag is pointer-based; `touch-action: pan-y` keeps page scroll alive.
 * Reduced motion: static top card + Skip/Save buttons that swap instantly.
 */
export function SwipeDemo({ active = true }: { active?: boolean }) {
  const [order, setOrder] = useState(() => en.howItWorks.demoJobs.map((_, i) => i))
  const [motionOk, setMotionOk] = useState(true)

  useEffect(() => {
    setMotionOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  const advance = () =>
    setOrder((o) => {
      const [first, ...rest] = o
      return first === undefined ? o : [...rest, first]
    })
  const jobs = en.howItWorks.demoJobs

  return (
    <div className="flex h-full flex-col px-4 py-3">
      <div className="relative flex-1">
        {/* Render back-to-front; only the front card is interactive */}
        {[...order].reverse().map((jobIdx, revPos) => {
          const pos = order.length - 1 - revPos // 0 = front
          const job = jobs[jobIdx]
          if (!job) return null
          if (pos === 0 && motionOk) {
            return (
              <SwipeCard key={`${jobIdx}-${order[0]}`} job={job} onSwiped={advance} active={active} />
            )
          }
          return (
            <div
              key={jobIdx}
              aria-hidden={pos !== 0}
              className="absolute inset-0"
              style={{
                transform: `translateY(${pos * 10}px) scale(${1 - pos * 0.045})`,
                zIndex: order.length - pos,
              }}
            >
              <CardFace job={job} />
            </div>
          )
        })}
      </div>

      {motionOk ? (
        <p className="mt-3 text-center font-data text-[0.6rem] text-text-mute">
          {en.howItWorks.swipeHint}
        </p>
      ) : (
        <div className="mt-3 flex justify-center gap-3">
          <button type="button" onClick={advance} className="btn-ghost px-4 py-1.5 text-sm">
            Skip
          </button>
          <button type="button" onClick={advance} className="btn-primary px-4 py-1.5 text-sm">
            Save
          </button>
        </div>
      )}
    </div>
  )
}

function SwipeCard({
  job,
  onSwiped,
  active,
}: {
  job: Job
  onSwiped: () => void
  active: boolean
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-160, 160], [-12, 12])
  const yesOpacity = useTransform(x, [30, 110], [0, 1])
  const noOpacity = useTransform(x, [-110, -30], [1, 0])
  const nudged = useRef(false)

  // One gentle nudge when the panel becomes active — the "try me" hint.
  useEffect(() => {
    if (!active || nudged.current) return
    nudged.current = true
    let raf = 0
    const t = setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 700)
        x.set(Math.sin(p * Math.PI) * 18)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, 400)
    return () => {
      clearTimeout(t)
      cancelAnimationFrame(raf)
    }
  }, [active, x])

  return (
    <motion.div
      drag="x"
      dragSnapToOrigin
      dragElastic={0.9}
      style={{ x, rotate, touchAction: "pan-y", zIndex: 10 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100) {
          onSwiped()
        }
      }}
      whileDrag={{ cursor: "grabbing" }}
      className="absolute inset-0 cursor-grab"
    >
      <CardFace job={job}>
        <motion.span
          style={{ opacity: yesOpacity }}
          className="absolute right-3 top-3 rounded-md border-2 border-laurel px-1.5 font-data text-xs font-bold text-laurel-text"
        >
          SAVE
        </motion.span>
        <motion.span
          style={{ opacity: noOpacity }}
          className="absolute left-3 top-3 rounded-md border-2 border-text-mute px-1.5 font-data text-xs font-bold text-text-mute"
        >
          SKIP
        </motion.span>
      </CardFace>
    </motion.div>
  )
}

function CardFace({ job, children }: { job: Job; children?: React.ReactNode }) {
  return (
    <div className="relative flex h-full flex-col rounded-xl border border-text/10 bg-white/70 p-4 shadow-sm">
      {children}
      <div className="mt-4 font-display text-base leading-tight">{job.title}</div>
      <div className="mt-1 text-xs text-text-mute">{job.company}</div>
      <div className="mt-auto">
        <div className="font-data text-2xl text-laurel-text">
          {job.score}
          <span className="text-sm text-text-mute">/10 match</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-laurel/40 px-2 py-0.5 font-data text-[0.6rem] text-laurel-text"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
