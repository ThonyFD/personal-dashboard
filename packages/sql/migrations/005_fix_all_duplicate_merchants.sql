-- ============================================================
-- MIGRATION 005: Deduplicate ALL Merchants
-- ============================================================
-- Covers 762+ duplicate groups (~4,070 records to remove).
-- Groups merchants by their correctly-normalized name, keeps
-- the canonical (most actual transactions → smallest id on tie),
-- reassigns all references, then recalculates stats from scratch.
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Reassign transactions → canonical merchant
-- ============================================================
WITH renorm AS (
  SELECT
    id,
    lower(trim(regexp_replace(regexp_replace(
      translate(lower(name),
        'áàäâãåéèëêíìïîóòöôúùüûñçý',
        'aaaaaaeeeeiiiioooouuuuncy'),
      '[^a-z0-9\s]', '', 'g'),
    '\s+', ' ', 'g'))) AS cn
  FROM merchants
),
actual_counts AS (
  SELECT merchant_id, COUNT(*) AS cnt
  FROM transactions
  WHERE merchant_id IS NOT NULL
  GROUP BY merchant_id
),
ranked AS (
  SELECT
    r.id,
    r.cn,
    ROW_NUMBER() OVER (
      PARTITION BY r.cn
      ORDER BY COALESCE(ac.cnt, 0) DESC, r.id ASC
    ) AS rn,
    FIRST_VALUE(r.id) OVER (
      PARTITION BY r.cn
      ORDER BY COALESCE(ac.cnt, 0) DESC, r.id ASC
    ) AS canonical_id
  FROM renorm r
  LEFT JOIN actual_counts ac ON ac.merchant_id = r.id
),
dups AS (
  SELECT id AS merchant_id, canonical_id
  FROM ranked
  WHERE rn > 1 AND canonical_id <> id
    AND cn IN (SELECT cn FROM ranked GROUP BY cn HAVING COUNT(*) > 1)
)
UPDATE transactions t
SET merchant_id = d.canonical_id
FROM dups d
WHERE t.merchant_id = d.merchant_id;

-- ============================================================
-- STEP 2: Reassign manual_transactions → canonical merchant
-- ============================================================
WITH renorm AS (
  SELECT id,
    lower(trim(regexp_replace(regexp_replace(
      translate(lower(name),'áàäâãåéèëêíìïîóòöôúùüûñçý','aaaaaaeeeeiiiioooouuuuncy'),
      '[^a-z0-9\s]','','g'),'\s+',' ','g'))) AS cn
  FROM merchants
),
actual_counts AS (
  SELECT merchant_id, COUNT(*) AS cnt FROM transactions WHERE merchant_id IS NOT NULL GROUP BY merchant_id
),
ranked AS (
  SELECT r.id, r.cn,
    ROW_NUMBER() OVER (PARTITION BY r.cn ORDER BY COALESCE(ac.cnt,0) DESC, r.id ASC) AS rn,
    FIRST_VALUE(r.id) OVER (PARTITION BY r.cn ORDER BY COALESCE(ac.cnt,0) DESC, r.id ASC) AS canonical_id
  FROM renorm r LEFT JOIN actual_counts ac ON ac.merchant_id = r.id
),
dups AS (
  SELECT id AS merchant_id, canonical_id FROM ranked
  WHERE rn > 1 AND canonical_id <> id
    AND cn IN (SELECT cn FROM ranked GROUP BY cn HAVING COUNT(*) > 1)
)
UPDATE manual_transactions mt
SET merchant_id = d.canonical_id
FROM dups d
WHERE mt.merchant_id = d.merchant_id;

-- ============================================================
-- STEP 3: Preserve earliest first_seen_at and best category_id
--         on each canonical before deleting duplicates
-- ============================================================
WITH renorm AS (
  SELECT id, first_seen_at, category_id,
    lower(trim(regexp_replace(regexp_replace(
      translate(lower(name),'áàäâãåéèëêíìïîóòöôúùüûñçý','aaaaaaeeeeiiiioooouuuuncy'),
      '[^a-z0-9\s]','','g'),'\s+',' ','g'))) AS cn
  FROM merchants
),
actual_counts AS (
  SELECT merchant_id, COUNT(*) AS cnt FROM transactions WHERE merchant_id IS NOT NULL GROUP BY merchant_id
),
ranked AS (
  SELECT r.id, r.cn, r.first_seen_at, r.category_id,
    ROW_NUMBER() OVER (PARTITION BY r.cn ORDER BY COALESCE(ac.cnt,0) DESC, r.id ASC) AS rn,
    FIRST_VALUE(r.id) OVER (PARTITION BY r.cn ORDER BY COALESCE(ac.cnt,0) DESC, r.id ASC) AS canonical_id
  FROM renorm r LEFT JOIN actual_counts ac ON ac.merchant_id = r.id
),
dup_groups AS (
  SELECT cn FROM ranked GROUP BY cn HAVING COUNT(*) > 1
),
group_meta AS (
  SELECT canonical_id,
    MIN(first_seen_at) AS earliest_seen,
    (array_agg(category_id ORDER BY rn ASC) FILTER (WHERE category_id IS NOT NULL))[1] AS best_cat
  FROM ranked
  WHERE cn IN (SELECT cn FROM dup_groups)
  GROUP BY canonical_id
)
UPDATE merchants m
SET
  first_seen_at = gm.earliest_seen,
  category_id   = COALESCE(m.category_id, gm.best_cat),
  updated_at    = NOW()
FROM group_meta gm
WHERE m.id = gm.canonical_id;

-- ============================================================
-- STEP 4: Delete all duplicate (non-canonical) merchants
-- ============================================================
WITH renorm AS (
  SELECT id,
    lower(trim(regexp_replace(regexp_replace(
      translate(lower(name),'áàäâãåéèëêíìïîóòöôúùüûñçý','aaaaaaeeeeiiiioooouuuuncy'),
      '[^a-z0-9\s]','','g'),'\s+',' ','g'))) AS cn
  FROM merchants
),
actual_counts AS (
  SELECT merchant_id, COUNT(*) AS cnt FROM transactions WHERE merchant_id IS NOT NULL GROUP BY merchant_id
),
ranked AS (
  SELECT r.id,
    ROW_NUMBER() OVER (PARTITION BY r.cn ORDER BY COALESCE(ac.cnt,0) DESC, r.id ASC) AS rn,
    r.cn
  FROM renorm r LEFT JOIN actual_counts ac ON ac.merchant_id = r.id
)
DELETE FROM merchants
WHERE id IN (
  SELECT id FROM ranked
  WHERE rn > 1
    AND cn IN (SELECT cn FROM ranked GROUP BY cn HAVING COUNT(*) > 1)
);

-- ============================================================
-- STEP 5: Recalculate ALL merchant stats from actual transactions
-- (fixes any corrupted transaction_count / total_amount values)
-- ============================================================
UPDATE merchants m
SET
  transaction_count = COALESCE(tc.cnt, 0),
  total_amount      = COALESCE(tc.total, 0.00),
  updated_at        = NOW()
FROM (
  SELECT merchant_id, COUNT(*) AS cnt, SUM(amount) AS total
  FROM transactions
  WHERE merchant_id IS NOT NULL
  GROUP BY merchant_id
) tc
WHERE m.id = tc.merchant_id;

-- Zero out merchants that have no transactions at all
UPDATE merchants
SET transaction_count = 0, total_amount = 0.00, updated_at = NOW()
WHERE id NOT IN (
  SELECT DISTINCT merchant_id FROM transactions WHERE merchant_id IS NOT NULL
)
AND (transaction_count != 0 OR total_amount != 0.00);

-- ============================================================
-- STEP 6: Fix normalized_name on ALL surviving merchants
-- ============================================================
UPDATE merchants
SET
  normalized_name = lower(trim(regexp_replace(regexp_replace(
    translate(lower(name),'áàäâãåéèëêíìïîóòöôúùüûñçý','aaaaaaeeeeiiiioooouuuuncy'),
    '[^a-z0-9\s]','','g'),'\s+',' ','g'))),
  updated_at = NOW()
WHERE normalized_name != lower(trim(regexp_replace(regexp_replace(
  translate(lower(name),'áàäâãåéèëêíìïîóòöôúùüûñçý','aaaaaaeeeeiiiioooouuuuncy'),
  '[^a-z0-9\s]','','g'),'\s+',' ','g')));

-- ============================================================
-- STEP 7: Summary
-- ============================================================
SELECT
  COUNT(*)                                          AS total_merchants_remaining,
  SUM(transaction_count)                            AS total_transactions_linked,
  COUNT(*) FILTER (WHERE transaction_count = 0)     AS merchants_with_no_txns,
  COUNT(*) FILTER (WHERE transaction_count > 0)     AS merchants_with_txns
FROM merchants;

COMMIT;
