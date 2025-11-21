-- Migration: Update existing merchants to use category_id instead of category string
-- This maps the old string categories to the proper category IDs

-- First, ensure all categories exist in the categories table
-- (Run populate-categories.sql first if you haven't already)

-- Update merchants with category string to category_id
UPDATE merchants
SET category_id = 1
WHERE category = 'Food & Dining' AND category_id IS NULL;

UPDATE merchants
SET category_id = 2
WHERE category = 'Groceries' AND category_id IS NULL;

UPDATE merchants
SET category_id = 3
WHERE category = 'Transportation' AND category_id IS NULL;

UPDATE merchants
SET category_id = 4
WHERE category = 'Entertainment' AND category_id IS NULL;

UPDATE merchants
SET category_id = 5
WHERE category = 'Shopping' AND category_id IS NULL;

UPDATE merchants
SET category_id = 6
WHERE category = 'Bills & Utilities' AND category_id IS NULL;

UPDATE merchants
SET category_id = 7
WHERE category = 'Healthcare' AND category_id IS NULL;

UPDATE merchants
SET category_id = 8
WHERE category = 'Travel' AND category_id IS NULL;

UPDATE merchants
SET category_id = 9
WHERE category = 'Education' AND category_id IS NULL;

UPDATE merchants
SET category_id = 10
WHERE category = 'Services' AND category_id IS NULL;

UPDATE merchants
SET category_id = 11
WHERE category = 'Subscriptions' AND category_id IS NULL;

UPDATE merchants
SET category_id = 12
WHERE category = 'Transfers' AND category_id IS NULL;

UPDATE merchants
SET category_id = 13
WHERE category = 'Investment' AND category_id IS NULL;

UPDATE merchants
SET category_id = 14
WHERE category = 'Pago Mensual' AND category_id IS NULL;

UPDATE merchants
SET category_id = 15
WHERE category = 'Other' AND category_id IS NULL;

-- Special case: "Gas" should map to Transportation (ID: 3)
UPDATE merchants
SET category_id = 3
WHERE category = 'Gas' AND category_id IS NULL;

-- Set any remaining NULL category_id to 'Other' (ID: 15)
UPDATE merchants
SET category_id = 15
WHERE category_id IS NULL;

-- Verify the migration
SELECT
  category,
  category_id,
  COUNT(*) as count
FROM merchants
GROUP BY category, category_id
ORDER BY category_id, category;
