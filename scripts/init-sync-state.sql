-- Initialize gmail_sync_state table with default values
INSERT INTO gmail_sync_state (id, last_history_id, last_synced_at, created_at, updated_at)
VALUES (1, 0, NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify the insert
SELECT * FROM gmail_sync_state WHERE id = 1;
