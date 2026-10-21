-- Add DEFAULT NOW() to created_at and updated_at on monthly_incomes
-- so inserts that omit these fields don't fail with NOT NULL violations.
ALTER TABLE monthly_incomes
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();
