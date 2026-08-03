import { displayName } from "@/lib/resume"
import type { ResumeContent, ResumeEntry, ResumeRatedItem, ResumeSection } from "@agora/db/schema"
import type { ReactNode } from "react"

function range(e: ResumeEntry): string {
  return [e.startDate, e.current ? "Present" : (e.endDate ?? "")]
    .filter((v) => v.trim() !== "")
    .join(" – ")
}

function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-[8.5pt] font-semibold uppercase tracking-[0.22em] text-muted">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Entries({ items }: { items: ResumeEntry[] }) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((e) => (
        <div key={e.id} className="resume-entry">
          <h3 className="font-semibold text-ink">
            {e.title}
            {e.organisation.trim() !== "" && (
              <span className="font-normal text-muted"> at {e.organisation}</span>
            )}
          </h3>
          <p className="text-[9pt] text-muted">
            {[range(e), e.location].filter((v) => v.trim() !== "").join(" · ")}
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {e.bullets
              .filter((b) => b.trim() !== "")
              .map((b) => (
                <li key={b} className="before:mr-2 before:text-muted before:content-['—']">
                  {b}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Minimal left-aligned sans: no rules, no tints, spacing does the work. */
export function Simple({ content }: { content: ResumeContent }) {
  const c = content.contact
  const details = [c.location, c.phone, c.email, c.linkedinUrl, c.portfolioUrl].filter(
    (v) => v.trim() !== "",
  )

  const list = (items: ResumeRatedItem[]) =>
    items
      .map((i) =>
        content.showSkillLevels && i.level.trim() !== "" ? `${i.name} (${i.level})` : i.name,
      )
      .join(", ")

  function section(s: ResumeSection): ReactNode {
    switch (s) {
      case "summary":
        return content.summary.trim() === "" ? null : (
          <Sec key={s} title="Summary">
            <p>{content.summary}</p>
          </Sec>
        )
      case "experience":
        return content.experience.length === 0 ? null : (
          <Sec key={s} title="Experience">
            <Entries items={content.experience} />
          </Sec>
        )
      case "education":
        return content.education.length === 0 ? null : (
          <Sec key={s} title="Education">
            <Entries items={content.education} />
          </Sec>
        )
      case "skills":
        return content.skills.length === 0 ? null : (
          <Sec key={s} title="Skills">
            <p>{list(content.skills)}</p>
          </Sec>
        )
      case "languages":
        return content.languages.length === 0 ? null : (
          <Sec key={s} title="Languages">
            <p>{list(content.languages)}</p>
          </Sec>
        )
      case "certificates":
        return content.certificates.length === 0 ? null : (
          <Sec key={s} title="Certifications">
            <p>{list(content.certificates)}</p>
          </Sec>
        )
    }
  }

  return (
    <article>
      <header>
        <h1 className="text-[18pt] font-semibold tracking-tight text-ink">
          {displayName(content)}
        </h1>
        {c.jobTitle.trim() !== "" && <p className="text-[11pt] text-muted">{c.jobTitle}</p>}
        {details.length > 0 && <p className="mt-2 text-[9pt] text-muted">{details.join(" • ")}</p>}
      </header>
      {content.sectionOrder.map(section)}
    </article>
  )
}
