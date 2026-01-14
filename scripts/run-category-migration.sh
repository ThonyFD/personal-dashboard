#!/bin/bash
# Script to run category migration using gcloud sql execute-sql
# No psql client required!

set -e  # Exit on error

PROJECT="mail-reader-433802"
INSTANCE="personal-dashboard-fdc"
DATABASE="fdcdb_dc"

echo "🚀 Starting Category Integrity Migration..."
echo ""

# Step 1: Populate categories
echo "📝 Step 1: Populating categories table..."
~/google-cloud-sdk/bin/gcloud sql execute-sql "$INSTANCE" \
  --database="$DATABASE" \
  --project="$PROJECT" \
  --format="table" \
  "$(cat scripts/populate-categories.sql)"

if [ $? -eq 0 ]; then
  echo "✅ Categories populated successfully"
else
  echo "❌ Failed to populate categories"
  exit 1
fi

echo ""

# Step 2: Migrate merchant categories
echo "📝 Step 2: Migrating existing merchant categories..."
~/google-cloud-sdk/bin/gcloud sql execute-sql "$INSTANCE" \
  --database="$DATABASE" \
  --project="$PROJECT" \
  --format="table" \
  "$(cat scripts/migrate-merchant-categories.sql)"

if [ $? -eq 0 ]; then
  echo "✅ Merchant categories migrated successfully"
else
  echo "❌ Failed to migrate merchant categories"
  exit 1
fi

echo ""

# Step 3: Add foreign key constraint
echo "📝 Step 3: Adding foreign key constraint..."
~/google-cloud-sdk/bin/gcloud sql execute-sql "$INSTANCE" \
  --database="$DATABASE" \
  --project="$PROJECT" \
  --format="table" \
  "$(cat scripts/add-category-fk-constraint.sql)"

if [ $? -eq 0 ]; then
  echo "✅ Foreign key constraint added successfully"
else
  echo "❌ Failed to add foreign key constraint"
  exit 1
fi

echo ""
echo "🎉 Category migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy Firebase Data Connect: firebase deploy --only dataconnect"
echo "2. Deploy Ingestor service: cd services/ingestor && gcloud run deploy ingestor ..."
