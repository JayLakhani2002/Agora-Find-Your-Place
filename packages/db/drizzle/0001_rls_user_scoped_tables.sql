-- ── Row Level Security — user-scoped tables only ──────────────────────────────
-- jobs table has NO RLS — jobs are public to all authenticated users
-- current_setting returns '' (empty string) when unset with missing_ok=true,
-- so we cast to text and guard against empty string to prevent silent allow-all

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_job_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_drafts ENABLE ROW LEVEL SECURITY;

-- users: own row only
CREATE POLICY users_isolation ON users
  USING (
    current_setting('app.current_user_id', true) <> ''
    AND id = current_setting('app.current_user_id', true)
  );

-- user_profiles
CREATE POLICY user_profiles_isolation ON user_profiles
  USING (
    current_setting('app.current_user_id', true) <> ''
    AND user_id = current_setting('app.current_user_id', true)
  );

-- user_documents
CREATE POLICY user_documents_isolation ON user_documents
  USING (
    current_setting('app.current_user_id', true) <> ''
    AND user_id = current_setting('app.current_user_id', true)
  );

-- user_job_actions
CREATE POLICY user_job_actions_isolation ON user_job_actions
  USING (
    current_setting('app.current_user_id', true) <> ''
    AND user_id = current_setting('app.current_user_id', true)
  );

-- applications
CREATE POLICY applications_isolation ON applications
  USING (
    current_setting('app.current_user_id', true) <> ''
    AND user_id = current_setting('app.current_user_id', true)
  );

-- follow_up_drafts — direct user_id column, no subquery needed
CREATE POLICY follow_up_drafts_isolation ON follow_up_drafts
  USING (
    current_setting('app.current_user_id', true) <> ''
    AND user_id = current_setting('app.current_user_id', true)
  );
