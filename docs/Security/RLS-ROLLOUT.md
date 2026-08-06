# RLS + least-privilege roles — rollout runbook

**Decision:** Jay, 2026-08-06 — "build it now, staged".
**Supersedes:** `packages/db/drizzle/0002_rls_decision.md`

## Why

Today every user-scoped query is protected by exactly one thing: a hand-written
`.where(eq(x.userId, ctx.user.id))` in the router. The 2026-08-06 review found that
discipline currently holds everywhere — but there is **no second layer**. One forgotten
clause in one future procedure is a full cross-tenant breach of visa status, CVs and
application history.

Separately, `neondb_owner` — a full DDL/owner role — is the credential used by the web app,
the workers *and* migrations. A leaked application connection string can `DROP TABLE`.

RLS turns "forgot a WHERE clause" into "returned zero rows". The role split turns "leaked
connection string" into "read some rows you were already allowed to read".

## The constraint that made this hard

`drizzle-orm/neon-http` sends every query as an independent stateless HTTP POST. RLS keyed
on `current_setting('app.current_user_id')` needs the SET and the SELECT to share a session,
which that driver cannot provide. This is exactly what `0002_rls_decision.md` recorded, and
it was a correct reading at the time.

The resolution is `packages/db/src/rls.ts`: the WebSocket driver, one transaction per unit
of work, with the user id set as a **transaction-local** variable.

## The two migrations, and why they are separate

| | What | Behavioural risk | Apply when |
|---|------|------------------|------------|
| **0006** | Creates the three roles, grants least privilege, enables RLS with `USING (true)` policies | **None.** Permissive policies behave identically to no RLS, and RLS is inert anyway while the app connects as table owner | Now |
| **0007** | Replaces those policies with `user_id = app_current_user_id()` | **Total if applied early.** Every screen goes empty | Only after every user-scoped query uses `withUserContext` |

Splitting them is the whole point. Enabling and restricting in one deploy is how you find
out at 2am that one query path never established user context.

---

## Stage 1 — roles (safe, do this now)

### 1. Create the login roles in the Neon console

`0006` creates `agora_web`, `agora_worker`, `agora_migrate` as `NOLOGIN` group roles. Neon
manages actual login roles and their passwords in its console, so create three there and
grant it each group:

```sql
GRANT agora_web      TO <neon_login_role_for_web>;
GRANT agora_worker   TO <neon_login_role_for_workers>;
GRANT agora_migrate  TO <neon_login_role_for_ci>;
```

Keep the passwords in the platform env stores only. Never in the repo.

### 2. Apply the migration

```sh
pnpm --filter @agora/db db:migrate
```

Still connected as `neondb_owner` at this point — the migration needs owner rights.

### 3. Verify the grants before switching anything

```sql
-- agora_web must NOT be able to write jobs, and must have no DDL anywhere.
SELECT grantee, table_name, string_agg(privilege_type, ',' ORDER BY privilege_type)
FROM information_schema.role_table_grants
WHERE grantee IN ('agora_web','agora_worker','agora_migrate')
GROUP BY grantee, table_name ORDER BY grantee, table_name;

-- RLS should be enabled on all 8 user-linked tables, each with one permissive policy.
SELECT c.relname, c.relrowsecurity, count(p.polname) AS policies
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relname IN ('users','user_profiles','user_documents','user_job_actions',
                    'applications','follow_up_drafts','resumes','subscriptions')
GROUP BY c.relname, c.relrowsecurity ORDER BY c.relname;
```

Expect `relrowsecurity = t` and `policies = 1` on every row.

### 4. Switch the app credentials

- `apps/web` → `DATABASE_URL` = the `agora_web` connection string
- `apps/workers` → `DATABASE_URL` = the `agora_worker` connection string
- CI migration job → `agora_migrate`

**This is the step that delivers the value**, because RLS is inert while the app connects
as table owner. It is also the step most likely to surface a missing grant.

### 5. Smoke test

Sign in, load the deck, upload a CV, open Settings. Then confirm the destructive path is
actually closed:

```sql
-- As agora_web. Must fail with "permission denied".
TRUNCATE users;
DROP TABLE resumes;
INSERT INTO jobs (id, title) VALUES ('x','y');
```

If any of those succeed, stop and re-check the grants.

**Rollback for stage 1:** point `DATABASE_URL` back at `neondb_owner`. The roles and the
permissive policies can stay — they do nothing on their own.

---

## Stage 2 — isolation (only after the app is ready)

### Prerequisites, all of them

1. Stage 1 has been live and quiet for at least a few days.
2. `DATABASE_URL_UNPOOLED` is set for `apps/web`. Session state is **not** safe through a
   transaction-mode pooler, which is why `rls.ts` prefers the unpooled endpoint.
3. Every user-scoped query in `apps/web/src/server/routers/` runs inside
   `withUserContext(ctx.user.id, …)`.
4. `pnpm --filter @agora/db test` passes.

### The router migration

Mechanical, one router at a time. Today:

```ts
const rows = await ctx.db.select().from(applications)
  .where(eq(applications.userId, ctx.user.id))
```

After:

```ts
const rows = await withUserContext(ctx.user.id, (tx) =>
  tx.select().from(applications).where(eq(applications.userId, ctx.user.id)),
)
```

**Keep the `where` clause.** RLS is defence in depth, not a replacement for it — two
independent layers must fail before data crosses a tenant boundary. Deleting the
application-layer scope because "RLS handles it now" throws away the thing that has been
protecting users all along and leaves a single layer again, just a different one.

Suggested order, least to most risky: `profile` → `resumes` → `onboarding` →
`applications` → `deck` → `gdpr` → `billing`.

### Then apply 0007

```sh
pnpm --filter @agora/db db:migrate
```

### Verify isolation is real

The check that matters — with two known user ids:

```sql
BEGIN;
SELECT set_config('app.current_user_id', '<user_a_id>', true);
SELECT count(*) FROM applications;                 -- only user A's
SELECT count(*) FROM applications WHERE user_id = '<user_b_id>';  -- must be 0
COMMIT;

-- And with no context at all: must return 0, not everything.
BEGIN;
SELECT count(*) FROM applications;
COMMIT;
```

That last one is the fail-closed property. If it returns a non-zero count, the policies are
not doing what they claim.

### Rollback for stage 2

```sql
DROP POLICY tenant_isolation ON applications;
CREATE POLICY stage1_permissive ON applications FOR ALL USING (true) WITH CHECK (true);
-- repeat for each of the 8 tables
```

Have this in a file **before** you apply 0007, not after you need it.

---

## Known consequences

- **Connection cost.** The WebSocket driver holds a real connection per request. On
  serverless that is meaningfully more expensive than the HTTP driver and introduces a
  connection ceiling. Watch Neon's connection metrics after stage 2.
- **The workers legitimately cross tenants.** They get explicit named policies in 0007
  rather than `BYPASSRLS`, so the exemption stays visible in `pg_policies` and reviewable.
- **`jobs` is not under RLS.** It is public to all authenticated users by design.
- The transaction-local `set_config` third argument (`true`) is the single most important
  character in this whole change. `packages/db/tests/rls.test.ts` fails if it ever flips.
