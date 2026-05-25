-- ============================================================
-- MIGRATION 004: Fix Banistmo Duplicate Merchants
-- ============================================================
-- Problem: 95+ records share the same normalized_name because
-- the unique constraint wasn't enforced when records were created.
-- Stats are also corrupted (negative values) due to the trigger
-- firing on corrupted baseline counts.
--
-- Strategy:
-- 1. Group merchants by their CORRECT re-normalized name
-- 2. Canonical = record with most ACTUAL transactions (from transactions
--    table, ignoring the corrupted transaction_count field)
-- 3. Reassign transactions/manual_transactions to canonical
-- 4. Delete duplicates
-- 5. Recalculate stats from scratch from actual transactions
-- 6. Fix normalized_names
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Reassign transactions → canonical
-- Canonical = merchant with most actual rows in transactions table
-- ============================================================
WITH affected AS (
  SELECT id FROM merchants
  WHERE name ILIKE '%banistmo%'
     OR name ILIKE '%pago tarjeta%'
     OR name ILIKE '%pago de tarjeta%'
),
renorm AS (
  SELECT
    m.id,
    m.first_seen_at,
    m.category_id,
    lower(trim(regexp_replace(regexp_replace(
      translate(lower(m.name),
        'áàäâãåéèëêíìïîóòöôúùüûñçý',
        'aaaaaaeeeeiiiioooouuuuncy'),
      '[^a-z0-9\s]', '', 'g'), '\s+', ' ', 'g'))) AS correct_norm
  FROM merchants m
  WHERE m.id IN (SELECT id FROM affected)
),
actual_counts AS (
  SELECT merchant_id, COUNT(*) AS cnt
  FROM transactions
  WHERE merchant_id IN (SELECT id FROM affected)
  GROUP BY merchant_id
),
ranked AS (
  SELECT
    r.id,
    r.correct_norm,
    COALESCE(ac.cnt, 0) AS actual_cnt,
    ROW_NUMBER() OVER (
      PARTITION BY r.correct_norm
      ORDER BY COALESCE(ac.cnt, 0) DESC, r.id ASC
    ) AS rn,
    FIRST_VALUE(r.id) OVER (
      PARTITION BY r.correct_norm
      ORDER BY COALESCE(ac.cnt, 0) DESC, r.id ASC
    ) AS canonical_id
  FROM renorm r
  LEFT JOIN actual_counts ac ON ac.merchant_id = r.id
),
dups AS (
  SELECT id AS merchant_id, canonical_id FROM ranked
  WHERE rn > 1 AND canonical_id <> id
)
UPDATE transactions t
SET merchant_id = d.canonical_id
FROM dups d
WHERE t.merchant_id = d.merchant_id;

-- ============================================================
-- STEP 2: Reassign manual_transactions → canonical
-- ============================================================
WITH affected AS (
  SELECT id FROM merchants
  WHERE name ILIKE '%banistmo%'
     OR name ILIKE '%pago tarjeta%'
     OR name ILIKE '%pago de tarjeta%'
),
renorm AS (
  SELECT m.id,
    lower(trim(regexp_replace(regexp_replace(
      translate(lower(m.name),'áàäâãåéèëêíìïîóòöôúùüûñçý','aaaaaaeeeeiiiioooouuuuncy'),
      '[^a-z0-9\s]','','g'),'\s+',' ','g'))) AS correct_norm
  FROM merchants m WHERE m.id IN (SELECT id FROM affected)
),
actual_counts AS (
  SELECT merchant_id, COUNT(*) AS cnt FROM transactions
  WHERE merchant_id IN (SELECT id FROM affected) GROUP BY merchant_id
),
ranked AS (
  SELECT r.id, r.correct_norm,
    ROW_NUMBER() OVER (PARTITION BY r.correct_norm ORDER BY COALESCE(ac.cnt,0) DESC, r.id ASC) AS rn,
    FIRST_VALUE(r.id) OVER (PARTITION BY r.correct_norm ORDER BY COALESCE(ac.cnt,0) DESC, r.id ASC) AS canonical_id
  FROM renorm r LEFT JOIN actual_counts ac ON ac.merchant_id = r.id
),
dups AS (SELECT id AS merchant_id, canonical_id FROM ranked WHERE rn > 1 AND canonical_id <> id)
UPDATE manual_transactions mt
SET merchant_id = d.canonical_id
FROM dups d WHERE mt.merchant_id = d.merchant_id;

-- ============================================================
-- STEP 3: Update canonical metadata (first_seen_at, category_id)
-- ============================================================
WITH affected AS (
  SELECT id FROM merchants
  WHERE name ILIKE '%banistmo%'
     OR name ILIKE '%pago tarjeta%'
     OR name ILIKE '%pago de tarjeta%'
),
renorm AS (
  SELECT m.id, m.first_seen_at, m.category_id,
    lower(trim(regexp_replace(regexp_replace(
      translate(lower(m.name),'áàäâãåéèëêíìïîóòöôúùüûñçý','aaaaaaeeeeiiiioooouuuuncy'),
      '[^a-z0-9\s]','','g'),'\s+',' ','g'))) AS correct_norm
  FROM merchants m WHERE m.id IN (SELECT id FROM affected)
),
actual_counts AS (
  SELECT merchant_id, COUNT(*) AS cnt FROM transactions
  WHERE merchant_id IN (SELECT id FROM affected) GROUP BY merchant_id
),
ranked AS (
  SELECT r.id, r.correct_norm, r.first_seen_at, r.category_id,
    ROW_NUMBER() OVER (PARTITION BY r.correct_norm ORDER BY COALESCE(ac.cnt,0) DESC, r.id ASC) AS rn,
    FIRST_VALUE(r.id) OVER (PARTITION BY r.correct_norm ORDER BY COALESCE(ac.cnt,0) DESC, r.id ASC) AS canonical_id
  FROM renorm r LEFT JOIN actual_counts ac ON ac.merchant_id = r.id
),
group_meta AS (
  SELECT canonical_id,
    MIN(first_seen_at) AS earliest_seen,
    (array_agg(category_id ORDER BY rn ASC) FILTER (WHERE category_id IS NOT NULL))[1] AS best_cat
  FROM ranked GROUP BY canonical_id
)
UPDATE merchants m
SET first_seen_at = gm.earliest_seen,
    category_id   = COALESCE(m.category_id, gm.best_cat),
    updated_at    = NOW()
FROM group_meta gm WHERE m.id = gm.canonical_id;

-- ============================================================
-- STEP 4: Delete duplicate (non-canonical) merchants
-- ============================================================
WITH affected AS (
  SELECT id FROM merchants
  WHERE name ILIKE '%banistmo%'
     OR name ILIKE '%pago tarjeta%'
     OR name ILIKE '%pago de tarjeta%'
),
renorm AS (
  SELECT m.id,
    lower(trim(regexp_replace(regexp_replace(
      translate(lower(m.name),'áàäâãåéèëêíìïîóòöôúùüûñçý','aaaaaaeeeeiiiioooouuuuncy'),
      '[^a-z0-9\s]','','g'),'\s+',' ','g'))) AS correct_norm
  FROM merchants m WHERE m.id IN (SELECT id FROM affected)
),
actual_counts AS (
  SELECT merchant_id, COUNT(*) AS cnt FROM transactions
  WHERE merchant_id IN (SELECT id FROM affected) GROUP BY merchant_id
),
ranked AS (
  SELECT r.id,
    ROW_NUMBER() OVER (PARTITION BY r.correct_norm ORDER BY COALESCE(ac.cnt,0) DESC, r.id ASC) AS rn
  FROM renorm r LEFT JOIN actual_counts ac ON ac.merchant_id = r.id
)
DELETE FROM merchants WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ============================================================
-- STEP 5: Recalculate stats from actual transactions
-- (fixes negative/corrupted transaction_count and total_amount)
-- ============================================================
UPDATE merchants m
SET
  transaction_count = COALESCE(tc.cnt, 0),
  total_amount      = COALESCE(tc.total, 0.00),
  updated_at        = NOW()
FROM (
  SELECT merchant_id, COUNT(*) AS cnt, SUM(amount) AS total
  FROM transactions
  WHERE merchant_id IN (
    SELECT id FROM merchants
    WHERE name ILIKE '%banistmo%'
       OR name ILIKE '%pago tarjeta%'
       OR name ILIKE '%pago de tarjeta%'
  )
  GROUP BY merchant_id
) tc
WHERE m.id = tc.merchant_id;

-- Zero out any surviving merchant with no actual transactions
UPDATE merchants m
SET transaction_count = 0, total_amount = 0.00, updated_at = NOW()
WHERE (name ILIKE '%banistmo%' OR name ILIKE '%pago tarjeta%' OR name ILIKE '%pago de tarjeta%')
  AND id NOT IN (SELECT DISTINCT merchant_id FROM transactions WHERE merchant_id IS NOT NULL);

-- ============================================================
-- STEP 6: Fix normalized_names on surviving merchants
-- ============================================================
UPDATE merchants
SET
  normalized_name = lower(trim(regexp_replace(regexp_replace(
    translate(lower(name),'áàäâãåéèëêíìïîóòöôúùüûñçý','aaaaaaeeeeiiiioooouuuuncy'),
    '[^a-z0-9\s]','','g'),'\s+',' ','g'))),
  updated_at = NOW()
WHERE name ILIKE '%banistmo%'
   OR name ILIKE '%pago tarjeta%'
   OR name ILIKE '%pago de tarjeta%';

-- ============================================================
-- STEP 7: Summary
-- ============================================================
SELECT name, normalized_name, transaction_count, total_amount, first_seen_at
FROM merchants
WHERE name ILIKE '%banistmo%'
   OR name ILIKE '%pago tarjeta%'
   OR name ILIKE '%pago de tarjeta%'
ORDER BY name;

COMMIT;
