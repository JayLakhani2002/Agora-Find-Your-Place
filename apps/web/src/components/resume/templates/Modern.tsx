import { displayName } from "@/lib/resume"
import type { ResumeContent, ResumeEntry, ResumeRatedItem, ResumeSection } from "@agora/db/schema"
import { Globe, Linkedin, Mail, MapPin, Phone } from "lucide-react"
import type { ReactNode } from "react"

/** These three live in the tinted sidebar; everything else runs down the main column. */
const SIDE = ["skills", "languages", "certificates"] as const
type SideSection = (typeof SIDE)[number]

function isSide(s: ResumeSection): s is SideSection {
  return (SIDE as readonly ResumeSection[]).includes(s)
}

function range(e: ResumeEntry): string {
  return [e.startDate, e.current ? "Present" : (e.endDate ?? "")]
    .filter((v) => v.trim() !== "")
    .join(" – ")
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[9pt] font-semibold uppercase tracking-[0.18em] text-primary">
      {children}
    </h2>
  )
}

function Entries({ items }: { items: ResumeEntry[] }) {
  return (
    <div className="mt-2 flex flex-col gap-3">
      {items.map((e) => (
        <div key={e.id} className="resume-entry border-l-2 border-primary-light/40 pl-3">
          <h3 className="font-semibold text-ink">{e.title}</h3>
          <p className="text-[9pt] text-muted">
            {[e.organisation, e.location, range(e)].filter((v) => v.trim() !== "").join(" · ")}
          </p>
          <ul className="mt-1 list-disc pl-4">
            {e.bullets
              .filter((b) => b.trim() !== "")
              .map((b) => (
                <li key={b}>{b}</li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Two-column: tinted sidebar for contact + rated lists, main column for prose. */
export function Modern({ content }: { content: ResumeContent }) {
  const c = content.contact
  const aside = content.sectionOrder.filter(isSide)
  const main = content.sectionOrder.filter((s) => !isSide(s))

  const details: { icon: typeof Mail; value: string }[] = [
    { icon: MapPin, value: c.location },
    { icon: Phone, value: c.phone },
    { icon: Mail, value: c.email },
    { icon: Linkedin, value: c.linkedinUrl },
    { icon: Globe, value: c.portfolioUrl },
  ].filter((d) => d.value.trim() !== "")

  const hasAside = details.length > 0 || aside.some((s) => content[s].length > 0)

  function rated(title: string, items: ResumeRatedItem[]): ReactNode {
    return items.length === 0 ? null : (
      <section key={title} className="mt-5">
        <Heading>{title}</Heading>
        <ul className="mt-2 flex flex-col gap-1">
          {items.map((i) => (
            <li key={i.id} className="resume-entry">
              <span className="font-medium text-ink">{i.name}</span>
              {content.showSkillLevels && i.level.trim() !== "" && (
                <span className="text-muted"> — {i.level}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  function asideSection(s: SideSection): ReactNode {
    switch (s) {
      case "skills":
        return rated("Skills", content.skills)
      case "languages":
        return rated("Languages", content.languages)
      case "certificates":
        return rated("Certifications", content.certificates)
    }
  }

  function mainSection(s: ResumeSection): ReactNode {
    switch (s) {
      case "summary":
        return content.summary.trim() === "" ? null : (
          <section key={s} className="mt-5">
            <Heading>Profile</Heading>
            <p className="mt-2">{content.summary}</p>
          </section>
        )
      case "experience":
        return content.experience.length === 0 ? null : (
          <section key={s} className="mt-5">
            <Heading>Experience</Heading>
            <Entries items={content.experience} />
          </section>
        )
      case "education":
        return content.education.length === 0 ? null : (
          <section key={s} className="mt-5">
            <Heading>Education</Heading>
            <Entries items={content.education} />
          </section>
        )
      default:
        return null
    }
  }

  return (
    <article>
      <header className="border-b-4 border-primary pb-3">
        <h1 className="text-[22pt] font-semibold leading-tight text-primary">
          {displayName(content)}
        </h1>
        {c.jobTitle.trim() !== "" && (
          <p className="text-[11pt] uppercase tracking-[0.18em] text-muted">{c.jobTitle}</p>
        )}
      </header>

      <div className={hasAside ? "grid grid-cols-[1fr_1.9fr] items-start gap-6" : ""}>
        {hasAside && (
          <aside className="resume-tint mt-5 rounded-xl bg-surface p-4">
            {details.length > 0 && (
              <section>
                <Heading>Contact</Heading>
                <ul className="mt-2 flex flex-col gap-1 text-[9pt] text-muted">
                  {details.map(({ icon: Icon, value }) => (
                    <li key={value} className="flex items-start gap-2">
                      <Icon aria-hidden="true" className="mt-[2px] h-3 w-3 shrink-0 text-primary" />
                      <span className="break-words">{value}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {aside.map(asideSection)}
          </aside>
        )}
        <div>{main.map(mainSection)}</div>
      </div>
    </article>
  )
}
