# Database Schema

PostgreSQL database schema for AI Finance Agent via Firebase Data Connect.

## Tables

### emails
Stores Gmail message metadata and hashed body content.

- Idempotency via `gmail_message_id` unique constraint
- Body hash (SHA256) to detect duplicates without storing PII
- Provider detection for routing to appropriate parser

### merchants
Normalized merchant/vendor information with aggregated statistics.

- Auto-maintained stats (transaction_count, total_amount)
- Category classification for analytics

### transactions
Parsed financial transactions extracted from emails.

- Linked to source email for traceability
- Idempotency key prevents duplicate transactions
- Normalized to America/Panama timezone
- Denormalized merchant_name for query performance

## Enums

- `txn_type`: purchase, payment, refund, withdrawal, transfer, fee, other
- `channel_type`: card, bank_transfer, cash, mobile_payment, other

## Deployment

For Firebase Data Connect:

```bash
# Connect to your Firebase project
firebase use your-project-id

# Deploy schema
firebase deploy --only dataconnect
```

For local PostgreSQL testing:

```bash
psql -U your-user -d your-database -f schema.sql
```

## Migration Strategy

Schema changes should be made via Firebase Data Connect migrations or manual ALTER statements with careful consideration for:

- Adding columns with DEFAULT values to avoid locking
- Creating indexes CONCURRENTLY in production
- Backfilling data in batches
