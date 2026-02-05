#!/bin/bash
# Daily Email Sync Runner
# Simple wrapper script to run the daily email sync

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Daily Email Sync"
echo "=================="
echo ""

# Change to script directory
cd "$SCRIPT_DIR"

# Run the sync script
npx tsx sync-emails-daily.ts

echo ""
echo "✅ Daily sync completed successfully"
