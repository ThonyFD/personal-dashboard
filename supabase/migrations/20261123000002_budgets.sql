-- Budgets and per-purchase budget alerts.
-- Budgets move from the browser's localStorage to the database so the sync job can
-- compare every new purchase against the monthly cap of its category.
--
-- Run after 20261123000001_revoke_anon_privileges.sql. Needs public.is_owner()
-- from 20261102000001_app_owner.sql. Runs as one transaction.
-- Real values (caps, frozen cards) are loaded by hand in the SQL editor, never here.

BEGIN;

-- 1. Tables ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.budgets (
  id bigserial PRIMARY KEY,
  category_id bigint NOT NULL UNIQUE REFERENCES public.categories(id) ON DELETE CASCADE,
  label text NOT NULL,
  emoji text NOT NULL DEFAULT '💸',
  monthly_limit numeric(12, 2) NOT NULL CHECK (monthly_limit > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.budgets IS 'Monthly spending cap per category. Read by budget_status() for the web page and the purchase alerts.';
COMMENT ON COLUMN public.budgets.label IS 'Short Spanish name shown in the push notification, for example ''Comida fuera''.';
COMMENT ON COLUMN public.budgets.monthly_limit IS 'Cap in USD for one calendar month (America/Panama).';

CREATE TABLE IF NOT EXISTS public.alert_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  alerts_enabled boolean NOT NULL DEFAULT true,
  notify_every_purchase boolean NOT NULL DEFAULT true,
  big_purchase_threshold numeric(12, 2) NOT NULL DEFAULT 100 CHECK (big_purchase_threshold > 0),
  frozen_cards text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.alert_settings IS 'Single row (id = 1) that controls the purchase alerts.';
COMMENT ON COLUMN public.alert_settings.alerts_enabled IS 'Master switch. false stops every budget alert without a deploy.';
COMMENT ON COLUMN public.alert_settings.notify_every_purchase IS 'true: push on every purchase in a budgeted category. false: only from 80 % of the cap.';
COMMENT ON COLUMN public.alert_settings.big_purchase_threshold IS 'Purchases at or above this amount (USD) always alert.';
COMMENT ON COLUMN public.alert_settings.frozen_cards IS 'Last 4 digits of cards that should not see new charges.';

INSERT INTO public.alert_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.budget_alert_log (
  transaction_id bigint PRIMARY KEY REFERENCES public.transactions(id) ON DELETE CASCADE,
  rules text[] NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.budget_alert_log IS 'At most one push per transaction: the sync job claims the row before sending.';

-- 2. updated_at triggers -----------------------------------------------------

DROP TRIGGER IF EXISTS update_budgets_updated_at ON public.budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alert_settings_updated_at ON public.alert_settings;
CREATE TRIGGER update_alert_settings_updated_at
  BEFORE UPDATE ON public.alert_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. RLS: owner only, same pattern as the other finance tables --------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['budgets', 'alert_settings', 'budget_alert_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owner only" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Owner only" ON public.%I FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner())',
      t
    );
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

REVOKE ALL ON SEQUENCE public.budgets_id_seq FROM anon;

-- 4. budget_status(): the only place where monthly spend is computed ----------
-- Spend for a category in the month of p_as_of, from day 1 up to p_as_of (txn_date):
--   PURCHASE + TRANSFER - REFUND, for transactions whose merchant is in that category.
-- TRANSFER counts because Yappy payments are stored that way; a transfer to a person
-- only counts once that "merchant" is put in a budgeted category.
-- days_left counts p_as_of itself (the last day of the month gives 1).
-- manual_transactions do not count in this version.
-- SECURITY INVOKER: the web goes through RLS (owner only), the sync job uses the service role.

CREATE OR REPLACE FUNCTION public.budget_status(
  p_as_of date DEFAULT (now() AT TIME ZONE 'America/Panama')::date
)
RETURNS TABLE (
  category_id bigint,
  label text,
  emoji text,
  monthly_limit numeric,
  spent numeric,
  remaining numeric,
  pct numeric,
  days_left int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      date_trunc('month', p_as_of)::date AS month_start,
      (date_trunc('month', p_as_of) + interval '1 month')::date AS next_month
  ),
  spend AS (
    SELECT
      m.category_id,
      sum(
        CASE WHEN upper(t.txn_type::text) = 'REFUND' THEN -abs(t.amount) ELSE abs(t.amount) END
      ) AS spent
    FROM transactions t
    JOIN merchants m ON m.id = t.merchant_id
    CROSS JOIN bounds b
    WHERE t.txn_date >= b.month_start
      AND t.txn_date <= p_as_of
      AND upper(t.txn_type::text) IN ('PURCHASE', 'TRANSFER', 'REFUND')
      AND m.category_id IS NOT NULL
    GROUP BY m.category_id
  )
  SELECT
    bu.category_id,
    bu.label,
    bu.emoji,
    bu.monthly_limit,
    coalesce(s.spent, 0)::numeric AS spent,
    (bu.monthly_limit - coalesce(s.spent, 0))::numeric AS remaining,
    round(coalesce(s.spent, 0) / bu.monthly_limit * 100, 2) AS pct,
    (b.next_month - p_as_of)::int AS days_left
  FROM budgets bu
  CROSS JOIN bounds b
  LEFT JOIN spend s ON s.category_id = bu.category_id
  WHERE bu.is_active
  ORDER BY bu.label;
$$;

COMMENT ON FUNCTION public.budget_status(date) IS 'Spend vs cap per active budget for the month of p_as_of. Single source of truth for the web Budgets page and the purchase alerts.';

REVOKE ALL ON FUNCTION public.budget_status(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.budget_status(date) TO authenticated, service_role;

COMMIT;
