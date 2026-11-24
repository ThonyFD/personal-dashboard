-- Multi-user RLS check. NOT a migration: run by hand in the Supabase SQL editor
-- after 20261102000002_multi_user_rls.sql.
--
-- Nothing to fill in: the owner uid comes from app_owner, and the totals are counted
-- as postgres (which bypasses RLS) at the start of the block, then compared with what
-- the owner sees through RLS. The migration only adds columns, so no row can be lost.
--
-- Everything runs in one DO block that always ends with an exception, so every
-- write (including the throwaway user) is rolled back. The results are in the
-- error message: "RLS CHECK RESULTS: name=ok ..." Every check must say true.

DO $$
DECLARE
  owner_uid uuid := (SELECT user_id FROM public.app_owner LIMIT 1);
  habits_total bigint := (SELECT count(*) FROM public.user_habits);
  logs_total bigint := (SELECT count(*) FROM public.habit_logs);
  moods_total bigint := (SELECT count(*) FROM public.mood_logs);
  tx_total bigint := (SELECT count(*) FROM public.transactions);
  other_uid uuid := '00000000-0000-0000-0000-00000000c0de';
  owner_habit bigint;
  other_habit bigint;
  n bigint;
  finance_rows bigint := 0;
  anon_rows bigint := 0;
  t text;
  results text := '';
  ok boolean;
BEGIN
  INSERT INTO auth.users (id, aud, role, email)
  VALUES (other_uid, 'authenticated', 'authenticated', 'rls-check@example.invalid');

  SELECT id INTO owner_habit FROM public.user_habits WHERE user_id = owner_uid LIMIT 1;

  -- Authenticated phase. The subtransaction is undone at the end, which also
  -- restores the postgres role.
  BEGIN
    PERFORM set_config('role', 'authenticated', true);

    -- Owner.
    PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_uid, 'role', 'authenticated')::text, true);
    results := results || format(' owner_sees_all_habits=%s', (SELECT count(*) FROM public.user_habits) = habits_total);
    results := results || format(' owner_sees_all_logs=%s', (SELECT count(*) FROM public.habit_logs) = logs_total);
    results := results || format(' owner_sees_all_moods=%s', (SELECT count(*) FROM public.mood_logs) = moods_total);
    results := results || format(' owner_is_owner=%s', public.is_owner());
    results := results || format(' owner_sees_all_transactions=%s', (SELECT count(*) FROM public.transactions) = tx_total);
    INSERT INTO public.mood_logs (log_date, mood_score) VALUES ('2099-01-01', 3);

    -- Other account.
    PERFORM set_config('request.jwt.claims', json_build_object('sub', other_uid, 'role', 'authenticated')::text, true);
    results := results || format(' other_is_not_owner=%s', NOT public.is_owner());
    results := results || format(' other_sees_no_habits=%s', (SELECT count(*) FROM public.user_habits) = 0);
    results := results || format(' other_sees_no_logs=%s', (SELECT count(*) FROM public.habit_logs) = 0);
    results := results || format(' other_sees_no_moods=%s', (SELECT count(*) FROM public.mood_logs) = 0);
    results := results || format(' other_sees_no_checkins=%s', (SELECT count(*) FROM public.mood_checkins) = 0);

    FOREACH t IN ARRAY ARRAY[
      'transactions', 'manual_transactions', 'monthly_incomes', 'categories', 'merchants',
      'emails', 'gmail_sync_state', 'push_subscriptions', 'notification_preferences', 'system_alerts',
      'v_transactions', 'v_merchant_stats', 'v_pending_payments'
    ] LOOP
      IF to_regclass('public.' || t) IS NOT NULL THEN
        EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
        finance_rows := finance_rows + n;
      END IF;
    END LOOP;
    finance_rows := finance_rows + (SELECT count(*) FROM public.get_pending_payments_next_days(30));
    results := results || format(' other_sees_no_finance=%s', finance_rows = 0);

    BEGIN
      INSERT INTO public.monthly_incomes DEFAULT VALUES;
      ok := false;
    -- RLS is checked before NOT NULL constraints, so only a policy denial counts as a pass
    EXCEPTION
      WHEN insufficient_privilege THEN ok := true;
      WHEN others THEN ok := false;
    END;
    results := results || format(' other_cannot_write_finance=%s', ok);

    BEGIN
      DELETE FROM public.mood_tags;
      GET DIAGNOSTICS n = ROW_COUNT;
      ok := n = 0;
    EXCEPTION WHEN others THEN ok := true;
    END;
    results := results || format(' other_cannot_delete_tags=%s', ok);

    INSERT INTO public.user_habits (name, day_block) VALUES ('rls check', 'MORNING') RETURNING id INTO other_habit;
    results := results || format(' other_can_insert_own_habit=%s', other_habit IS NOT NULL);

    BEGIN
      INSERT INTO public.user_habits (name, day_block, user_id) VALUES ('rls check', 'MORNING', owner_uid);
      ok := false;
    EXCEPTION WHEN others THEN ok := true;
    END;
    results := results || format(' other_cannot_insert_for_owner=%s', ok);

    IF owner_habit IS NULL THEN
      results := results || ' other_cannot_log_owner_habit=skipped(no owner habit)';
    ELSE
      BEGIN
        INSERT INTO public.habit_logs (user_habit_id, log_date, status) VALUES (owner_habit, '2099-01-01', 'COMPLETED');
        ok := false;
      EXCEPTION WHEN others THEN ok := true;
      END;
      results := results || format(' other_cannot_log_owner_habit=%s', ok);
    END IF;

    BEGIN
      INSERT INTO public.mood_logs (log_date, mood_score) VALUES ('2099-01-01', 4);
      ok := true;
    EXCEPTION WHEN others THEN ok := false;
    END;
    results := results || format(' mood_same_day_two_users=%s', ok);

    RAISE EXCEPTION USING ERRCODE = 'ZZ001', MESSAGE = 'authenticated phase done';
  EXCEPTION WHEN SQLSTATE 'ZZ001' THEN NULL;
  END;

  -- Anon phase.
  BEGIN
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    FOREACH t IN ARRAY ARRAY[
      'user_habits', 'habit_logs', 'mood_logs', 'mood_checkins', 'mood_log_tags', 'habit_templates', 'mood_tags',
      'transactions', 'manual_transactions', 'monthly_incomes', 'categories', 'merchants',
      'emails', 'gmail_sync_state', 'push_subscriptions', 'notification_preferences', 'system_alerts',
      'v_transactions', 'v_merchant_stats', 'v_pending_payments', 'v_habit_daily_completion'
    ] LOOP
      IF to_regclass('public.' || t) IS NOT NULL THEN
        BEGIN
          EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
          anon_rows := anon_rows + n;
        EXCEPTION WHEN insufficient_privilege THEN NULL;
        END;
      END IF;
    END LOOP;
    results := results || format(' anon_sees_nothing=%s', anon_rows = 0);
    BEGIN
      PERFORM public.is_owner();
      ok := NOT public.is_owner();
    EXCEPTION WHEN insufficient_privilege THEN ok := true;
    END;
    results := results || format(' anon_is_not_owner=%s', ok);
    RAISE EXCEPTION USING ERRCODE = 'ZZ001', MESSAGE = 'anon phase done';
  EXCEPTION WHEN SQLSTATE 'ZZ001' THEN NULL;
  END;

  RAISE EXCEPTION 'RLS CHECK RESULTS:%', results;
END $$;
