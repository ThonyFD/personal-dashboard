-- Defense in depth for budget alerts (Phase 0).
-- 20261102000002_multi_user_rls.sql already leaves anon without any policy, so anon
-- reads return nothing. This also removes anon's table and sequence grants, so a table
-- created later without RLS is still not reachable with the anon key that ships in the
-- web bundle and the Android app.
--
-- Checked before writing this: the web only queries behind ProtectedRoute, and the
-- Android widgets catch query errors when there is no session.
--
-- Run after 20261102000002_multi_user_rls.sql. Runs as one transaction.

BEGIN;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Objects created later from the SQL editor (role postgres) start without anon grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- Gap check: abort if anon still holds any table privilege in public.
DO $$
DECLARE
  problems text;
BEGIN
  SELECT string_agg(c.relname, ', ') INTO problems
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm')
    AND has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE');

  IF problems IS NOT NULL THEN
    RAISE EXCEPTION 'anon still has table privileges on: %', problems;
  END IF;
END $$;

COMMIT;
