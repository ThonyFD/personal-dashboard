-- Manual transfers: bank-app transfers to third parties send no email, so the
-- Gmail sync never sees them. The owner types them in (web Transactions page,
-- Android Inicio) and they are stored in transactions like any other row, so
-- budget_status(), the category totals and the lists count them with no change.
--
-- Such a row has no email: email_id becomes nullable, and the CHECK keeps that
-- to provider 'manual' so an ingested row can never lose its email.
-- The budget alert rules skip provider 'manual' (packages/supabase-queries).
-- RLS needs nothing new: the "Owner only" policy on transactions covers INSERT
-- and DELETE. Runs as one transaction.

BEGIN;

ALTER TABLE public.transactions ALTER COLUMN email_id DROP NOT NULL;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_email_or_manual;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_email_or_manual
  CHECK (email_id IS NOT NULL OR provider = 'manual');

COMMENT ON COLUMN public.transactions.email_id IS
  'Email the transaction was parsed from. NULL only for manual entries (provider ''manual'').';

-- Gap check: the column must accept NULL and the CHECK must be in place.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions'
      AND column_name = 'email_id' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'transactions.email_id is still NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.transactions'::regclass
      AND conname = 'transactions_email_or_manual'
  ) THEN
    RAISE EXCEPTION 'transactions_email_or_manual is missing';
  END IF;
END $$;

COMMIT;
