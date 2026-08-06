// Router tests for the resume builder.
//
// Split, deliberately:
//   • The default block calls the real router through a tRPC server-side caller
//     with a *stub* db that throws on every data call except the one lookup the
//     auth middleware needs. That covers the trust boundary — every rejected
//     input must be rejected before a single query is issued — and stays
//     runnable offline, so `turbo test` never needs a database.
//   • The live block (RESUMES_LIVE_DB=1) is the ownership-isolation and
//     persistence coverage that only a real Postgres can prove. Skipped by
//     default; it writes and then deletes rows tagged QA-TEST- / qa_test_.

import { getDb } from "@agora/db"
import { type ResumeContent, resumes, users } from "@agora/db/schema"
import { and, eq, like } from "drizzle-orm"
import { afterAll, describe, expect, it } from "vitest"
import { emptyResume } from "../src/lib/resume"
import { resumesRouter } from "../src/server/routers/resumes"
import { createCallerFactory } from "../src/server/trpc"

const createCaller = createCallerFactory(resumesRouter)

/** Fails the test if the router reaches the database. */
function forbidden(): never {
  throw new Error("router hit the database on an input that should have been rejected")
}

/** Satisfies the auth middleware's users lookup; every other call is a failure. */
const stubDb = {
  query: {
    users: { findFirst: async () => ({ id: "u_stub", clerkId: "clerk_stub", email: "" }) },
    resumes: { findFirst: forbidden },
  },
  select: forbidden,
  insert: forbidden,
  update: forbidden,
  delete: forbidden,
} as never

const stubCaller = createCaller({
  clerkId: "clerk_stub",
  db: stubDb,
  headers: new Headers(),
} as never)

function content(over: Partial<ResumeContent> = {}): ResumeContent {
  return { ...emptyResume(), ...over }
}

const entry = {
  id: "e1",
  title: "Werkstudent",
  organisation: "ACME",
  location: "Berlin",
  startDate: "2025-01",
  endDate: null,
  current: true,
  bullets: ["one", "two"],
}

describe("resumes router — auth boundary", () => {
  it("rejects an unauthenticated caller on every procedure", async () => {
    const anon = createCaller({ clerkId: null, db: stubDb, headers: new Headers() } as never)
    // Reads and writes alike — a missing guard on a mutation is the dangerous one.
    await expect(anon.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    await expect(anon.get({ id: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    await expect(anon.create({ title: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    await expect(anon.update({ id: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    await expect(anon.remove({ id: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    await expect(anon.setBase({ id: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

describe("resumes router — input validation", () => {
  it("rejects an empty or oversized title", async () => {
    await expect(stubCaller.create({ title: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" })
    await expect(stubCaller.create({ title: "x".repeat(201) })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
  })

  it("rejects an unknown template — the column is free-form text", async () => {
    await expect(
      stubCaller.create({ title: "CV", template: "../../etc/passwd" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
    await expect(stubCaller.update({ id: "r1", template: "harvard-2" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
  })

  it("rejects an unknown section name in sectionOrder", async () => {
    await expect(
      stubCaller.update({ id: "r1", content: content({ sectionOrder: ["hobbies"] as never }) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("enforces the jsonb size caps so one row cannot become megabytes", async () => {
    const over: [string, Partial<ResumeContent>][] = [
      ["experience", { experience: Array.from({ length: 31 }, () => entry) }],
      ["education", { education: Array.from({ length: 31 }, () => entry) }],
      [
        "skills",
        { skills: Array.from({ length: 61 }, (_, i) => ({ id: `s${i}`, name: "x", level: "y" })) },
      ],
      ["summary", { summary: "x".repeat(4001) }],
      ["bullets", { experience: [{ ...entry, bullets: Array.from({ length: 21 }, () => "b") }] }],
    ]
    for (const [label, patch] of over) {
      await expect(
        stubCaller.update({ id: "r1", content: content(patch) }),
        `${label} cap not enforced`,
      ).rejects.toMatchObject({ code: "BAD_REQUEST" })
    }
  })

  it("accepts a valid payload right at the caps", async () => {
    // The stub throws "hit the database" — proof the payload passed zod rather
    // than being rejected at the boundary.
    await expect(
      stubCaller.update({
        id: "r1",
        content: content({
          experience: Array.from({ length: 30 }, () => entry),
          skills: Array.from({ length: 60 }, (_, i) => ({ id: `s${i}`, name: "x", level: "y" })),
          summary: "x".repeat(4000),
        }),
      }),
    ).rejects.toThrow(/hit the database/)
  })

  it("KNOWN BUG: sectionOrder accepts duplicates, so a section renders twice", async () => {
    // z.array(sectionSchema).max(6) has no uniqueness constraint. Reaching the
    // database is the symptom: validation let the payload through.
    await expect(
      stubCaller.update({ id: "r1", content: content({ sectionOrder: ["skills", "skills"] }) }),
    ).rejects.toThrow(/hit the database/)
  })
})

// ── Live database ─────────────────────────────────────────────────────────────
// RESUMES_LIVE_DB=1 pnpm --filter @agora/web test
// Needs DATABASE_URL. Creates rows tagged QA-TEST- / qa_test_ and deletes them.

const LIVE = process.env.RESUMES_LIVE_DB === "1"

describe.skipIf(!LIVE)("resumes router — live database", () => {
  const tag = Math.random().toString(36).slice(2, 8)
  const CLERK_A = `qa_test_a_${tag}`
  const CLERK_B = `qa_test_b_${tag}`

  // Lazy: vitest still executes this describe body when skipped, and getDb()
  // throws without DATABASE_URL.
  const caller = (clerkId: string) =>
    createCaller({ clerkId, db: getDb(), headers: new Headers() } as never)
  const A = () => caller(CLERK_A)
  const B = () => caller(CLERK_B)

  const userId = async (clerkId: string) => {
    const row = await getDb().query.users.findFirst({ where: eq(users.clerkId, clerkId) })
    if (!row) throw new Error(`test user ${clerkId} was not provisioned`)
    return row.id
  }

  const bases = async (clerkId: string) =>
    getDb()
      .select({ id: resumes.id })
      .from(resumes)
      .where(and(eq(resumes.userId, await userId(clerkId)), eq(resumes.isBase, true)))

  afterAll(async () => {
    const rows = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(like(users.clerkId, `qa_test_%${tag}`))
    for (const u of rows) {
      await getDb().delete(resumes).where(eq(resumes.userId, u.id))
      await getDb().delete(users).where(eq(users.id, u.id))
    }
  })

  it("round-trips a ResumeContent through jsonb unchanged", async () => {
    const payload = content({
      summary: "Ünïcode ✓ and emoji 🎯",
      sectionOrder: ["skills", "summary", "experience"],
      skills: [{ id: "s1", name: "Python", level: "Advanced" }],
      languages: [{ id: "l1", name: "German", level: "B1" }],
      certificates: [{ id: "c1", name: "AWS SAA", level: "2025" }],
      showSkillLevels: true,
    })
    const { id } = await A().create({ title: "QA-TEST-roundtrip" })
    await A().update({ id, content: payload })
    expect((await A().get({ id })).content).toEqual(payload)
  })

  it("clones content by value, so editing the copy leaves the source alone", async () => {
    const payload = content({ summary: "original summary" })
    const { id: src } = await A().create({ title: "QA-TEST-src" })
    await A().update({ id: src, content: payload })
    const { id: copy } = await A().create({ title: "QA-TEST-copy", fromResumeId: src })
    expect((await A().get({ id: copy })).content).toEqual(payload)
    await A().update({ id: copy, content: content({ summary: "edited copy" }) })
    expect((await A().get({ id: src })).content.summary).toBe("original summary")
  })

  it("lists newest-updated first", async () => {
    const { id: older } = await A().create({ title: "QA-TEST-older" })
    await new Promise((r) => setTimeout(r, 1100))
    const { id: newer } = await A().create({ title: "QA-TEST-newer" })
    const rows = (await A().list()).filter((r) => r.id === older || r.id === newer)
    expect(rows.map((r) => r.id)).toEqual([newer, older])
  })

  it("keeps exactly one base resume across sequential promotions", async () => {
    const ids: string[] = []
    for (let i = 0; i < 3; i++) ids.push((await A().create({ title: `QA-TEST-base-${i}` })).id)
    for (const id of ids) {
      await A().setBase({ id })
      expect(await bases(CLERK_A)).toEqual([{ id }])
    }
  })

  it("keeps exactly one base resume when setBase is called concurrently", async () => {
    const ids: string[] = []
    for (let i = 0; i < 3; i++) ids.push((await A().create({ title: `QA-TEST-race-${i}` })).id)
    await Promise.all(ids.map((id) => A().setBase({ id })))
    // setBase is clear-then-set as two non-transactional statements, so parallel
    // callers interleave. Should be 1; reproduces at 2-3 against Neon.
    expect((await bases(CLERK_A)).length).toBe(1)
  })

  it("denies user B every operation on user A's resume", async () => {
    const { id } = await A().create({ title: "QA-TEST-owned-by-a" })
    await A().setBase({ id })
    for (const call of [
      () => B().get({ id }),
      () => B().update({ id, title: "PWNED" }),
      () => B().remove({ id }),
      () => B().setBase({ id }),
      () => B().create({ title: "QA-TEST-stolen", fromResumeId: id }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: "NOT_FOUND" })
    }
    const after = await A().get({ id })
    expect(after.title).toBe("QA-TEST-owned-by-a")
    expect(after.isBase).toBe(true)
    expect((await B().list()).some((r) => r.id === id)).toBe(false)
    // B promoting its own resume must not clear A's flag.
    const { id: bOwn } = await B().create({ title: "QA-TEST-b-own" })
    await B().setBase({ id: bOwn })
    expect(await bases(CLERK_A)).toEqual([{ id }])
  })

  it("deletes the row and reports NOT_FOUND on a second attempt", async () => {
    const { id } = await A().create({ title: "QA-TEST-doomed" })
    expect(await A().remove({ id })).toEqual({ ok: true })
    await expect(A().get({ id })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(A().remove({ id })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("strips a NUL byte out of content instead of failing the save", async () => {
    const { id } = await A().create({ title: "QA-TEST-nul" })
    // Postgres text/jsonb cannot store U+0000; zod's z.string() accepts it. The
    // character is invisible and arrives by pasting from a bad PDF, so it is
    // stripped silently — rejecting would lose an autosave the user cannot fix.
    await expect(
      A().update({ id, content: content({ summary: "Pasted\u0000from PDF" }) }),
    ).resolves.toBeDefined()
    const row = await A().get({ id })
    expect(row.content.summary).toBe("Pastedfrom PDF")
  })

  it("strips a NUL byte out of the title too", async () => {
    const nul = String.fromCharCode(0)
    const { id } = await A().create({ title: `QA-TEST${nul}-nul-title` })
    expect((await A().get({ id })).title).toBe("QA-TEST-nul-title")
  })

  it("rejects an unknown jobId without leaking the FK constraint", async () => {
    await expect(
      A().create({ title: "QA-TEST-badfk", jobId: "no-such-job-id" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
