import { displayName } from "@/lib/resume"
import type { ResumeContent, ResumeEntry, ResumeRatedItem, ResumeSection } from "@agora/db/schema"
import type { ReactNode } from "react"

/** "2021-03 – Present" (or "– 2023-08"). `current` always wins over endDate. */
function range(e: ResumeEntry): string {
  return [e.startDate, e.current ? "Present" : (e.endDate ?? "")]
    .filter((v) => v.trim() !== "")
    .join(" – ")
}

function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="border-b border-slate-400 pb-1 text-[11pt] font-bold uppercase tracking-[0.12em] text-ink">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Entries({ items }: { items: ResumeEntry[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((e) => (
        <div key={e.id} className="resume-entry">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-bold text-ink">{e.organisation || e.title}</h3>
            <span className="shrink-0 text-[9pt] text-muted">{range(e)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="italic">{e.organisation ? e.title : ""}</span>
            {e.location.trim() !== "" && (
              <span className="shrink-0 text-[9pt] text-muted">{e.location}</span>
            )}
          </div>
          <ul className="mt-1 list-disc pl-5">
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

/** Classic academic CV: serif, centred ruled header, ruled section headings. */
export function Harvard({ content }: { content: ResumeContent }) {
  const c = content.contact
  const details = [c.location, c.phone, c.email, c.linkedinUrl, c.portfolioUrl].filter(
    (v) => v.trim() !== "",
  )

  const list = (items: ResumeRatedItem[]) =>
    items
      .map((i) =>
        content.showSkillLevels && i.level.trim() !== "" ? `${i.name} (${i.level})` : i.name,
      )
      .join("  ·  ")

  function section(s: ResumeSection): ReactNode {
    switch (s) {
      case "summary":
        return content.summary.trim() === "" ? null : (
          <Sec key={s} title="Professional Summary">
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
    <article className="font-serif">
      <header className="border-b-2 border-ink pb-3 text-center">
        <h1 className="text-[20pt] font-bold uppercase tracking-[0.15em] text-ink">
          {displayName(content)}
        </h1>
        {c.jobTitle.trim() !== "" && (
          <p className="mt-1 text-[11pt] tracking-wide text-muted">{c.jobTitle}</p>
        )}
        {details.length > 0 && (
          <p className="mt-2 text-[9pt] text-muted">{details.join("  ·  ")}</p>
        )}
      </header>
      {content.sectionOrder.map(section)}
    </article>
  )
}
