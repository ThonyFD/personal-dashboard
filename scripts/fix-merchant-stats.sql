-- Fix Merchant Stats Script
-- This script recalculates merchant transaction counts and total amounts

-- First, check current state
SELECT
  COUNT(*) as merchants_with_zero_stats
FROM merchants
WHERE transaction_count = 0 OR total_amount = 0;

-- Update all merchant stats based on actual transactions
UPDATE merchants m
SET
  transaction_count = COALESCE(t.txn_count, 0),
  total_amount = COALESCE(t.txn_total, 0),
  updated_at = NOW()
FROM (
  SELECT
    merchant_id,
    COUNT(*) as txn_count,
    SUM(amount) as txn_total
  FROM transactions
  WHERE merchant_id IS NOT NULL
  GROUP BY merchant_id
) t
WHERE m.id = t.merchant_id;

-- Verify the fix
SELECT
  m.id,
  m.name,
  m.transaction_count,
  m.total_amount,
  (SELECT COUNT(*) FROM transactions WHERE merchant_id = m.id) as actual_count,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE merchant_id = m.id) as actual_total
FROM merchants m
ORDER BY m.transaction_count DESC
LIMIT 10;

-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'update_merchant_stats_trigger';
