-- Payment reminders crashed with 22008 (date field value out of range):
-- get_pending_payments_next_days() ran make_date() on every manual_transactions
-- row, and Monthly Control holds days that do not exist in their month
-- (Feb 29 in a common year, Feb 30, Apr 31...). One such row anywhere in the
-- table stopped every reminder.
--
-- A day past the end of its month now means the last day of that month, so a
-- payment set on the 31st is still reminded in 30-day months. Values that can
-- never be a date (month 13, day 0, NULL day) give no due date and are skipped.

BEGIN;

CREATE OR REPLACE FUNCTION public.manual_transaction_due_date(p_year integer, p_month integer, p_day integer)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_year IS NULL OR p_month IS NULL OR p_day IS NULL THEN NULL
    WHEN p_year < 1 OR p_month NOT BETWEEN 1 AND 12 OR p_day NOT BETWEEN 1 AND 31 THEN NULL
    ELSE make_date(p_year, p_month, 1)
         + (least(p_day, extract(day FROM make_date(p_year, p_month, 1) + interval '1 month - 1 day')::integer) - 1)
  END
$$;

COMMENT ON FUNCTION public.manual_transaction_due_date(integer, integer, integer) IS
  'Due date of a manual_transactions row: a day past the end of the month is the last day of that month; impossible values give NULL.';

CREATE OR REPLACE FUNCTION public.get_pending_payments_next_days(p_days integer DEFAULT 4)
RETURNS TABLE(id bigint, description text, amount numeric, due_date date, days_ahead integer)
LANGUAGE sql
STABLE
AS $$
  SELECT t.id, t.description, t.amount, t.due_date, (t.due_date - CURRENT_DATE)::integer AS days_ahead
  FROM (
    SELECT m.id, m.description, m.amount,
           public.manual_transaction_due_date(m.year, m.month, m.day) AS due_date
    FROM public.manual_transactions m
    WHERE m.is_paid = false
  ) t
  WHERE t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days
  ORDER BY t.due_date;
$$;

-- Same lockdown as the rest of public: no PUBLIC or anon execute.
REVOKE EXECUTE ON FUNCTION public.manual_transaction_due_date(integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manual_transaction_due_date(integer, integer, integer) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_pending_payments_next_days(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_payments_next_days(integer) TO authenticated, service_role;

-- Self check: wrong dates or a crash on the real rows abort the migration.
DO $$
DECLARE
  bad text := '';
  n bigint;
BEGIN
  IF public.manual_transaction_due_date(2026, 11, 25) IS DISTINCT FROM date '2026-11-25' THEN bad := bad || ' plain_day'; END IF;
  IF public.manual_transaction_due_date(2026, 2, 30) IS DISTINCT FROM date '2026-02-28' THEN bad := bad || ' feb_common_year'; END IF;
  IF public.manual_transaction_due_date(2028, 2, 31) IS DISTINCT FROM date '2028-02-29' THEN bad := bad || ' feb_leap_year'; END IF;
  IF public.manual_transaction_due_date(2026, 4, 31) IS DISTINCT FROM date '2026-04-30' THEN bad := bad || ' thirty_day_month'; END IF;
  IF public.manual_transaction_due_date(2026, 12, 31) IS DISTINCT FROM date '2026-12-31' THEN bad := bad || ' december'; END IF;
  IF public.manual_transaction_due_date(2026, 11, NULL) IS NOT NULL THEN bad := bad || ' null_day'; END IF;
  IF public.manual_transaction_due_date(2026, 13, 1) IS NOT NULL THEN bad := bad || ' month_13'; END IF;
  IF public.manual_transaction_due_date(2026, 11, 0) IS NOT NULL THEN bad := bad || ' day_0'; END IF;
  IF public.manual_transaction_due_date(2026, 11, 32) IS NOT NULL THEN bad := bad || ' day_32'; END IF;
  IF bad <> '' THEN
    RAISE EXCEPTION 'manual_transaction_due_date wrong for:%', bad;
  END IF;

  SELECT count(*) INTO n FROM public.get_pending_payments_next_days(4);
END $$;

COMMIT;
