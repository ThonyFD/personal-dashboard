-- Merchants page: sort by every column and show the date of the last transaction.
--
-- The page paginates on the server, so every sortable column must exist in the
-- view. Two columns are appended (CREATE OR REPLACE VIEW only allows new columns
-- at the end):
--   avg_amount     total_amount / transaction_count, 0 for a merchant without rows
--   last_txn_date  newest transactions.txn_date of the merchant, NULL without rows
--
-- last_txn_date is computed on read (index transactions_merchantId_idx), so it is
-- always right after inserts, deletes and merchant reassignments.
--
-- WITH must be repeated: replacing a view resets its options, and
-- security_invoker keeps RLS in force. Grants are kept by CREATE OR REPLACE.
-- Runs as one transaction.

BEGIN;

CREATE OR REPLACE VIEW public.v_merchant_stats WITH (security_invoker = on) AS
SELECT
  m.id,
  m.name,
  m.normalized_name,
  m.category_id,
  m.transaction_count,
  m.total_amount,
  c.id    AS category_ref_id,
  c.name  AS category_ref_name,
  c.icon  AS category_ref_icon,
  c.color AS category_ref_color,
  m.is_own_account,
  CASE
    WHEN m.transaction_count > 0 THEN m.total_amount / m.transaction_count
    ELSE 0
  END AS avg_amount,
  (
    SELECT max(t.txn_date)
    FROM public.transactions t
    WHERE t.merchant_id = m.id
  ) AS last_txn_date
FROM public.merchants  m
LEFT JOIN public.categories c ON m.category_id = c.id;

-- Gap check: the view must still run as the caller.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'v_merchant_stats'
      AND coalesce(c.reloptions && ARRAY['security_invoker=on', 'security_invoker=true'], false)
  ) THEN
    RAISE EXCEPTION 'view lost security_invoker: v_merchant_stats';
  END IF;
END $$;

COMMIT;
