"use client"

import { en } from "@/content/en"
import { useReveal } from "@/lib/useReveal"
import { useRef, useState } from "react"

type FormState = "idle" | "submitting" | "success" | "error"

export function Waitlist() {
  const rootRef = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<FormState>("idle")
  const [email, setEmail] = useState("")
  useReveal(rootRef)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === "submitting") return
    setState("submitting")
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      setState(res.ok ? "success" : "error")
    } catch {
      setState("error")
    }
  }

  const t = en.waitlist
  return (
    <section id="waitlist" ref={rootRef} className="band band-dark">
      {/* Laurel radial bloom — decorative glow behind the CTA */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 65% at 50% 55%, color-mix(in srgb, var(--laurel) 28%, transparent), transparent)",
        }}
      />
      <div className="band-inner relative z-10 flex flex-col items-center py-28 text-center sm:py-36">
        <p data-reveal className="eyebrow eyebrow-on-ink">
          {t.eyebrow}
        </p>
        <h2
          data-reveal
          className="mt-4 max-w-xl text-balance font-display text-4xl text-text-on-ink sm:text-5xl"
        >
          {t.headline}
        </h2>
        <p data-reveal className="mt-5 max-w-md text-balance text-text-on-ink/70">
          {t.body}
        </p>

        {state === "success" ? (
          <p
            aria-live="polite"
            className="mt-9 rounded-full border border-laurel-bright/40 bg-laurel-bright/10 px-6 py-3 font-data text-sm text-laurel-bright"
          >
            ✓ {t.success}
          </p>
        ) : (
          <form
            data-reveal
            onSubmit={onSubmit}
            className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="waitlist-email" className="sr-only">
              Email address
            </label>
            <input
              id="waitlist-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.placeholder}
              autoComplete="email"
              className="min-w-0 flex-1 rounded-full border border-text-on-ink/20 bg-ink-soft px-5 py-3 text-text-on-ink placeholder:text-text-on-ink/40 focus:border-laurel-bright"
            />
            <button type="submit" className="btn-primary" disabled={state === "submitting"}>
              {state === "submitting" ? "Joining…" : t.cta}
            </button>
          </form>
        )}

        <p aria-live="polite" className="mt-3 min-h-5 text-sm text-text-on-ink/60">
          {state === "error" ? t.error : ""}
        </p>
        <p className="mt-6 font-data text-xs uppercase tracking-[0.14em] text-text-on-ink/45">
          {t.smallPrint}
        </p>
      </div>
    </section>
  )
}
