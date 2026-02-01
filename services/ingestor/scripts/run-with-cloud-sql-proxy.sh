#!/bin/bash
# Run script with Cloud SQL proxy connection
# Usage: ./run-with-cloud-sql-proxy.sh simple-reprocess-banistmo.ts

set -e

INSTANCE_CONNECTION_NAME="mail-reader-433802:us-central1:personal-dashboard-fdc"
DB_NAME="fdcdb_dc"
DB_USER="postgres"

# Check if cloud-sql-proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "❌ cloud-sql-proxy not found. Installing..."
    echo "Please visit: https://cloud.google.com/sql/docs/mysql/sql-proxy#install"
    exit 1
fi

echo "🔄 Starting Cloud SQL Proxy..."

# Start cloud-sql-proxy in the background
cloud-sql-proxy --port 5433 "$INSTANCE_CONNECTION_NAME" &
PROXY_PID=$!

# Function to cleanup proxy on exit
cleanup() {
    echo ""
    echo "🛑 Stopping Cloud SQL Proxy..."
    kill $PROXY_PID 2>/dev/null || true
}
trap cleanup EXIT

# Wait for proxy to be ready
echo "⏳ Waiting for proxy to be ready..."
sleep 3

# Set environment variables for pg client
export PG HOST="127.0.0.1"
export PGPORT="5433"
export PGDATABASE="$DB_NAME"
export PGUSER="$DB_USER"
export PGPASSWORD=""  # Uses IAM auth or no password for local development

echo "✓ Cloud SQL Proxy ready"
echo "Running script: $1"
echo ""

# Run the script
npx tsx "scripts/$1"

# Cleanup is handled by the trap
