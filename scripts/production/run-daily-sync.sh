#!/bin/bash
# Daily Email Sync Runner
# Simple wrapper script to run the daily email sync

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔄 Daily Email Sync"
echo "=================="
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Run the sync script
npx tsx scripts/sync-emails-daily.ts

echo ""
echo "✅ Daily sync completed successfully"
