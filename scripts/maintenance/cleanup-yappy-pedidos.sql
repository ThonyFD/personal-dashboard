-- Cleanup: fix Yappy transactions mis-recorded by the old parser.
--
-- Root cause: the old parser did `type = isSend ? 'transfer' : 'income'`, so
-- ANY Yappy email it didn't recognize as a send fell through to `income`. It
-- also did not recognize the "Pagaste por Yappy" outgoing format, and it
-- recorded non-transaction notifications (payment requests, login alerts,
-- account-linking) as transactions.
--
-- The parser now classifies by email SUBJECT (the only reliable signal, since
-- Yappy emails are HTML-only and the pipeline passes just the Gmail snippet):
--   "Enviaste un Yappy" / "Pagaste por Yappy"  -> TRANSFER (outgoing)
--   "Recibiste un Yappy" / "Te enviaron por Yappy" -> INCOME (incoming)
--   "Te pidieron un Yappy" / login / account-link  -> IGNORED (not a txn)
--
-- This script fixes the rows that were already inserted. txn_type is stored
-- uppercase (the ingestor does .toUpperCase() on insert).
--
-- All identification joins to the source email subject (the precise signal).
-- Counts at time of writing: 56 requests, 54 Pagaste-as-INCOME, 5 Pagaste-as-
-- PAYMENT, 1 login, 1 account-link.

-- ── 1. PREVIEW: what each step will touch ───────────────────────────────────
-- 1a. Non-transaction notifications that will be DELETED:
SELECT 'DELETE' AS op, t.txn_type, t.amount, t.txn_date, e.subject
FROM transactions t
JOIN emails e ON e.id = t.email_id
WHERE t.provider = 'yappy'
  AND (
        e.subject ILIKE '%pidieron un Yappy%'   -- payment request
     OR e.subject ILIKE '%Inicio de sesi%'      -- login alert
     OR e.subject ILIKE '%Agregaste tu cuenta%' -- account linking
  )
ORDER BY t.txn_date DESC;

-- 1b. Outgoing "Pagaste por Yappy" wrongly typed as INCOME/PAYMENT (-> TRANSFER):
SELECT 'UPDATE->TRANSFER' AS op, t.txn_type, t.amount, t.txn_date, e.subject
FROM transactions t
JOIN emails e ON e.id = t.email_id
WHERE t.provider = 'yappy'
  AND e.subject ILIKE '%Pagaste por Yappy%'
  AND t.txn_type <> 'TRANSFER'
ORDER BY t.txn_date DESC;

-- ── 2. APPLY: run after reviewing the preview above ─────────────────────────
-- Wrapped in a transaction so you can confirm the row counts before committing.
BEGIN;

-- 2a. Delete non-transaction Yappy notifications.
DELETE FROM transactions t
USING emails e
WHERE e.id = t.email_id
  AND t.provider = 'yappy'
  AND (
        e.subject ILIKE '%pidieron un Yappy%'
     OR e.subject ILIKE '%Inicio de sesi%'
     OR e.subject ILIKE '%Agregaste tu cuenta%'
  );

-- 2b. Reclassify outgoing "Pagaste por Yappy" payments as TRANSFER (debit).
UPDATE transactions t
SET txn_type = 'TRANSFER',
    description = 'Yappy Send (Debit)',
    updated_at = now()
FROM emails e
WHERE e.id = t.email_id
  AND t.provider = 'yappy'
  AND e.subject ILIKE '%Pagaste por Yappy%'
  AND t.txn_type <> 'TRANSFER';

-- Review the reported counts (DELETE ~58, UPDATE ~59), then run:
--   COMMIT;
-- or, to abort:
--   ROLLBACK;
