-- ============================================================
-- MIGRATION 003: Fix Yappy Duplicate Merchants
-- ============================================================

BEGIN;

-- STEP 1: Reassign transactions → canonical merchant
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY (regexp_match(name,'\((\d{8})\)'))[1]
      ORDER BY transaction_count DESC, first_seen_at ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY (regexp_match(name,'\((\d{8})\)'))[1]
      ORDER BY transaction_count DESC, first_seen_at ASC
    ) AS canonical_id
  FROM merchants WHERE name ~ '\(\d{8}\)'
),
dups AS (
  SELECT id AS merchant_id, canonical_id FROM ranked WHERE rn > 1 AND canonical_id <> id
)
UPDATE transactions t
SET merchant_id = d.canonical_id
FROM dups d WHERE t.merchant_id = d.merchant_id;

-- STEP 2: Reassign manual_transactions → canonical merchant
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY (regexp_match(name,'\((\d{8})\)'))[1]
      ORDER BY transaction_count DESC, first_seen_at ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY (regexp_match(name,'\((\d{8})\)'))[1]
      ORDER BY transaction_count DESC, first_seen_at ASC
    ) AS canonical_id
  FROM merchants WHERE name ~ '\(\d{8}\)'
),
dups AS (
  SELECT id AS merchant_id, canonical_id FROM ranked WHERE rn > 1 AND canonical_id <> id
)
UPDATE manual_transactions mt
SET merchant_id = d.canonical_id
FROM dups d WHERE mt.merchant_id = d.merchant_id;

-- STEP 3: Update canonical → earliest first_seen_at + preserve category_id
WITH ranked AS (
  SELECT id, first_seen_at, category_id,
    ROW_NUMBER() OVER (
      PARTITION BY (regexp_match(name,'\((\d{8})\)'))[1]
      ORDER BY transaction_count DESC, first_seen_at ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY (regexp_match(name,'\((\d{8})\)'))[1]
      ORDER BY transaction_count DESC, first_seen_at ASC
    ) AS canonical_id
  FROM merchants WHERE name ~ '\(\d{8}\)'
),
group_meta AS (
  SELECT canonical_id,
    MIN(first_seen_at) AS earliest_seen,
    (array_agg(category_id ORDER BY rn ASC) FILTER (WHERE category_id IS NOT NULL))[1] AS best_category_id
  FROM ranked GROUP BY canonical_id
)
UPDATE merchants m
SET first_seen_at = gm.earliest_seen,
    category_id   = COALESCE(m.category_id, gm.best_category_id),
    updated_at    = NOW()
FROM group_meta gm WHERE m.id = gm.canonical_id;

-- STEP 4: Delete duplicate (non-canonical) merchants
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY (regexp_match(name,'\((\d{8})\)'))[1]
      ORDER BY transaction_count DESC, first_seen_at ASC
    ) AS rn
  FROM merchants WHERE name ~ '\(\d{8}\)'
)
DELETE FROM merchants WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- STEP 5: Fix normalized_name using translate() — no extension needed.
-- Maps accented Latin chars to their ASCII base (á→a, é→e, ñ→n, etc.)
-- then strips remaining special chars and collapses spaces.
UPDATE merchants
SET
  normalized_name = lower(trim(
    regexp_replace(
      regexp_replace(
        translate(
          lower(name),
          'áàäâãåéèëêíìïîóòöôúùüûñçý',
          'aaaaaaeeeeiiiioooouuuuncy'
        ),
        '[^a-z0-9\s]', '', 'g'
      ),
      '\s+', ' ', 'g'
    )
  )),
  updated_at = NOW()
WHERE name ~ '\(\d{8}\)';

-- STEP 6: Summary — one row per phone after dedup
SELECT
  (regexp_match(name,'\((\d{8})\)'))[1] AS phone,
  name                                   AS canonical_name,
  normalized_name,
  transaction_count,
  total_amount
FROM merchants
WHERE name ~ '\(\d{8}\)'
ORDER BY transaction_count DESC
LIMIT 20;

COMMIT;
