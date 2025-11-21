-- AI Finance Agent Database Schema
-- Target: Firebase Data Connect (PostgreSQL)
-- Time zone: America/Panama

-- Create enums
CREATE TYPE txn_type AS ENUM ('purchase', 'payment', 'refund', 'withdrawal', 'transfer', 'fee', 'other');
CREATE TYPE channel_type AS ENUM ('card', 'bank_transfer', 'cash', 'mobile_payment', 'other');

-- Emails table: stores raw email metadata and hash
CREATE TABLE emails (
    id BIGSERIAL PRIMARY KEY,
    gmail_message_id VARCHAR(255) NOT NULL UNIQUE,
    gmail_history_id BIGINT,
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    subject TEXT,
    received_at TIMESTAMPTZ NOT NULL,
    body_hash VARCHAR(64) NOT NULL, -- SHA256 hash of email body
    labels TEXT[], -- Gmail labels as array
    provider VARCHAR(50), -- Detected provider: 'bac', 'clave', 'yappy', etc.
    parsed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for emails
CREATE INDEX idx_emails_gmail_message_id ON emails(gmail_message_id);
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_emails_provider ON emails(provider);
CREATE INDEX idx_emails_parsed ON emails(parsed);
CREATE INDEX idx_emails_body_hash ON emails(body_hash);

-- Merchants table: normalized merchant/vendor information
CREATE TABLE merchants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL, -- Lowercase, no special chars
    category VARCHAR(100), -- e.g., 'restaurant', 'grocery', 'transport'
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    transaction_count INTEGER DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for merchants
CREATE UNIQUE INDEX idx_merchants_normalized_name ON merchants(normalized_name);
CREATE INDEX idx_merchants_category ON merchants(category);

-- Transactions table: parsed financial transactions
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    email_id BIGINT NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    merchant_id BIGINT REFERENCES merchants(id) ON DELETE SET NULL,

    -- Transaction details
    txn_type txn_type NOT NULL,
    channel channel_type NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Merchant/vendor info (denormalized for query performance)
    merchant_name VARCHAR(255),
    merchant_raw VARCHAR(255), -- Raw extracted merchant name

    -- Temporal info (normalized to America/Panama)
    txn_date DATE NOT NULL,
    txn_timestamp TIMESTAMPTZ,

    -- Card/account info (last 4 digits only)
    card_last4 VARCHAR(4),
    account_last4 VARCHAR(4),

    -- Provider-specific
    provider VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),

    -- Metadata
    description TEXT,
    notes TEXT,

    -- Idempotency
    idempotency_key VARCHAR(64) NOT NULL UNIQUE, -- SHA256(email_id + txn_date + amount + merchant)

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX idx_transactions_email_id ON transactions(email_id);
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_txn_date ON transactions(txn_date DESC);
CREATE INDEX idx_transactions_txn_type ON transactions(txn_type);
CREATE INDEX idx_transactions_channel ON transactions(channel);
CREATE INDEX idx_transactions_provider ON transactions(provider);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_idempotency_key ON transactions(idempotency_key);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_transactions_date_type ON transactions(txn_date DESC, txn_type);
CREATE INDEX idx_transactions_merchant_date ON transactions(merchant_id, txn_date DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_emails_updated_at
    BEFORE UPDATE ON emails
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at
    BEFORE UPDATE ON merchants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update merchant stats
CREATE OR REPLACE FUNCTION update_merchant_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE merchants
        SET
            transaction_count = transaction_count + 1,
            total_amount = total_amount + NEW.amount
        WHERE id = NEW.merchant_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.merchant_id != OLD.merchant_id THEN
        -- Decrement old merchant
        UPDATE merchants
        SET
            transaction_count = transaction_count - 1,
            total_amount = total_amount - OLD.amount
        WHERE id = OLD.merchant_id;

        -- Increment new merchant
        UPDATE merchants
        SET
            transaction_count = transaction_count + 1,
            total_amount = total_amount + NEW.amount
        WHERE id = NEW.merchant_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE merchants
        SET
            transaction_count = transaction_count - 1,
            total_amount = total_amount - OLD.amount
        WHERE id = OLD.merchant_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update merchant stats
CREATE TRIGGER update_merchant_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_stats();

-- Comments for documentation
COMMENT ON TABLE emails IS 'Stores Gmail message metadata and hashed body for idempotency';
COMMENT ON TABLE merchants IS 'Normalized merchant/vendor information with aggregated stats';
COMMENT ON TABLE transactions IS 'Parsed financial transactions extracted from emails';
COMMENT ON COLUMN emails.body_hash IS 'SHA256 hash of email body to detect duplicates without storing PII';
COMMENT ON COLUMN transactions.idempotency_key IS 'SHA256 hash ensuring no duplicate transactions from same email';
