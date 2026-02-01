-- Migration: Monthly Control Feature
-- Adds tables for monthly income tracking, manual transactions, and payment reminders

-- Ensure update_updated_at_column function exists (in case schema.sql wasn't run)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Monthly Incomes Table
-- Stores income sources for each month (salary, bonuses, side income, etc.)
CREATE TABLE monthly_incomes (
    id BIGSERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    source VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, month, source)
);

CREATE INDEX idx_monthly_incomes_period ON monthly_incomes(year, month);
CREATE INDEX idx_monthly_incomes_source ON monthly_incomes(source);

COMMENT ON TABLE monthly_incomes IS 'Monthly income sources (salary, bonuses, etc.) for budget tracking';
COMMENT ON COLUMN monthly_incomes.source IS 'Income source name (e.g., "CGI Salary", "Aliado 10", "Eve 30")';

-- Manual Transactions Table
-- Allows users to add transactions not detected from emails
CREATE TABLE manual_transactions (
    id BIGSERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    day INTEGER CHECK (day >= 1 AND day <= 31),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    transaction_type VARCHAR(50), -- 'Inversión', 'Deuda', 'Ahorro', NULL for regular expenses
    payment_method VARCHAR(100), -- 'BG', 'TDC(BANISTMO)', 'TDC(BAC)', 'YAPPY', 'CASH', etc.
    is_paid BOOLEAN DEFAULT TRUE, -- TRUE = 'A' (realizado), FALSE = 'P' (pendiente)
    notes TEXT,
    merchant_id BIGINT REFERENCES merchants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_manual_txn_month ON manual_transactions(year, month);
CREATE INDEX idx_manual_txn_date ON manual_transactions(year, month, day);
CREATE INDEX idx_manual_txn_paid ON manual_transactions(is_paid);
CREATE INDEX idx_manual_txn_merchant ON manual_transactions(merchant_id);
CREATE INDEX idx_manual_txn_type ON manual_transactions(transaction_type);
CREATE INDEX idx_manual_txn_payment_method ON manual_transactions(payment_method);

COMMENT ON TABLE manual_transactions IS 'Manually entered transactions not detected from emails';
COMMENT ON COLUMN manual_transactions.transaction_type IS 'Transaction category: Inversión, Deuda, Ahorro, or NULL for regular expenses';
COMMENT ON COLUMN manual_transactions.payment_method IS 'Payment method: BG (bank), TDC(BANISTMO), TDC(BAC), YAPPY, CASH, etc.';
COMMENT ON COLUMN manual_transactions.is_paid IS 'Payment status: TRUE (A - completed), FALSE (P - pending)';

-- Push Notification Subscriptions
-- Stores browser push notification subscriptions for daily reminders
CREATE TABLE push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL, -- {p256dh: string, auth: string}
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_email ON push_subscriptions(user_email);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active);

COMMENT ON TABLE push_subscriptions IS 'Browser push notification subscriptions for daily payment reminders';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.keys IS 'Encryption keys for web push (p256dh and auth)';

-- User Notification Preferences
CREATE TABLE notification_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL UNIQUE,
    enable_daily_reminders BOOLEAN DEFAULT TRUE,
    reminder_time TIME DEFAULT '12:00:00', -- Default: noon
    timezone VARCHAR(50) DEFAULT 'America/Panama',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_prefs_email ON notification_preferences(user_email);

COMMENT ON TABLE notification_preferences IS 'User preferences for daily payment reminders';
COMMENT ON COLUMN notification_preferences.reminder_time IS 'Time of day to send daily reminders (default: 12:00 noon)';

-- Add fields to transactions table for monthly control integration
ALTER TABLE transactions
ADD COLUMN is_paid BOOLEAN DEFAULT TRUE,
ADD COLUMN display_day INTEGER,
ADD COLUMN manual_override BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN transactions.is_paid IS 'Payment status for monthly control view';
COMMENT ON COLUMN transactions.display_day IS 'Day of month for display (extracted from txn_date)';
COMMENT ON COLUMN transactions.manual_override IS 'TRUE if user manually modified this auto-detected transaction';

-- Update triggers for new tables
CREATE TRIGGER update_monthly_incomes_updated_at
    BEFORE UPDATE ON monthly_incomes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_transactions_updated_at
    BEFORE UPDATE ON manual_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically extract display_day from txn_date
CREATE OR REPLACE FUNCTION update_transaction_display_day()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.txn_date IS NOT NULL THEN
        NEW.display_day = EXTRACT(DAY FROM NEW.txn_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_transaction_display_day
    BEFORE INSERT OR UPDATE OF txn_date ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_display_day();
