"use client"

import { Icon } from "@/components/ui/Icon"
import { en } from "@/content/en"
import Image from "next/image"
import { useState } from "react"

/**
 * The closing band — the cinematic endposter, and the site's single conversion goal.
 *
 * The photograph is the same Berlin room as the hero, at 07:00: laptop shut, papers
 * stacked, sunrise behind the Fernsehturm. The page opens at 2am with the machine working
 * and closes at dawn with the work done, so the whole scroll reads as one night passing.
 * That is the product's argument told twice — once in words, once in light.
 *
 * The form used to sit alone on a flat band and looked abandoned. It now carries the four
 * things signing up actually gets you, so the last thing a reader sees is substance rather
 * than an empty input.
 *
 * Posts to /api/waitlist, which forwards to WAITLIST_WEBHOOK_URL. If that env var is unset
 * the route logs loudly and does NOT persist the email — it must be set before real
 * traffic. The success state promises exactly one email, because that is what we send.
 */
export function Cta() {
  const { cta } = en
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [email, setEmail] = useState("")
  const [copied, setCopied] = useState(false)

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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {
      // Clipboard can be blocked by permissions; the URL is in the address bar anyway.
    }
  }

  return (
    <section id="waitlist" className="relative isolate overflow-hidden">
      <Image
        src="/img/dawn.jpg"
        alt={cta.imageAlt}
        fill
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      {/* Bottom-weighted scrim — the sunrise and the tower have to stay readable. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-tr from-ink via-ink/78 to-ink/25"
      />

      <div className="shell on-ink relative py-band-lg">
        {state === "success" ? (
          <div className="max-w-xl" aria-live="polite">
            <span className="glow-indigo flex h-14 w-14 items-center justify-center rounded-full bg-indigo-soft/15 text-indigo-soft">
              <Icon name="check" className="h-7 w-7" />
            </span>
            <h2 className="mt-7 text-d2 font-bold text-white">{cta.successTitle}</h2>
            <p className="mt-5 text-lead text-white/70">{cta.successBody}</p>
            <button type="button" onClick={copyLink} className="btn btn-secondary mt-8">
              {copied ? cta.copied : cta.copyLink}
              <Icon name={copied ? "check" : "arrowRight"} className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-20">
            <div>
              <p data-reveal className="eyebrow">
                {cta.eyebrow}
              </p>
              <h2 data-reveal className="mt-5 max-w-[13ch] text-d2 font-bold text-white">
                {cta.headline}
              </h2>
              <p data-reveal className="mt-5 max-w-prose text-lead text-white/70">
                {cta.body}
              </p>

              <form
                onSubmit={onSubmit}
                className="mt-9 flex w-full max-w-lg flex-col gap-3 sm:flex-row"
              >
                <label htmlFor="waitlist-email" className="sr-only">
                  {cta.label}
                </label>
                <input
                  id="waitlist-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={cta.placeholder}
                  autoComplete="email"
                  className="min-w-0 flex-1 rounded-pill border border-white/20 bg-white/10 px-5 py-3 text-[0.9375rem] text-white backdrop-blur-sm transition-colors duration-fast placeholder:text-white/45 focus:border-indigo-soft focus:outline-none"
                />
                <button
                  type="submit"
                  data-magnetic
                  className="btn btn-primary"
                  disabled={state === "submitting"}
                >
                  {state === "submitting" ? cta.submitting : cta.submit}
                </button>
              </form>

              <p aria-live="polite" className="mt-3 min-h-6 text-[0.875rem] text-white/60">
                {state === "error" ? (
                  <>
                    {cta.error}{" "}
                    <button
                      type="button"
                      onClick={() => setState("idle")}
                      className="underline underline-offset-2 hover:text-white"
                    >
                      {cta.retry}
                    </button>
                  </>
                ) : null}
              </p>

              <p className="receipt mt-6 max-w-prose">{cta.smallPrint}</p>
            </div>

            {/* What you actually get — so the last thing on the page isn't an empty field. */}
            <ul className="grid gap-px self-center overflow-hidden rounded-card border border-white/15 backdrop-blur-md sm:grid-cols-2">
              {cta.points.map((p) => (
                <li key={p.title} data-reveal className="bg-ink/55 p-6">
                  <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-white">
                    <span className="text-indigo-soft">
                      <Icon name="check" className="h-4 w-4" />
                    </span>
                    {p.title}
                  </p>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-white/65">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
