ALTER TABLE merchants
  ALTER COLUMN first_seen_at SET DEFAULT NOW(),
  ALTER COLUMN transaction_count SET DEFAULT 0;
