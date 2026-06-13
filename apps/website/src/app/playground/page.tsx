"use client"

import { Ari, type AriPose } from "@/components/ari/Ari"
import { useState } from "react"

const POSES: AriPose[] = ["in-the-O", "peeking", "walking", "pointing", "sitting", "waving"]

function Cell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded border border-marble-deep bg-white/40 p-5">
      <div className="flex h-[200px] items-end justify-center">{children}</div>
      <span className="font-data text-xs text-text-mute">{label}</span>
    </div>
  )
}

export default function Playground() {
  const [tone, setTone] = useState<"light" | "dark">("light")

  return (
    <main
      className={
        tone === "dark" ? "min-h-screen bg-ink text-text-on-ink" : "min-h-screen bg-marble"
      }
    >
      <div className="band-inner py-16">
        <p className="eyebrow mb-2">Ari · eval suite</p>
        <h1 className="mb-2 font-display text-4xl">The character in motion</h1>
        <p className="mb-8 max-w-2xl text-text-mute">
          Move your cursor — Ari tilts to follow it, and idles with a gentle float. This is the
          commissioned image (background removed); head-only framings use a tight crop, full poses
          use the whole figure.
        </p>

        <div className="mb-10">
          <button
            type="button"
            onClick={() => setTone((t) => (t === "light" ? "dark" : "light"))}
            className="rounded-pill border border-current/30 px-4 py-2 font-data text-xs"
          >
            tone: {tone}
          </button>
        </div>

        <h2 className="eyebrow mb-4">Framings</h2>
        <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {POSES.map((pose) => (
            <Cell key={pose} label={pose}>
              <Ari pose={pose} lookAt="cursor" tone={tone} size={130} />
            </Cell>
          ))}
        </div>

        <h2 className="eyebrow mb-4">In the O + speech bubble</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Cell label="in-the-O / speech">
            <div className="relative h-[150px] w-[150px] overflow-hidden rounded-full ring-2 ring-laurel/40">
              <Ari pose="in-the-O" lookAt="cursor" tone={tone} speech="Hi — I'm Ari." />
            </div>
          </Cell>
          <Cell label="full figure">
            <Ari pose="sitting" lookAt="cursor" tone={tone} size={150} />
          </Cell>
          <Cell label="peeking">
            <Ari pose="peeking" lookAt="cursor" tone={tone} size={130} />
          </Cell>
        </div>
      </div>
    </main>
  )
}
