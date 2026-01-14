#!/bin/bash
# Fix merchant stats by recalculating from transactions table

set -e

PROJECT_ID="mail-reader-433802"
INSTANCE_NAME="personal-dashboard-fdc"
DB_NAME="fdcdb_dc"
DB_USER="postgres"

echo "==================================="
echo "Fixing Merchant Statistics"
echo "==================================="
echo ""

# Create temp bucket for SQL import if it doesn't exist
BUCKET_NAME="${PROJECT_ID}-temp-sql"
echo "Checking if bucket exists..."
if ! ~/google-cloud-sdk/bin/gcloud storage buckets describe "gs://${BUCKET_NAME}" &>/dev/null; then
  echo "Creating temp bucket..."
  ~/google-cloud-sdk/bin/gcloud storage buckets create "gs://${BUCKET_NAME}" \
    --location=us-central1 \
    --project="${PROJECT_ID}"
fi

# Upload SQL file to bucket
echo "Uploading SQL script to bucket..."
~/google-cloud-sdk/bin/gcloud storage cp scripts/fix-merchant-stats.sql "gs://${BUCKET_NAME}/fix-merchant-stats.sql"

# Execute SQL via Cloud SQL import
echo "Executing SQL script..."
~/google-cloud-sdk/bin/gcloud sql import sql "${INSTANCE_NAME}" \
  "gs://${BUCKET_NAME}/fix-merchant-stats.sql" \
  --database="${DB_NAME}" \
  --project="${PROJECT_ID}" \
  --quiet

echo ""
echo "✅ Merchant stats updated successfully!"
echo ""
echo "Cleaning up..."
~/google-cloud-sdk/bin/gcloud storage rm "gs://${BUCKET_NAME}/fix-merchant-stats.sql"

echo ""
echo "Done! Check the merchants page to verify the stats are now showing correctly."
