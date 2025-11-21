-- Migration: Add Gmail sync state table to track historyId
-- This table stores the last processed historyId to enable incremental sync

CREATE TABLE gmail_sync_state (
    id SERIAL PRIMARY KEY,
    last_history_id BIGINT NOT NULL,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    watch_expiration TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT only_one_row CHECK (id = 1)
);

-- Insert initial row (will be updated by watch setup)
INSERT INTO gmail_sync_state (id, last_history_id, last_synced_at)
VALUES (1, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- Index for performance
CREATE INDEX idx_gmail_sync_state_last_synced_at ON gmail_sync_state(last_synced_at DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_gmail_sync_state_updated_at
    BEFORE UPDATE ON gmail_sync_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE gmail_sync_state IS 'Stores the last processed Gmail historyId for incremental sync';
COMMENT ON COLUMN gmail_sync_state.last_history_id IS 'Last historyId successfully processed from Gmail';
COMMENT ON COLUMN gmail_sync_state.watch_expiration IS 'When the current Gmail watch expires (7 days from setup)';
