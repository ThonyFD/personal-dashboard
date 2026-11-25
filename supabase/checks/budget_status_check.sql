-- budget_status() check. NOT a migration: run by hand in the Supabase SQL editor
-- after 20261123000002_budgets.sql. Nothing to fill in.
--
-- Everything runs in one DO block that always ends with an exception, so every
-- test row is rolled back. Test data lives in November 2099 so real transactions
-- never mix in. The results are in the error message:
--   "BUDGET STATUS CHECK RESULTS: name=true ..." Every check must say true.
--
-- Scenario for category "zz budget check" with a cap of 100.00, as of 2099-11-21:
--   purchase  40.00 on 2099-11-05  counts
--   transfer  15.00 on 2099-11-10  counts (Yappy payment to a categorized merchant)
--   refund    10.00 on 2099-11-12  subtracts
--   purchase  99.00 on 2099-10-31  previous month, ignored
--   purchase  50.00 on 2099-11-25  after p_as_of, ignored
--   income   500.00 on 2099-11-06  wrong type, ignored
--   transfer 200.00 on 2099-11-07  to a person whose merchant has no category, ignored
-- Expected: spent 45.00, remaining 55.00, pct 45.00, days_left 10 (21..30 Nov).

DO $$
DECLARE
  cat_id bigint;
  shop_id bigint;
  person_id bigint;
  mail_id bigint;
  r record;
  last_day record;
  results text := '';
BEGIN
  INSERT INTO public.categories (name, icon, color, description, is_default)
  VALUES ('zz budget check', '🧪', '#000000', 'temporary', false)
  RETURNING id INTO cat_id;

  INSERT INTO public.merchants (name, normalized_name, category_id)
  VALUES ('ZZ CHECK SHOP', 'zz check shop', cat_id)
  RETURNING id INTO shop_id;

  INSERT INTO public.merchants (name, normalized_name, category_id)
  VALUES ('ZZ CHECK PERSON', 'zz check person', NULL)
  RETURNING id INTO person_id;

  INSERT INTO public.emails (gmail_message_id, sender_email, received_at, body_hash, parsed)
  VALUES ('zz-budget-check', 'check@example.invalid', '2099-11-01T12:00:00Z', 'zz', true)
  RETURNING id INTO mail_id;

  INSERT INTO public.transactions
    (email_id, merchant_id, txn_type, channel, amount, txn_date, provider, idempotency_key)
  VALUES
    (mail_id, shop_id,   'PURCHASE', 'CARD',           40.00, '2099-11-05', 'check', 'zz-check-1'),
    (mail_id, shop_id,   'TRANSFER', 'MOBILE_PAYMENT', 15.00, '2099-11-10', 'check', 'zz-check-2'),
    (mail_id, shop_id,   'REFUND',   'CARD',           10.00, '2099-11-12', 'check', 'zz-check-3'),
    (mail_id, shop_id,   'PURCHASE', 'CARD',           99.00, '2099-10-31', 'check', 'zz-check-4'),
    (mail_id, shop_id,   'PURCHASE', 'CARD',           50.00, '2099-11-25', 'check', 'zz-check-5'),
    (mail_id, shop_id,   'INCOME',   'MOBILE_PAYMENT', 500.00, '2099-11-06', 'check', 'zz-check-6'),
    (mail_id, person_id, 'TRANSFER', 'MOBILE_PAYMENT', 200.00, '2099-11-07', 'check', 'zz-check-7');

  INSERT INTO public.budgets (category_id, label, emoji, monthly_limit)
  VALUES (cat_id, 'zz check', '🧪', 100.00);

  SELECT * INTO r FROM public.budget_status('2099-11-21') WHERE category_id = cat_id;

  results := results || format(' row_found=%s', r.category_id IS NOT NULL);
  results := results || format(' spent_is_45=%s', r.spent = 45.00);
  results := results || format(' remaining_is_55=%s', r.remaining = 55.00);
  results := results || format(' pct_is_45=%s', r.pct = 45.00);
  results := results || format(' days_left_is_10=%s', r.days_left = 10);

  -- Last day of the month counts as one day left and includes the 25th.
  SELECT * INTO last_day FROM public.budget_status('2099-11-30') WHERE category_id = cat_id;
  results := results || format(' last_day_days_left_is_1=%s', last_day.days_left = 1);
  results := results || format(' last_day_spent_is_95=%s', last_day.spent = 95.00);

  -- Inactive budgets disappear.
  UPDATE public.budgets SET is_active = false WHERE category_id = cat_id;
  results := results || format(
    ' inactive_hidden=%s',
    NOT EXISTS (SELECT 1 FROM public.budget_status('2099-11-21') WHERE category_id = cat_id)
  );

  RAISE EXCEPTION 'BUDGET STATUS CHECK RESULTS:%', results;
END $$;
