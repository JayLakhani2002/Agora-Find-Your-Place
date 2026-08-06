-- Stage 1 of the RLS rollout. Read docs/Security/RLS-ROLLOUT.md before running this.
--
-- WHAT THIS DOES
--   1. Creates three least-privilege roles to replace the single `neondb_owner`
--      credential currently used by the web app, the workers AND migrations alike.
--   2. Enables Row Level Security on every user-linked table, with PERMISSIVE
--      (`USING (true)`) policies, so behaviour is unchanged.
--
-- WHAT THIS DELIVERS ON ITS OWN
--   The role split — the immediately valuable half. Once the web app connects as
--   `agora_web`, a leaked application connection string can no longer DROP or TRUNCATE
--   anything, and cannot touch tables it has no business reading.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
--   Enforce tenant isolation. The policies are `USING (true)` on purpose. RLS is switched
--   ON here so that the plumbing, grants and ownership are proven correct in production
--   under zero behavioural risk. Stage 2 (0007) replaces these policies with ones keyed on
--   `app.current_user_id`, and MUST NOT be applied until the session-variable plumbing in
--   packages/db/src/rls.ts is live. Enabling and restricting in one deploy is how you take
--   the product down at 2am.
--
-- WHY RLS IS INERT UNTIL THE ROLE CHANGES
--   Postgres exempts a table's OWNER from its own RLS policies unless FORCE ROW LEVEL
--   SECURITY is set. The app currently connects as `neondb_owner`, which owns every table,
--   so enabling RLS changes nothing at all until DATABASE_URL is switched to `agora_web`.
--   That ordering is the safety property this migration is built around.
--
-- IDEMPOTENT: safe to re-run.

-- ── Roles ────────────────────────────────────────────────────────────────────
-- NOLOGIN group roles. Neon creates the actual login roles in its console; these get
-- granted to them. No password ever appears in this file.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agora_web') THEN
    CREATE ROLE agora_web NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agora_worker') THEN
    CREATE ROLE agora_worker NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agora_migrate') THEN
    CREATE ROLE agora_migrate NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint

-- Baseline: no implicit rights. Grants to `public` are how "least privilege" quietly
-- becomes "everyone can read everything".
REVOKE ALL ON SCHEMA public FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO agora_web, agora_worker, agora_migrate;
--> statement-breakpoint

-- ── agora_web — the request path ─────────────────────────────────────────────
-- DML only. No DDL, no TRUNCATE. Jobs are read-only: the web app must never be able to
-- rewrite the job corpus, which is the workers' business.

GRANT SELECT, INSERT, UPDATE, DELETE ON
  users, user_profiles, user_documents, user_job_actions,
  applications, follow_up_drafts, resumes, subscriptions
TO agora_web;
--> statement-breakpoint
GRANT SELECT ON jobs TO agora_web;
--> statement-breakpoint

-- ── agora_worker — unattended ingest and generation ──────────────────────────
-- Owns the job corpus. Deliberately has NO access to subscriptions (billing is not the
-- workers' concern) and cannot delete users.

GRANT SELECT, INSERT, UPDATE ON jobs TO agora_worker;
--> statement-breakpoint
GRANT SELECT, UPDATE ON user_profiles TO agora_worker;
--> statement-breakpoint
GRANT SELECT ON users, user_documents TO agora_worker;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON applications, follow_up_drafts TO agora_worker;
--> statement-breakpoint

-- ── agora_migrate — CI only ──────────────────────────────────────────────────
-- The only role that may change structure. Used by the migration job, nothing else.

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO agora_migrate;
--> statement-breakpoint
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO agora_migrate;
--> statement-breakpoint
GRANT CREATE ON SCHEMA public TO agora_migrate;
--> statement-breakpoint

-- Future tables inherit the same shape, so adding a table cannot silently open a
-- privilege gap that nobody notices until it is a finding.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agora_web;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO agora_worker;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO agora_migrate;
--> statement-breakpoint

-- ── Enable RLS (permissive for now) ──────────────────────────────────────────
-- Every table carrying a user_id FK, plus users itself.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE user_job_actions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE follow_up_drafts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Permissive stage-1 policies: behaviour identical to no RLS, but the mechanism is live
-- and provably correct. 0007 replaces every one of these.
DROP POLICY IF EXISTS stage1_permissive ON users;
--> statement-breakpoint
CREATE POLICY stage1_permissive ON users FOR ALL USING (true) WITH CHECK (true);
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON user_profiles;
--> statement-breakpoint
CREATE POLICY stage1_permissive ON user_profiles FOR ALL USING (true) WITH CHECK (true);
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON user_documents;
--> statement-breakpoint
CREATE POLICY stage1_permissive ON user_documents FOR ALL USING (true) WITH CHECK (true);
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON user_job_actions;
--> statement-breakpoint
CREATE POLICY stage1_permissive ON user_job_actions FOR ALL USING (true) WITH CHECK (true);
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON applications;
--> statement-breakpoint
CREATE POLICY stage1_permissive ON applications FOR ALL USING (true) WITH CHECK (true);
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON follow_up_drafts;
--> statement-breakpoint
CREATE POLICY stage1_permissive ON follow_up_drafts FOR ALL USING (true) WITH CHECK (true);
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON resumes;
--> statement-breakpoint
CREATE POLICY stage1_permissive ON resumes FOR ALL USING (true) WITH CHECK (true);
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON subscriptions;
--> statement-breakpoint
CREATE POLICY stage1_permissive ON subscriptions FOR ALL USING (true) WITH CHECK (true);
