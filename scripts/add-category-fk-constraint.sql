-- Migration: Add foreign key constraint to merchants.category_id
-- This ensures data integrity and prevents invalid category references

-- Step 1: Add foreign key constraint on category_id
ALTER TABLE merchants
ADD CONSTRAINT fk_merchants_category
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE SET NULL;  -- If a category is deleted, set merchant.category_id to NULL

-- Step 2: Create index on category_id for better query performance
CREATE INDEX IF NOT EXISTS idx_merchants_category_id ON merchants(category_id);

-- Step 3: Drop the old category string column (after verifying migration is complete)
-- IMPORTANT: Only run this after confirming all merchants have category_id populated
-- ALTER TABLE merchants DROP COLUMN category;

-- Verify the constraint
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'merchants';
