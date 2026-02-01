#!/bin/bash
set -e

PROJECT_ID="mail-reader-433802"
INSTANCE_CONNECTION_NAME="mail-reader-433802:us-central1:personal-dashboard-fdc"
DB_USER="fdsystems.fd@gmail.com"  # Using IAM user
DB_NAME="fdcdb_dc"

echo "🔧 Reprocessing Yappy emails..."
echo "================================"

# Note: We'll set up the connection string after starting the proxy

echo "🔑 Fetching OAuth secrets..."
OAUTH_CLIENT_ID=$(~/google-cloud-sdk/bin/gcloud secrets versions access latest \
  --secret="gmail-oauth-client-id" \
  --project="$PROJECT_ID")

OAUTH_CLIENT_SECRET=$(~/google-cloud-sdk/bin/gcloud secrets versions access latest \
  --secret="gmail-oauth-client-secret" \
  --project="$PROJECT_ID")

OAUTH_REFRESH_TOKEN=$(~/google-cloud-sdk/bin/gcloud secrets versions access latest \
  --secret="gmail-oauth-refresh-token" \
  --project="$PROJECT_ID")

echo "🚀 Starting Cloud SQL Proxy..."
# Kill any existing cloud_sql_proxy processes
pkill -f cloud-sql-proxy || true

# Start Cloud SQL Proxy in background using the installed binary
/opt/homebrew/bin/cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" \
  --port=5433 &
PROXY_PID=$!

# Wait for proxy to be ready
echo "⏳ Waiting for proxy to be ready..."
sleep 5

# Get IAM access token for database authentication
echo "🔐 Getting IAM access token..."
DB_PASSWORD=$(~/google-cloud-sdk/bin/gcloud sql generate-login-token \
  --instance=personal-dashboard-fdc \
  --project="$PROJECT_ID")

# Update connection string to use proxy port with IAM auth
POSTGRES_CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5433/$DB_NAME"

# Trap to ensure cleanup
cleanup() {
  echo "🧹 Cleaning up..."
  if [ ! -z "$PROXY_PID" ]; then
    kill $PROXY_PID 2>/dev/null || true
  fi
  pkill -f cloud-sql-proxy || true
}
trap cleanup EXIT

echo "▶️  Running reprocess script..."

# Set environment variables and run the script
GOOGLE_CLOUD_PROJECT="$PROJECT_ID" \
POSTGRES_CONNECTION_STRING="$POSTGRES_CONNECTION_STRING" \
GMAIL_OAUTH_CLIENT_ID="$OAUTH_CLIENT_ID" \
GMAIL_OAUTH_CLIENT_SECRET="$OAUTH_CLIENT_SECRET" \
GMAIL_OAUTH_REFRESH_TOKEN="$OAUTH_REFRESH_TOKEN" \
npx tsx ./scripts/reprocess-yappy.ts

echo "✅ Reprocessing complete!"
