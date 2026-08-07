"use client"

import { Wordmark } from "@/components/Wordmark"
import { en } from "@/content/en"
import { cn } from "@/lib/cn"
import Link from "next/link"
import { useEffect, useState } from "react"

/** Sticky top nav — transparent over the hero, shell + hairline once scrolled. */
export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  /**
   * The hero opens on a near-black room, so at the top of the page the nav sits on black and has
   * to invert to white; once it gains its ivory backing on scroll it returns to ink-on-light.
   *
   * This flag is load-bearing and has flipped twice in one day as the hero went dark → white →
   * dark again. It stays a single named boolean for exactly that reason: whoever changes the
   * hero's tone next should find one decision here, not the assumption spread across six
   * className branches. Get it wrong and the wordmark and every link go invisible.
   */
  const onDark = !scrolled && !open

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-base ease-out",
        scrolled || open
          ? "border-b border-ivory-line bg-ivory/85 backdrop-blur-md"
          : "border-b border-transparent",
      )}
    >
      <nav aria-label="Main" className="shell flex h-[68px] items-center justify-between">
        <Link
          href="/"
          aria-label={en.a11y.homeLink}
          className={cn(
            "text-[1.35rem] transition-colors duration-base",
            onDark ? "text-white" : "text-text",
          )}
        >
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {en.nav.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-[0.9375rem] font-medium transition-colors duration-fast ease-out",
                onDark ? "text-white/75 hover:text-white" : "text-text-mute hover:text-text",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link href={en.nav.ctaHref} className="btn btn-primary">
            {en.nav.cta}
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? en.nav.menuClose : en.nav.menuOpen}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center md:hidden"
        >
          <span className="relative block h-4 w-6">
            <span
              className={cn(
                "absolute left-0 block h-[2px] w-6 transition-all duration-fast ease-out",
                onDark ? "bg-white" : "bg-text",
                open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0",
              )}
            />
            <span
              className={cn(
                "absolute left-0 top-1/2 block h-[2px] w-6 -translate-y-1/2 transition-opacity duration-fast",
                onDark ? "bg-white" : "bg-text",
                open && "opacity-0",
              )}
            />
            <span
              className={cn(
                "absolute left-0 block h-[2px] w-6 transition-all duration-fast ease-out",
                onDark ? "bg-white" : "bg-text",
                open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0",
              )}
            />
          </span>
        </button>
      </nav>

      <div
        id="mobile-menu"
        hidden={!open}
        className="border-t border-ivory-line bg-ivory md:hidden"
      >
        <div className="shell flex flex-col gap-1 py-4">
          {en.nav.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="py-3 text-lg font-medium text-text"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={en.nav.ctaHref}
            onClick={() => setOpen(false)}
            className="btn btn-primary mt-3 w-full"
          >
            {en.nav.cta}
          </Link>
        </div>
      </div>
    </header>
  )
}
