-- Own-account merchants check. NOT a migration: run by hand in the Supabase SQL editor
-- after 20261125000001_own_account_merchants.sql.
--
-- Uses throwaway 2099 rows inside one DO block that always ends with an exception,
-- so everything is rolled back. Results are in the error message:
-- "OWN ACCOUNT CHECK RESULTS: name=t ..." Every check must say true.

DO $$
DECLARE
  cat_id bigint;
  own_id bigint;
  mail_id bigint;
  results text := '';
  ok boolean;
  n bigint;
BEGIN
  INSERT INTO public.categories (name, icon, color, is_default)
  VALUES ('zz own account check', '🧪', '#000000', false)
  RETURNING id INTO cat_id;

  INSERT INTO public.budgets (category_id, label, emoji, monthly_limit)
  VALUES (cat_id, 'zz own account check', '🧪', 100.00);

  -- An own-account merchant cannot keep a category.
  BEGIN
    INSERT INTO public.merchants (name, normalized_name, category_id, is_own_account)
    VALUES ('ZZ OWN CHECK BAD', 'zz own check bad', cat_id, true);
    ok := false;
  EXCEPTION WHEN check_violation THEN ok := true;
  END;
  results := results || format(' own_account_rejects_category=%s', ok);

  INSERT INTO public.merchants (name, normalized_name, is_own_account)
  VALUES ('ZZ OWN CHECK', 'zz own check', true)
  RETURNING id INTO own_id;

  INSERT INTO public.emails (gmail_message_id, sender_email, received_at, body_hash, parsed)
  VALUES ('zz-own-account-check', 'check@example.invalid', '2099-03-10T12:00:00Z', 'zz', true)
  RETURNING id INTO mail_id;

  INSERT INTO public.transactions (email_id, merchant_id, txn_type, channel, amount, txn_date, provider, idempotency_key)
  VALUES (mail_id, own_id, 'TRANSFER', 'MOBILE_PAYMENT', 500.00, '2099-03-10', 'check', 'zz-own-account-check');

  -- Still no spend in the budget for that month.
  SELECT count(*) INTO n FROM public.budget_status('2099-03-20') WHERE category_id = cat_id AND spent = 0;
  results := results || format(' budget_ignores_own_transfer=%s', n = 1);

  SELECT count(*) INTO n FROM public.v_transactions WHERE merchant_id = own_id AND merchant_is_own_account AND category_id IS NULL;
  results := results || format(' view_exposes_flag=%s', n = 1);

  SELECT count(*) INTO n FROM public.v_merchant_stats WHERE id = own_id AND is_own_account;
  results := results || format(' merchant_stats_exposes_flag=%s', n = 1);

  RAISE EXCEPTION 'OWN ACCOUNT CHECK RESULTS:%', results;
END $$;
