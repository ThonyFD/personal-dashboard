-- Remove Banistmo card purchases recorded twice because Banistmo re-sent the
-- same purchase alert a few minutes later (same authorization code, different
-- email). Example: Puma Energy PA Port, USD 75.00, auth R62842, 2026-10-17 at
-- 1:21 pm and 1:24 pm.
--
-- These rows were inserted before the parser captured the authorization code as
-- reference_number, so they have no reference and the code is not stored. A
-- duplicate is detected heuristically: same card, merchant and amount within
-- 10 minutes of an earlier row.
--
-- Run step 1, review the list (two identical real purchases minutes apart are
-- rare but possible), then run step 2 in the Supabase SQL editor.

-- 1. Review -----------------------------------------------------------------
WITH ordered AS (
  SELECT
    t.*,
    LAG(t.txn_timestamp) OVER (
      PARTITION BY t.card_last4, lower(t.merchant_name), t.amount
      ORDER BY t.txn_timestamp, t.id
    ) AS prev_ts
  FROM public.transactions t
  WHERE t.provider = 'banistmo'
    AND t.channel = 'card'
    AND (t.reference_number IS NULL OR t.reference_number = '')
)
SELECT id, email_id, txn_timestamp, prev_ts, merchant_name, amount, card_last4,
       manual_override, is_paid
FROM ordered
WHERE prev_ts IS NOT NULL
  AND txn_timestamp - prev_ts <= interval '10 minutes'
ORDER BY txn_timestamp;

-- 2. Delete (keeps the earliest row of each pair; skips user-edited rows) ---
-- BEGIN;
-- WITH ordered AS (
--   SELECT
--     t.id,
--     t.txn_timestamp,
--     t.manual_override,
--     t.is_paid,
--     LAG(t.txn_timestamp) OVER (
--       PARTITION BY t.card_last4, lower(t.merchant_name), t.amount
--       ORDER BY t.txn_timestamp, t.id
--     ) AS prev_ts
--   FROM public.transactions t
--   WHERE t.provider = 'banistmo'
--     AND t.channel = 'card'
--     AND (t.reference_number IS NULL OR t.reference_number = '')
-- )
-- DELETE FROM public.transactions
-- WHERE id IN (
--   SELECT id FROM ordered
--   WHERE prev_ts IS NOT NULL
--     AND txn_timestamp - prev_ts <= interval '10 minutes'
--     AND manual_override IS NOT TRUE
--     AND is_paid IS NOT TRUE
-- );
-- COMMIT;
