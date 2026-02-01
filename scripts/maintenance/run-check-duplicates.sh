#!/bin/bash
# Helper script to check duplicate merchants
# Runs from the correct directory with proper dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔍 Checking for duplicate merchants..."
echo ""

# Change to ingestor service directory (where Firebase dependencies are)
cd "$PROJECT_ROOT/services/ingestor"

# Run the check script
npx tsx ../../scripts/maintenance/check-duplicate-merchants.ts

# Return to original directory
cd "$PROJECT_ROOT"
