import { describe, expect, it } from "vitest"
import { contractFromKategorie, unsoften } from "../src/jobs/scrape-tu-berlin"

describe("unsoften", () => {
  it("strips the portal's soft hyphens so names are searchable", () => {
    // U+00AD between syllables — invisible when rendered, real in the DB.
    expect(unsoften("Tech­ni­sche Uni­ver­si­tät Ber­lin")).toBe("Technische Universität Berlin")
    expect(unsoften("Ärzte ohne Gren­zen e.V.")).toBe("Ärzte ohne Grenzen e.V.")
    expect(unsoften("no hyphens here")).toBe("no hyphens here")
  })
})

// Every string here is a real "Kategorie"/"Category" cell observed on
// stellenticket.tu-berlin.de — the mapping must never invent a contract type.
describe("contractFromKategorie", () => {
  it("maps student employment categories, German and English", () => {
    expect(contractFromKategorie("Werkstudent*in")).toBe("werkstudent")
    expect(contractFromKategorie("Studentische Hilfskraft")).toBe("werkstudent")
    expect(contractFromKategorie("Student assistant, Working student")).toBe("werkstudent")
    expect(contractFromKategorie("Praktikum (für Studierende)")).toBe("praktikum")
    expect(contractFromKategorie("Internship (for students)")).toBe("praktikum")
  })

  it("prefers werkstudent when a cell lists several categories", () => {
    expect(contractFromKategorie("Studentische Hilfskraft, Werkstudent*in")).toBe("werkstudent")
    expect(contractFromKategorie("Praktikum (für Studierende), Werkstudent*in")).toBe("werkstudent")
  })

  it("returns null for non-student roles rather than guessing", () => {
    // The old classifier defaulted these to "werkstudent" — the exact bug being avoided.
    expect(contractFromKategorie("Wissenschaftliche Mitarbeiter*in")).toBeNull()
    expect(contractFromKategorie("Doktorand*in, Wissenschaftliche Mitarbeiter*in")).toBeNull()
    expect(contractFromKategorie("Professur")).toBeNull()
    expect(contractFromKategorie("Postdoc, Wissenschaftliche Mitarbeiter*in")).toBeNull()
    expect(contractFromKategorie("Thesis")).toBeNull()
    expect(contractFromKategorie("")).toBeNull()
  })
})
