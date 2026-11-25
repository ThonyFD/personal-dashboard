-- ============================================================
-- MIGRATION 006: Prevent Duplicate Merchants
-- ============================================================
-- Adds the missing unique constraint and a get_or_create_merchant
-- function that does a single atomic INSERT ... ON CONFLICT upsert,
-- eliminating the race condition in the TypeScript check-then-insert.
-- Run AFTER migration 005 (all duplicates must be resolved first).
-- ============================================================

-- Step 1: Add unique constraint (was in schema.sql but not applied to live DB)
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_normalized_name
  ON merchants(normalized_name);

-- Step 2: Atomic get-or-create via INSERT ... ON CONFLICT
-- Returns the merchant id whether the row was inserted or already existed.
-- Only updates updated_at on conflict — never overwrites name or other fields.
CREATE OR REPLACE FUNCTION get_or_create_merchant(
  p_name           VARCHAR,
  p_normalized_name VARCHAR,
  p_category_id    BIGINT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO merchants (
    name, normalized_name, category_id,
    first_seen_at, transaction_count, total_amount,
    created_at, updated_at
  )
  VALUES (
    p_name, p_normalized_name, p_category_id,
    NOW(), 0, 0,
    NOW(), NOW()
  )
  ON CONFLICT (normalized_name)
    DO UPDATE SET updated_at = NOW()   -- touch only updated_at, preserve all other fields
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
