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
CREATE POLICY "Shared tags" ON public.mood_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

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

COMMIT;
