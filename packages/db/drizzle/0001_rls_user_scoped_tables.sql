-- Enable pgvector and pg_trgm extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Row Level Security — user-scoped tables only ──────────────────────────────
-- jobs table has NO RLS — jobs are public to all authenticated users

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_job_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_drafts ENABLE ROW LEVEL SECURITY;

-- users: can only see own row
CREATE POLICY users_isolation ON users
  USING (id = current_setting('app.current_user_id', true));

-- user_profiles: scoped to owner
CREATE POLICY user_profiles_isolation ON user_profiles
  USING (user_id = current_setting('app.current_user_id', true));

-- user_documents: scoped to owner
CREATE POLICY user_documents_isolation ON user_documents
  USING (user_id = current_setting('app.current_user_id', true));

-- user_job_actions: scoped to owner
CREATE POLICY user_job_actions_isolation ON user_job_actions
  USING (user_id = current_setting('app.current_user_id', true));

-- applications: scoped to owner
CREATE POLICY applications_isolation ON applications
  USING (user_id = current_setting('app.current_user_id', true));

-- follow_up_drafts: scoped via application ownership
CREATE POLICY follow_up_drafts_isolation ON follow_up_drafts
  USING (
    application_id IN (
      SELECT id FROM applications
      WHERE user_id = current_setting('app.current_user_id', true)
    )
  );
