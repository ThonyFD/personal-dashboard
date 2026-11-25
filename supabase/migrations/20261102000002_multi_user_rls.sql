-- Multi-user split (spec: docs/superpowers/specs/2026-11-02-multi-user-design.md).
-- Personal tables get an owner column and per-user policies; finance tables become
-- owner-only through is_owner(); anon loses every policy. Runs as one transaction.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_owner) THEN
    RAISE EXCEPTION 'app_owner is empty, insert the owner uid first';
  END IF;
END $$;

-- 1. Owner column on personal tables, backfilled to the owner.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_habits', 'habit_logs', 'mood_logs', 'mood_checkins', 'mood_log_tags'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET user_id = (SELECT user_id FROM public.app_owner) WHERE user_id IS NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT auth.uid()', t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_habits_user ON public.user_habits(user_id, is_active, day_block, sort_order);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date ON public.mood_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_mood_checkins_user ON public.mood_checkins(user_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_log_tags_user ON public.mood_log_tags(user_id);

-- 2. One mood per day per user.
ALTER TABLE public.mood_logs DROP CONSTRAINT IF EXISTS unique_mood_day;
ALTER TABLE public.mood_logs ADD CONSTRAINT unique_mood_day UNIQUE (user_id, log_date);

-- 3. Drop every existing policy on the tables in scope, then rebuild.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY (ARRAY[
      'user_habits', 'habit_logs', 'mood_logs', 'mood_checkins', 'mood_log_tags',
      'habit_templates', 'mood_tags',
      'transactions', 'manual_transactions', 'monthly_incomes', 'categories', 'merchants',
      'emails', 'gmail_sync_state', 'push_subscriptions', 'notification_preferences', 'system_alerts'
    ])
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- Personal tables: each account sees only its own rows.
ALTER TABLE public.user_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own rows" ON public.user_habits FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own rows" ON public.habit_logs FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_habits h WHERE h.id = user_habit_id AND h.user_id = auth.uid())
  );

ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own rows" ON public.mood_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own rows" ON public.mood_checkins FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.mood_log_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own rows" ON public.mood_log_tags FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.mood_logs m WHERE m.id = mood_log_id AND m.user_id = auth.uid())
  );

-- Shared catalogs.
ALTER TABLE public.habit_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read catalog" ON public.habit_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner writes catalog" ON public.habit_templates FOR INSERT TO authenticated WITH CHECK (public.is_owner());
CREATE POLICY "Owner updates catalog" ON public.habit_templates FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Owner deletes catalog" ON public.habit_templates FOR DELETE TO authenticated USING (public.is_owner());

ALTER TABLE public.mood_tags ENABLE ROW LEVEL SECURITY;
-- Anyone may read and add tags; only the owner may rename or delete them, because a
-- delete cascades through mood_log_tags and would strip tags from other accounts' logs.
CREATE POLICY "Read tags" ON public.mood_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Add tags" ON public.mood_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner updates tags" ON public.mood_tags FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "Owner deletes tags" ON public.mood_tags FOR DELETE TO authenticated USING (public.is_owner());

-- Finance and notifications: owner only. system_alerts came from the older
-- packages/sql folder, so every table is guarded with to_regclass.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transactions', 'manual_transactions', 'monthly_incomes', 'categories', 'merchants',
    'emails', 'gmail_sync_state', 'push_subscriptions', 'notification_preferences', 'system_alerts'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "Owner only" ON public.%I FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner())',
        t
      );
    END IF;
  END LOOP;
END $$;

-- 3b. Drift found by supabase/checks/rls_diagnostic.sql on 2026-11-23: tables created
-- outside this repo whose only policy checks auth.role() = 'service_role' but has no TO
-- clause, so it is attached to PUBLIC. service_role bypasses RLS anyway and the check is
-- false for anon and authenticated, so moving the policy to service_role changes nothing
-- for anyone; it only stops the gap check below from flagging a PUBLIC policy.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY['tdash_componentes', 'tdash_datasources', 'tdash_pantallas', 'tseg_roles'])
      AND roles && ARRAY['public']::name[]
      AND qual = '(auth.role() = ''service_role''::text)'
      AND with_check = '(auth.role() = ''service_role''::text)'
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO service_role', p.policyname, p.tablename);
  END LOOP;
END $$;

-- 4. Server-only functions: callable with the service role only.
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('get_or_create_merchant', 'count_duplicate_merchants')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;

-- 5. Gap check: abort if anything in public still lets anon or other accounts around RLS.
-- Objects created outside the repo (drift) surface here instead of staying open.
DO $$
DECLARE
  problems text;
BEGIN
  SELECT string_agg(item, '; ') INTO problems FROM (
    SELECT 'table without RLS: ' || c.relname AS item
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
    UNION ALL
    SELECT 'policy for public/anon: ' || tablename || '.' || policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND (roles && ARRAY['public', 'anon']::name[])
    UNION ALL
    SELECT 'view without security_invoker: ' || c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
      AND NOT coalesce(c.reloptions && ARRAY['security_invoker=on', 'security_invoker=true'], false)
    UNION ALL
    SELECT 'security definer function callable by clients: ' || p.oid::regprocedure::text
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proname <> 'is_owner'
      -- Trigger and event trigger functions (e.g. rls_auto_enable) cannot be called
      -- by clients: Postgres only runs them as triggers.
      AND p.prorettype NOT IN ('trigger'::regtype, 'event_trigger'::regtype)
      AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  ) gaps;

  IF problems IS NOT NULL THEN
    RAISE EXCEPTION 'multi-user gap check failed: %', problems;
  END IF;
END $$;

COMMIT;
