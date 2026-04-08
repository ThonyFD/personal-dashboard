-- ============================================================
-- Post-Restore Script for Supabase Migration
-- Run this AFTER restoring the backup to Supabase
--
-- Steps:
--   1. Restore backup:  psql "postgresql://postgres:[PASSWORD]@db.mnkbvyjljudiyrustpvb.supabase.co:5432/postgres" < backups/backup-fdcdb_dc-20260228.sql
--   2. Run this script: psql "postgresql://postgres:[PASSWORD]@db.mnkbvyjljudiyrustpvb.supabase.co:5432/postgres" < packages/sql/post-restore-supabase.sql
-- ============================================================

-- ============================================================
-- 1. CREATE SEQUENCES FOR AUTO-INCREMENT IDs
-- (The backup used Firebase-generated integer IDs, no sequences)
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS categories_id_seq;
CREATE SEQUENCE IF NOT EXISTS emails_id_seq;
CREATE SEQUENCE IF NOT EXISTS merchants_id_seq;
CREATE SEQUENCE IF NOT EXISTS transactions_id_seq;
CREATE SEQUENCE IF NOT EXISTS gmail_sync_state_id_seq;
CREATE SEQUENCE IF NOT EXISTS monthly_incomes_id_seq;
CREATE SEQUENCE IF NOT EXISTS manual_transactions_id_seq;
CREATE SEQUENCE IF NOT EXISTS push_subscriptions_id_seq;
CREATE SEQUENCE IF NOT EXISTS notification_preferences_id_seq;

-- Set sequences to MAX(id) + 1 so new inserts don't conflict
SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 0) + 1, false);
SELECT setval('emails_id_seq', COALESCE((SELECT MAX(id) FROM emails), 0) + 1, false);
SELECT setval('merchants_id_seq', COALESCE((SELECT MAX(id) FROM merchants), 0) + 1, false);
SELECT setval('transactions_id_seq', COALESCE((SELECT MAX(id) FROM transactions), 0) + 1, false);
SELECT setval('gmail_sync_state_id_seq', COALESCE((SELECT MAX(id) FROM gmail_sync_state), 0) + 1, false);
SELECT setval('monthly_incomes_id_seq', COALESCE((SELECT MAX(id) FROM monthly_incomes), 0) + 1, false);
SELECT setval('manual_transactions_id_seq', COALESCE((SELECT MAX(id) FROM manual_transactions), 0) + 1, false);
SELECT setval('push_subscriptions_id_seq', COALESCE((SELECT MAX(id) FROM push_subscriptions), 0) + 1, false);
SELECT setval('notification_preferences_id_seq', COALESCE((SELECT MAX(id) FROM notification_preferences), 0) + 1, false);

-- Set DEFAULT for id columns to use sequences
ALTER TABLE categories ALTER COLUMN id SET DEFAULT nextval('categories_id_seq');
ALTER TABLE emails ALTER COLUMN id SET DEFAULT nextval('emails_id_seq');
ALTER TABLE merchants ALTER COLUMN id SET DEFAULT nextval('merchants_id_seq');
ALTER TABLE transactions ALTER COLUMN id SET DEFAULT nextval('transactions_id_seq');
ALTER TABLE gmail_sync_state ALTER COLUMN id SET DEFAULT nextval('gmail_sync_state_id_seq');
ALTER TABLE monthly_incomes ALTER COLUMN id SET DEFAULT nextval('monthly_incomes_id_seq');
ALTER TABLE manual_transactions ALTER COLUMN id SET DEFAULT nextval('manual_transactions_id_seq');
ALTER TABLE push_subscriptions ALTER COLUMN id SET DEFAULT nextval('push_subscriptions_id_seq');
ALTER TABLE notification_preferences ALTER COLUMN id SET DEFAULT nextval('notification_preferences_id_seq');

-- ============================================================
-- 2. TRIGGER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_merchant_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE merchants
        SET transaction_count = transaction_count + 1,
            total_amount = total_amount + NEW.amount
        WHERE id = NEW.merchant_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.merchant_id IS DISTINCT FROM OLD.merchant_id THEN
        IF OLD.merchant_id IS NOT NULL THEN
            UPDATE merchants
            SET transaction_count = transaction_count - 1,
                total_amount = total_amount - OLD.amount
            WHERE id = OLD.merchant_id;
        END IF;
        IF NEW.merchant_id IS NOT NULL THEN
            UPDATE merchants
            SET transaction_count = transaction_count + 1,
                total_amount = total_amount + NEW.amount
            WHERE id = NEW.merchant_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.merchant_id IS NOT NULL THEN
            UPDATE merchants
            SET transaction_count = transaction_count - 1,
                total_amount = total_amount - OLD.amount
            WHERE id = OLD.merchant_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_transaction_display_day()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.txn_date IS NOT NULL THEN
        NEW.display_day = EXTRACT(DAY FROM NEW.txn_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. TRIGGERS (drop first if they exist from backup)
-- ============================================================

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS update_emails_updated_at ON emails;
DROP TRIGGER IF EXISTS update_merchants_updated_at ON merchants;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_gmail_sync_state_updated_at ON gmail_sync_state;
DROP TRIGGER IF EXISTS update_monthly_incomes_updated_at ON monthly_incomes;
DROP TRIGGER IF EXISTS update_manual_transactions_updated_at ON manual_transactions;
DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
DROP TRIGGER IF EXISTS update_merchant_stats_trigger ON transactions;
DROP TRIGGER IF EXISTS set_transaction_display_day ON transactions;

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at
    BEFORE UPDATE ON emails FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at
    BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_sync_state_updated_at
    BEFORE UPDATE ON gmail_sync_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_incomes_updated_at
    BEFORE UPDATE ON monthly_incomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_transactions_updated_at
    BEFORE UPDATE ON manual_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchant_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_merchant_stats();

CREATE TRIGGER set_transaction_display_day
    BEFORE INSERT OR UPDATE OF txn_date ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_transaction_display_day();

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- Single-user personal dashboard — allow all ops for authenticated users.
-- Backend services use service_role key which bypasses RLS entirely.
-- ============================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (anon key + logged-in user)
CREATE POLICY "Allow all for authenticated" ON categories    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON emails        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON merchants     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON transactions  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON gmail_sync_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON monthly_incomes  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON manual_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON notification_preferences FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. ENSURE gmail_sync_state HAS INITIAL ROW
-- ============================================================
INSERT INTO gmail_sync_state (id, last_history_id, last_synced_at, created_at, updated_at)
SELECT 1, 0, NOW(), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM gmail_sync_state WHERE id = 1);
