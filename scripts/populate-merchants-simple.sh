#!/bin/bash

# Script to populate merchants table from transactions using gcloud CLI
# This is a simpler approach than using the SDK

set -e

PROJECT_ID="mail-reader-433802"
INSTANCE_ID="personal-dashboard-fdc"
DATABASE="fdcdb"

echo "Populating merchants table..."
echo "Project: $PROJECT_ID"

# SQL script to insert missing merchants
SQL_SCRIPT="
-- Create missing merchants from transactions
INSERT INTO merchants (id, name, normalized_name, category, transaction_count, total_amount, first_seen_at, created_at, updated_at)
SELECT
  COALESCE(MAX(m.id), 0) + ROW_NUMBER() OVER (ORDER BY t.merchant_name) as id,
  t.merchant_name as name,
  UPPER(REGEXP_REPLACE(t.merchant_name, '[^A-Z0-9]', '', 'g')) as normalized_name,
  NULL as category,
  0 as transaction_count,
  0 as total_amount,
  NOW() as first_seen_at,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  SELECT DISTINCT merchant_name
  FROM transactions
  WHERE merchant_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM merchants WHERE merchants.name = transactions.merchant_name
  )
) t
CROSS JOIN (SELECT MAX(id) as id FROM merchants) m
GROUP BY t.merchant_name;

-- Show results
SELECT COUNT(*) as total_merchants FROM merchants;
"

echo "$SQL_SCRIPT" | ~/google-cloud-sdk/bin/gcloud sql connect $INSTANCE_ID \
  --user=postgres \
  --database=$DATABASE \
  --project=$PROJECT_ID \
  --quiet

echo "Merchants populated successfully!"
