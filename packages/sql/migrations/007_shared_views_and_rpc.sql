-- Shared views and RPC functions used by web, mobile widget, and GitHub Actions scripts.
-- All views use security_invoker = on so existing RLS policies on base tables apply.

-- ─── v_transactions ───────────────────────────────────────────────────────────
-- Flattens the transactions → merchants → categories → emails join chain.
-- Replaces the repeated TRANSACTION_SELECT constant across all clients.
CREATE OR REPLACE VIEW v_transactions WITH (security_invoker = on) AS
SELECT
  t.id,
  t.txn_type,
  t.channel,
  t.amount,
  t.currency,
  t.merchant_name,
  t.txn_date,
  t.txn_timestamp,
  t.provider,
  t.card_last4,
  t.description,
  t.merchant_id,
  m.name         AS merchant_normalized_name,
  m.category_id  AS merchant_category_id,
  c.id           AS category_id,
  c.name         AS category_name,
  c.icon         AS category_icon,
  c.color        AS category_color,
  e.sender_email AS email_sender,
  e.subject      AS email_subject,
  e.received_at  AS email_received_at
FROM transactions t
LEFT JOIN merchants  m ON t.merchant_id = m.id
LEFT JOIN categories c ON m.category_id = c.id
LEFT JOIN emails     e ON t.email_id    = e.id;

-- ─── v_merchant_stats ─────────────────────────────────────────────────────────
-- Merchants with their category info joined in — avoids repeating the join
-- in every merchant listing query.
CREATE OR REPLACE VIEW v_merchant_stats WITH (security_invoker = on) AS
SELECT
  m.id,
  m.name,
  m.normalized_name,
  m.category_id,
  m.transaction_count,
  m.total_amount,
  c.id    AS category_ref_id,
  c.name  AS category_ref_name,
  c.icon  AS category_ref_icon,
  c.color AS category_ref_color
FROM merchants  m
LEFT JOIN categories c ON m.category_id = c.id;

-- ─── v_pending_payments ───────────────────────────────────────────────────────
-- Unpaid manual_transactions from today onwards with a computed due_date.
-- Eliminates the day-by-day loop in send-notifications.ts.
CREATE OR REPLACE VIEW v_pending_payments WITH (security_invoker = on) AS
SELECT
  id,
  year,
  month,
  day,
  description,
  amount,
  transaction_type,
  payment_method,
  notes,
  make_date(year, month, day)                       AS due_date,
  (make_date(year, month, day) - CURRENT_DATE)::int AS days_ahead
FROM manual_transactions
WHERE is_paid = false
  AND make_date(year, month, day) >= CURRENT_DATE;

-- ─── get_pending_payments_next_days ───────────────────────────────────────────
-- Returns unpaid payments due within the next p_days days (inclusive of today).
-- Replaces the 4-iteration loop in send-notifications.ts with a single RPC call.
CREATE OR REPLACE FUNCTION get_pending_payments_next_days(p_days int DEFAULT 4)
RETURNS TABLE(
  id          bigint,
  description text,
  amount      numeric,
  due_date    date,
  days_ahead  int
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT
    id,
    description,
    amount,
    make_date(year, month, day)                       AS due_date,
    (make_date(year, month, day) - CURRENT_DATE)::int AS days_ahead
  FROM manual_transactions
  WHERE is_paid = false
    AND make_date(year, month, day)
          BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days
  ORDER BY make_date(year, month, day);
$$;
