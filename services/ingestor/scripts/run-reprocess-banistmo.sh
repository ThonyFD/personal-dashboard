#!/bin/bash
# Run Banistmo reprocessing with Cloud SQL Proxy
set -e

INSTANCE_CONNECTION_NAME="mail-reader-433802:us-central1:personal-dashboard-fdc"
PROXY_PORT=5433

echo "🚀 Starting Banistmo email reprocessing..."
echo ""

# Check if cloud-sql-proxy is available
if ! command -v cloud-sql-proxy &> /dev/null; then
    # Try with cloud_sql_proxy (alternative name)
    if ! command -v cloud_sql_proxy &> /dev/null; then
        echo "❌ cloud-sql-proxy not found"
        echo ""
        echo "Please install it:"
        echo "  brew install cloud-sql-proxy"
        echo ""
        echo "Or download from: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy#install"
        exit 1
    fi
    PROXY_CMD="cloud_sql_proxy"
else
    PROXY_CMD="cloud-sql-proxy"
fi

echo "✓ Found $PROXY_CMD"
echo ""
echo "🔄 Starting Cloud SQL Proxy on port $PROXY_PORT..."

# Start proxy in background
$PROXY_CMD --port $PROXY_PORT "$INSTANCE_CONNECTION_NAME" &
PROXY_PID=$!

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping Cloud SQL Proxy..."
    kill $PROXY_PID 2>/dev/null || true
    wait $PROXY_PID 2>/dev/null || true
}

trap cleanup EXIT INT TERM

# Wait for proxy to be ready
echo "⏳ Waiting for proxy to be ready..."
sleep 3

# Check if proxy is running
if ! kill -0 $PROXY_PID 2>/dev/null; then
    echo "❌ Cloud SQL Proxy failed to start"
    exit 1
fi

echo "✓ Cloud SQL Proxy ready"
echo ""
echo "🔄 Running reprocessing script..."
echo ""

# Set environment variables and run the script
cd "$(dirname "$0")/.."
# Use connection string with explicit empty password (no colon after username)
# This tells pg not to look for PGPASSWORD env var
POSTGRES_CONNECTION_STRING="postgresql://postgres:@localhost:$PROXY_PORT/fdcdb_dc?sslmode=disable" \
npx tsx scripts/reprocess-banistmo-from-gmail.ts

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Reprocessing completed successfully!"
else
    echo "❌ Reprocessing failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
