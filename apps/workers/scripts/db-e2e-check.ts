/**
 * End-to-end database check.
 *
 * Two halves:
 *   READ-ONLY  — structural invariants (indexes, FK delete rules, extensions, orphans,
 *                duplicate-key violations that the constraints are supposed to prevent).
 *                Always runs. Safe against production.
 *   WRITE PATH — provisions a throwaway user, walks the real lifecycle
 *                (profile → swipe → application → resume → GDPR erasure) and asserts the
 *                constraints actually fire, then deletes everything it created.
 *                Only runs with --write.
 *
 *   pnpm --filter @agora/workers tsx scripts/db-e2e-check.ts
 *   pnpm --filter @agora/workers tsx scripts/db-e2e-check.ts --write
 */
import "../src/env"
import {
  applications,
  getDb,
  jobs,
  resumes,
  userDocuments,
  userJobActions,
  userProfiles,
  users,
} from "@agora/db"
import { and, eq, sql } from "drizzle-orm"

const WRITE = process.argv.includes("--write")
const TEST_CLERK_ID = `e2e_test_${Date.now()}`

let passed = 0
let failed = 0
const failures: string[] = []

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++
    console.log(`  PASS  ${name}`)
  } else {
    failed++
    failures.push(name)
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

/** Assert a statement violates a constraint (i.e. the constraint is doing its job). */
async function expectViolation(name: string, fn: () => Promise<unknown>) {
  try {
    await fn()
    check(name, false, "statement succeeded but should have been rejected")
  } catch {
    check(name, true)
  }
}

async function main() {
  const db = getDb()
  console.log(
    `DB E2E check — ${WRITE ? "READ-ONLY + WRITE PATH" : "READ-ONLY (pass --write for the full lifecycle)"}\n`,
  )

  // ── Structure ──────────────────────────────────────────────────────────────
  console.log("Structure")
  const ext = await db.execute(sql`select extname from pg_extension`)
  const extNames = ext.rows.map((r) => r.extname as string)
  check("pgvector installed", extNames.includes("vector"))
  check("pg_trgm installed (matching.ts uses similarity())", extNames.includes("pg_trgm"))

  const idx = await db.execute(sql`select indexname from pg_indexes where schemaname='public'`)
  const idxNames = new Set(idx.rows.map((r) => r.indexname as string))
  for (const required of [
    "jobs_external_id_source_idx",
    "jobs_embedding_idx",
    "user_profiles_embedding_idx",
    "user_job_actions_user_job_idx",
    "resumes_user_id_is_base_idx",
    "user_profiles_user_id_idx",
    "applications_user_id_job_id_idx",
    "jobs_is_active_scraped_at_idx",
  ]) {
    check(`index present: ${required}`, idxNames.has(required))
  }

  const uniq = await db.execute(sql`
    select i.relname, ix.indisunique from pg_index ix
    join pg_class i on i.oid = ix.indexrelid
    where i.relname in ('user_profiles_user_id_idx','applications_user_id_job_id_idx')`)
  for (const row of uniq.rows) {
    check(`${row.relname} is UNIQUE`, row.indisunique === true)
  }

  // ── GDPR cascade wiring ────────────────────────────────────────────────────
  console.log("\nGDPR cascade")
  const fks = await db.execute(sql`
    select tc.table_name, kcu.column_name, rc.delete_rule
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
    join information_schema.referential_constraints rc on tc.constraint_name = rc.constraint_name
    where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public'`)
  const userFks = fks.rows.filter((r) => r.column_name === "user_id")
  check(
    "every user_id FK is ON DELETE CASCADE",
    userFks.length > 0 && userFks.every((r) => r.delete_rule === "CASCADE"),
    userFks
      .filter((r) => r.delete_rule !== "CASCADE")
      .map((r) => `${r.table_name}=${r.delete_rule}`)
      .join(", "),
  )
  const jobFks = fks.rows.filter((r) => r.column_name === "job_id")
  check(
    "applications.job_id / resumes.job_id are SET NULL (history survives)",
    jobFks
      .filter((r) => r.table_name === "applications" || r.table_name === "resumes")
      .every((r) => r.delete_rule === "SET NULL"),
  )

  // ── Referential + data invariants ──────────────────────────────────────────
  console.log("\nData invariants")
  const inv = await db.execute(sql`
    select
      (select count(*) from user_profiles p left join users u on u.id=p.user_id where u.id is null) orphan_profiles,
      (select count(*) from applications a left join users u on u.id=a.user_id where u.id is null) orphan_apps,
      (select count(*) from user_job_actions a left join jobs j on j.id=a.job_id where j.id is null) orphan_actions,
      (select count(*) from (select user_id from user_profiles group by user_id having count(*)>1) x) dup_profiles,
      (select count(*) from jobs where coalesce(trim(title),'')='' or coalesce(trim(company),'')=''
         or coalesce(trim(description),'')='' or source_url not like 'http%') bad_jobs,
      (select count(*) from jobs where hourly_rate = 0) zero_rate,
      (select count(*) from jobs where source='seed') seed_rows,
      (select count(*) from jobs where job_embedding is null and is_active) unembedded_active,
      (select count(*) from user_profiles where onboarding_complete and profile_embedding is null) onboarded_no_embedding`)
  const i = inv.rows[0] as Record<string, string>
  check("no orphaned user_profiles", Number(i.orphan_profiles) === 0)
  check("no orphaned applications", Number(i.orphan_apps) === 0)
  check("no orphaned user_job_actions", Number(i.orphan_actions) === 0)
  check("no duplicate profiles per user", Number(i.dup_profiles) === 0)
  check("no jobs with blank NOT NULL text or non-http url", Number(i.bad_jobs) === 0)
  check(
    "no jobs with hourly_rate = 0 (parse-failure sentinel)",
    Number(i.zero_rate) === 0,
    `${i.zero_rate} rows`,
  )
  check("no fabricated seed jobs live", Number(i.seed_rows) === 0, `${i.seed_rows} rows`)
  check(
    "every active job is embedded (else invisible to matching)",
    Number(i.unembedded_active) === 0,
    `${i.unembedded_active} active jobs have no embedding`,
  )
  check(
    "every onboarded profile is embedded (else no vector matching for that user)",
    Number(i.onboarded_no_embedding) === 0,
    `${i.onboarded_no_embedding} onboarded users have no profile embedding`,
  )

  // ── Query paths actually execute ───────────────────────────────────────────
  console.log("\nQuery paths")
  try {
    await db.execute(sql`select similarity(description, 'python react') from jobs limit 1`)
    check("pg_trgm similarity() runs against jobs.description", true)
  } catch (e) {
    check("pg_trgm similarity() runs against jobs.description", false, String(e))
  }
  try {
    const probe = await db.execute(
      sql`select job_embedding from jobs where job_embedding is not null limit 1`,
    )
    if (probe.rows.length === 0) {
      check("cosine KNN over jobs.job_embedding", false, "no embedded rows to probe")
    } else {
      const v = probe.rows[0]?.job_embedding
      await db.execute(
        sql`select id, 1 - (job_embedding <=> ${v}::vector) sim from jobs
            where job_embedding is not null order by sim desc limit 5`,
      )
      check("cosine KNN over jobs.job_embedding", true)
    }
  } catch (e) {
    check("cosine KNN over jobs.job_embedding", false, String(e))
  }

  // ── Write path ─────────────────────────────────────────────────────────────
  if (WRITE) {
    console.log("\nLifecycle (write path)")
    let userId: string | undefined
    try {
      const [u] = await db
        .insert(users)
        .values({ clerkId: TEST_CLERK_ID, email: `${TEST_CLERK_ID}@example.invalid` })
        .returning({ id: users.id })
      userId = u?.id
      check("user provisioned", !!userId)
      if (!userId) throw new Error("no user id")

      await db.insert(userProfiles).values({ userId, visaType: "student_visa_16b" })
      check("profile created", true)

      await expectViolation("second profile for same user is rejected", () =>
        db.insert(userProfiles).values({ userId: userId as string, visaType: "eu_citizen" }),
      )

      const [job] = await db.select({ id: jobs.id }).from(jobs).limit(1)
      if (!job) {
        check("a job exists to swipe on", false)
      } else {
        await db
          .insert(userJobActions)
          .values({ userId, jobId: job.id, action: "right", matchScore: 7 })
        check("swipe recorded", true)

        const dup = await db
          .insert(userJobActions)
          .values({ userId, jobId: job.id, action: "left" })
          .onConflictDoNothing({ target: [userJobActions.userId, userJobActions.jobId] })
          .returning({ id: userJobActions.id })
        check("repeat swipe is a no-op, not an error", dup.length === 0)

        await db.insert(applications).values({ userId, jobId: job.id })
        await expectViolation("second application for same (user, job) is rejected", () =>
          db.insert(applications).values({ userId: userId as string, jobId: job.id }),
        )

        await db.insert(resumes).values({
          userId,
          title: "E2E",
          isBase: true,
          content: {} as never,
        })
        await expectViolation("second base resume for same user is rejected", () =>
          db.insert(resumes).values({
            userId: userId as string,
            title: "E2E 2",
            isBase: true,
            content: {} as never,
          }),
        )
      }

      await db.insert(userDocuments).values({
        userId,
        storageKey: `cv/${TEST_CLERK_ID}/x.pdf`,
        fileType: "cv_upload",
        filename: "x.pdf",
      })

      // GDPR erasure: one delete must take every user-linked row with it.
      await db.delete(users).where(eq(users.id, userId))
      const left = await db.execute(sql`
        select
          (select count(*) from user_profiles where user_id=${userId}) p,
          (select count(*) from user_documents where user_id=${userId}) d,
          (select count(*) from user_job_actions where user_id=${userId}) a,
          (select count(*) from applications where user_id=${userId}) ap,
          (select count(*) from resumes where user_id=${userId}) r`)
      const l = left.rows[0] as Record<string, string>
      const total = Number(l.p) + Number(l.d) + Number(l.a) + Number(l.ap) + Number(l.r)
      check("deleting the user cascades every linked row", total === 0, `${total} rows survived`)
      userId = undefined
    } finally {
      if (userId) {
        await db.delete(users).where(eq(users.id, userId))
        console.log("  (cleaned up test user)")
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) console.log(`Failing: ${failures.join(", ")}`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
