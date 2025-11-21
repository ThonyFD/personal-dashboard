-- Verify Merchant Stats Fix
-- Check top 15 merchants with updated stats

SELECT
  m.id,
  m.name,
  m.transaction_count,
  m.total_amount,
  (SELECT COUNT(*) FROM transactions WHERE merchant_id = m.id) as actual_count,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE merchant_id = m.id) as actual_total,
  CASE
    WHEN m.transaction_count = (SELECT COUNT(*) FROM transactions WHERE merchant_id = m.id) THEN '✓'
    ELSE '✗'
  END as count_matches
FROM merchants m
WHERE m.transaction_count > 0
ORDER BY m.transaction_count DESC
LIMIT 15;
