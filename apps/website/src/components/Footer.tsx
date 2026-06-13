import { en } from "@/content/en"

export function Footer() {
  const { footer } = en
  return (
    <footer id="footer" className="band band-dark">
      <div className="band-inner py-20 sm:py-28">
        <div className="flex flex-col items-start gap-6 border-b border-white/10 pb-16">
          <p className="font-display text-h2 leading-tight">{footer.threadLine}</p>
          <a href="#waitlist" className="btn-primary">
            {footer.cta}
          </a>
        </div>

        <div className="grid grid-cols-2 gap-10 pt-14 sm:grid-cols-4">
          {footer.columns.map((col) => (
            <div key={col.title}>
              <p className="eyebrow eyebrow-on-ink mb-4">{col.title}</p>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-[0.95rem] text-text-on-ink/70 transition-colors duration-fast hover:text-text-on-ink"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="eyebrow eyebrow-on-ink mb-4">Social</p>
            <a
              href="https://instagram.com/joinagora"
              className="text-[0.95rem] text-text-on-ink/70 transition-colors duration-fast hover:text-text-on-ink"
            >
              {footer.social}
            </a>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <p className="font-data text-[0.8rem] text-text-on-ink/55">{footer.smallPrint}</p>
          <div
            className="flex items-center gap-1 font-data text-[0.8rem] text-text-on-ink/55"
            aria-label="Language"
          >
            <span className="text-text-on-ink">{footer.langs[0]}</span>
            <span aria-hidden>·</span>
            <button type="button" className="transition-colors hover:text-text-on-ink" disabled>
              {footer.langs[1]}
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
