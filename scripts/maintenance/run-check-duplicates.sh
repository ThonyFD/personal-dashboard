#!/bin/bash
# Helper script to check duplicate merchants

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔍 Checking for duplicate merchants..."
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Run the check script
npx tsx scripts/maintenance/check-duplicate-merchants.ts

# Return to original directory
cd "$PROJECT_ROOT"
