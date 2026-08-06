-- Stage 2 of the RLS rollout — the tenant isolation itself.
--
-- ⚠️ DO NOT APPLY THIS UNTIL ALL OF THE FOLLOWING ARE TRUE:
--   1. 0006 has been applied and has run in production without incident.
--   2. DATABASE_URL for apps/web points at `agora_web`, not `neondb_owner`.
--   3. The web app uses `withUserContext()` from packages/db/src/rls.ts for every
--      user-scoped query — i.e. the WebSocket driver is live and the transaction sets
--      `app.current_user_id`.
--   4. `pnpm --filter @agora/db test` passes, including the cross-tenant isolation test.
--
-- Applying this while the app still uses the stateless HTTP driver makes
-- `current_setting('app.current_user_id', true)` return NULL on every query, every policy
-- evaluates false, and every screen in the product shows empty. That failure is total and
-- immediate — which is exactly why it is a separate migration you apply deliberately,
-- rather than a few more lines inside 0006.
--
-- ROLLBACK: re-create 0006's `stage1_permissive` policies and drop these. Both sets are
-- named, so the swap is mechanical. Have that command to hand before you run this.

-- ── The isolation predicate ──────────────────────────────────────────────────
--
-- `current_setting('app.current_user_id', true)` — the second argument is `missing_ok`.
-- Without it an unset variable raises rather than returning NULL, and a raise inside a
-- policy surfaces as a hard query error instead of a clean empty result.
--
-- The predicate is NULL-safe by construction: when the setting is absent the comparison
-- yields NULL, which RLS treats as "not visible". A request that forgets to establish user
-- context therefore sees nothing at all. That is the fail-closed behaviour we want — a bug
-- becomes an empty screen, never another user's data.

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text
  LANGUAGE sql STABLE
  -- Pinned search_path: without it a role able to create objects could shadow a name used
  -- here and have it resolve with this function's rights.
  SET search_path = pg_catalog, public
AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')
$$;
--> statement-breakpoint

-- ── users — keyed on the row's own id ────────────────────────────────────────
DROP POLICY IF EXISTS stage1_permissive ON users;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON users
  FOR ALL
  USING (id = app_current_user_id())
  WITH CHECK (id = app_current_user_id());
--> statement-breakpoint

-- ── Everything else — keyed on user_id ───────────────────────────────────────
DROP POLICY IF EXISTS stage1_permissive ON user_profiles;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON user_profiles
  FOR ALL USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON user_documents;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON user_documents
  FOR ALL USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON user_job_actions;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON user_job_actions
  FOR ALL USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON applications;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON applications
  FOR ALL USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON follow_up_drafts;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON follow_up_drafts
  FOR ALL USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON resumes;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON resumes
  FOR ALL USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
--> statement-breakpoint
DROP POLICY IF EXISTS stage1_permissive ON subscriptions;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON subscriptions
  FOR ALL USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
--> statement-breakpoint

-- ── The workers ──────────────────────────────────────────────────────────────
--
-- Workers legitimately act across users: the extraction worker writes any user's profile,
-- the generation worker writes any user's application. They have no request-scoped user to
-- key a policy on.
--
-- Rather than exempt them with BYPASSRLS — a blunt, permanent role attribute that is
-- invisible unless you go looking for it — they get explicit named policies on exactly the
-- tables they need. The exemption stays visible in `pg_policies` and reviewable.
CREATE POLICY worker_all_tenants ON user_profiles
  FOR ALL TO agora_worker USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY worker_all_tenants ON applications
  FOR ALL TO agora_worker USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY worker_all_tenants ON follow_up_drafts
  FOR ALL TO agora_worker USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY worker_read_users ON users
  FOR SELECT TO agora_worker USING (true);
--> statement-breakpoint
CREATE POLICY worker_read_documents ON user_documents
  FOR SELECT TO agora_worker USING (true);
