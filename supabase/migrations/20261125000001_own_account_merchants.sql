-- Own-account transfers: money the owner moves between their own accounts.
-- It is not spending, so those "merchants" count against no budget, trigger no
-- budget alert and belong to no category.
--
-- The owner flags those merchants by hand (web Merchants page or SQL editor).
-- No names live in this repo, which is public.
--
-- budget_status() already skips merchants without a category, and the CHECK below
-- keeps an own-account merchant without one, so the function needs no change.
-- Runs as one transaction.

BEGIN;

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS is_own_account boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.merchants.is_own_account IS
  'true for transfers between the owner''s own accounts: not spending, no category, no budget, no alert.';

ALTER TABLE public.merchants DROP CONSTRAINT IF EXISTS merchants_own_account_no_category;
ALTER TABLE public.merchants ADD CONSTRAINT merchants_own_account_no_category
  CHECK (NOT is_own_account OR category_id IS NULL);

-- Same views as 20260525000001_shared_views_and_rpc.sql, with one column appended
-- (CREATE OR REPLACE VIEW only allows new columns at the end). WITH must be repeated:
-- replacing a view resets its options, and security_invoker keeps RLS in force.
-- Grants are kept by CREATE OR REPLACE.

CREATE OR REPLACE VIEW public.v_transactions WITH (security_invoker = on) AS
SELECT
  t.id,
  t.txn_type,
  t.channel,
  t.amount,
  t.currency,
  t.merchant_name,
  t.txn_date,
  t.txn_timestamp,
  t.provider,
  t.card_last4,
  t.description,
  t.merchant_id,
  m.name         AS merchant_normalized_name,
  m.category_id  AS merchant_category_id,
  c.id           AS category_id,
  c.name         AS category_name,
  c.icon         AS category_icon,
  c.color        AS category_color,
  e.sender_email AS email_sender,
  e.subject      AS email_subject,
  e.received_at  AS email_received_at,
  coalesce(m.is_own_account, false) AS merchant_is_own_account
FROM public.transactions t
LEFT JOIN public.merchants  m ON t.merchant_id = m.id
LEFT JOIN public.categories c ON m.category_id = c.id
LEFT JOIN public.emails     e ON t.email_id    = e.id;

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
  m.is_own_account
FROM public.merchants  m
LEFT JOIN public.categories c ON m.category_id = c.id;

-- Gap check: both views must still run as the caller.
DO $$
DECLARE
  problems text;
BEGIN
  SELECT string_agg(c.relname, ', ') INTO problems
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('v_transactions', 'v_merchant_stats')
    AND NOT coalesce(c.reloptions && ARRAY['security_invoker=on', 'security_invoker=true'], false);

  IF problems IS NOT NULL THEN
    RAISE EXCEPTION 'view lost security_invoker: %', problems;
  END IF;
END $$;

COMMIT;
