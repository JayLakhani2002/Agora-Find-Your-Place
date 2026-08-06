import { describe, expect, it } from "vitest"
import { detectAts, parsePersonioXml } from "../src/scrapers/ats"

describe("detectAts", () => {
  it("pulls the board token out of an embedded ATS URL", () => {
    expect(detectAts('<iframe src="https://boards.greenhouse.io/acme?gh_src=x">')).toMatchObject({
      kind: "greenhouse",
      token: "acme",
    })
    expect(detectAts('<a href="https://jobs.lever.co/acme-gmbh/123">Apply</a>')).toMatchObject({
      kind: "lever",
      token: "acme-gmbh",
    })
    expect(detectAts('<a href="https://acme.jobs.personio.de/job/9">')).toMatchObject({
      kind: "personio",
      token: "acme",
    })
  })

  // Workday needs host AND site — a host-only token can't build the cxs URL.
  it("joins host and site id for Workday, skipping the locale segment", () => {
    expect(detectAts('href="https://acme.wd3.myworkdayjobs.com/en-US/acme_careers/job/1"')).toEqual(
      {
        kind: "workday",
        name: "workday",
        token: "acme.wd3.myworkdayjobs.com/acme_careers",
      },
    )
  })

  // Detected-but-unsupported must surface as kind:null, not as a miss — that list is
  // how we decide which adapter to write next.
  it("reports ATSes with no adapter instead of silently missing them", () => {
    expect(detectAts('<a href="https://acme.softgarden.io/de/vacancies">')).toMatchObject({
      kind: null,
      name: "softgarden",
    })
    expect(detectAts("<html><body>no ats here</body></html>")).toBeNull()
  })
})

describe("parsePersonioXml", () => {
  // <name> is used for BOTH the job title and every description heading — the parser
  // must not pick up "Deine Aufgaben" as a title.
  it("takes the title from the position head, not from a description section", () => {
    const xml = `<workzag-jobs><position>
        <id>4711</id><office><![CDATA[Berlin]]></office>
        <name><![CDATA[Werkstudent Data]]></name>
        <jobDescriptions>
          <jobDescription><name><![CDATA[Deine Aufgaben]]></name><value><![CDATA[<p>SQL & Python</p>]]></value></jobDescription>
          <jobDescription><name><![CDATA[Dein Profil]]></name><value><![CDATA[Immatrikuliert]]></value></jobDescription>
        </jobDescriptions>
      </position></workzag-jobs>`

    expect(parsePersonioXml(xml, "acme")).toEqual([
      {
        title: "Werkstudent Data",
        location: "Berlin",
        description: "<p>SQL & Python</p> Immatrikuliert",
        url: "https://acme.jobs.personio.de/job/4711",
      },
    ])
  })

  // A Munich-first role that is also open in Berlin must not read as Munich-only.
  it("keeps additional offices in the location", () => {
    const xml = `<position><id>1</id><office>Munich</office>
      <additionalOffices><office>Berlin</office></additionalOffices>
      <name>Staff Engineer</name><jobDescriptions><jobDescription><value>work</value></jobDescription></jobDescriptions>
      </position>`
    expect(parsePersonioXml(xml, "acme")[0]?.location).toBe("Munich, Berlin")
  })

  it("skips positions with no id or title rather than emitting a broken URL", () => {
    expect(parsePersonioXml("<position><office>Berlin</office></position>", "acme")).toEqual([])
  })
})
