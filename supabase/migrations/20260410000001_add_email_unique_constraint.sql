-- Add UNIQUE constraint on emails.gmail_message_id
-- Root cause fix: without this, backfill scripts could store the same
-- Gmail message multiple times, each generating a different email_id.
-- That caused cascading duplicates in transactions (different idempotency_key
-- per duplicate email_id, bypassing the transactions UNIQUE constraint).
--
-- Cleanup of existing duplicates was applied manually on 2026-04-10:
--   - 8911 duplicate email rows deleted
--   - 5755 duplicate transaction rows deleted

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'emails_gmail_message_id_unique'
  ) THEN
    ALTER TABLE emails
      ADD CONSTRAINT emails_gmail_message_id_unique
      UNIQUE (gmail_message_id);
  END IF;
END $$;
