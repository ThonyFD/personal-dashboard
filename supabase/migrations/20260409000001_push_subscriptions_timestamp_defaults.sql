-- Add DEFAULT NOW() to push_subscriptions timestamps so inserts
-- that omit these fields don't fail with NOT NULL violations.
ALTER TABLE push_subscriptions
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();
