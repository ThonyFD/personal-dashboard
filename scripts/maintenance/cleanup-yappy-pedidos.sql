-- Cleanup: remove Yappy payment *requests* mis-recorded as income.
--
-- Background: emails with subject "¡Te pidieron un Yappy!" are payment
-- REQUESTS (someone asking you for money), not confirmed transactions. The
-- old parser had no send/receive match for them and fell through to the
-- default `income` type, so each one was inserted as a fake income row.
--
-- The parser now ignores these emails going forward (see
-- services/ingestor/src/parsers/yappy.ts -> shouldIgnore). This script removes
-- the historical rows that were already inserted.
--
-- Identification is done by joining to the source email subject (the most
-- precise signal). The extra `txn_type = 'income'` guard guarantees we never
-- touch a legitimate "Recibiste un Yappy" credit, whose subject is different.

-- ── 1. PREVIEW: inspect exactly what will be deleted ────────────────────────
SELECT
  t.id,
  t.amount,
  t.txn_type,
  t.provider,
  t.txn_date,
  t.merchant_name,
  e.subject
FROM transactions t
JOIN emails e ON e.id = t.email_id
WHERE e.subject ILIKE '%pidieron un Yappy%'
  AND t.txn_type = 'income'
ORDER BY t.txn_date DESC;

-- ── 2. DELETE: run after reviewing the preview above ───────────────────────
-- Wrapped in a transaction so you can confirm the row count before committing.
BEGIN;

DELETE FROM transactions t
USING emails e
WHERE e.id = t.email_id
  AND e.subject ILIKE '%pidieron un Yappy%'
  AND t.txn_type = 'income';

-- Check the reported DELETE count, then run:
--   COMMIT;
-- or, to abort:
--   ROLLBACK;
