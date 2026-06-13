"use client"

import { en } from "@/content/en"
import { cn } from "@/lib/cn"
import { useEffect, useState } from "react"

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-base ease-agora-out",
        scrolled
          ? "border-b border-marble-deep bg-marble/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav className="mx-auto flex max-w-band items-center justify-between px-5 py-4 sm:px-8">
        {/* Wordmark — Ari's face sits in the tiny nav O (the O motif) */}
        <a href="#main" className="flex items-center font-display text-xl tracking-[0.08em]">
          AG
          <span className="mx-[0.05em] inline-flex h-[0.82em] w-[0.82em] translate-y-[0.08em] overflow-hidden rounded-full ring-1 ring-current/25">
            <img
              src="/ari/ari-head.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-full w-full object-cover"
              style={{ objectPosition: "50% 34%", transform: "scale(1.2)" }}
            />
          </span>
          RA
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {en.nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              data-ari-hint={`Jump to ${link.label.toLowerCase()}`}
              className="text-[0.95rem] text-text-mute transition-colors duration-fast ease-agora-out hover:text-text"
            >
              {link.label}
            </a>
          ))}
          <a href="#waitlist" className="btn-primary text-[0.95rem]">
            {en.nav.cta}
          </a>
        </div>

        {/* Mobile trigger */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center md:hidden"
        >
          <span className="relative block h-4 w-6">
            <span
              className={cn(
                "absolute left-0 block h-[2px] w-6 bg-text transition-all duration-fast ease-agora-out",
                menuOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0",
              )}
            />
            <span
              className={cn(
                "absolute left-0 top-1/2 block h-[2px] w-6 -translate-y-1/2 bg-text transition-opacity duration-fast",
                menuOpen && "opacity-0",
              )}
            />
            <span
              className={cn(
                "absolute left-0 block h-[2px] w-6 bg-text transition-all duration-fast ease-agora-out",
                menuOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0",
              )}
            />
          </span>
        </button>
      </nav>

      {/* Mobile sheet */}
      {menuOpen && (
        <div className="border-t border-marble-deep bg-marble px-5 py-6 md:hidden">
          <div className="flex flex-col gap-5">
            {en.nav.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-lg text-text"
              >
                {link.label}
              </a>
            ))}
            {/* biome-ignore lint/a11y/useValidAnchor: in-page nav link that also closes the mobile sheet */}
            <a
              href="#waitlist"
              onClick={() => setMenuOpen(false)}
              className="btn-primary mt-2 w-full"
            >
              {en.nav.cta}
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
