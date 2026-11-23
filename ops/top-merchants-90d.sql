-- Top 40 merchants by spend in the last 90 days (America/Panama), with their
-- current category. Read only: run it in the Supabase SQL editor before turning
-- the budget alerts on, and fix wrong categories from the web (Merchants page).
--
-- Spend uses the same rule as budget_status(): PURCHASE + TRANSFER - REFUND.
-- A merchant's category is assigned only when the merchant is first created, so
-- a wrong category keeps counting against the wrong budget until it is fixed.

SELECT
  m.id   AS merchant_id,
  m.name AS merchant,
  coalesce(c.name, '(sin categoría)') AS category,
  count(*) FILTER (WHERE upper(t.txn_type::text) <> 'REFUND') AS charges,
  sum(
    CASE WHEN upper(t.txn_type::text) = 'REFUND' THEN -abs(t.amount) ELSE abs(t.amount) END
  ) AS spent_90d
FROM transactions t
JOIN merchants m ON m.id = t.merchant_id
LEFT JOIN categories c ON c.id = m.category_id
WHERE t.txn_date >= (now() AT TIME ZONE 'America/Panama')::date - 90
  AND upper(t.txn_type::text) IN ('PURCHASE', 'TRANSFER', 'REFUND')
GROUP BY m.id, m.name, c.name
ORDER BY spent_90d DESC
LIMIT 40;

-- To fix one merchant from the SQL editor instead of the web:
-- UPDATE merchants
-- SET category_id = (SELECT id FROM categories WHERE name = 'Food & Dining')
-- WHERE id = <merchant_id>;
