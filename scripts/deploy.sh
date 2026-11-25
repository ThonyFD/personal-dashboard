#!/bin/bash
set -e

# Deploy the Finance Dashboard to Firebase Hosting
# Usage: ./deploy.sh dashboard

PROJECT_ID="mail-reader-433802"

COMPONENT=$1

if [ -z "$COMPONENT" ]; then
  echo "Usage: ./deploy.sh [dashboard]"
  exit 1
fi

echo "🚀 Starting deployment for: $COMPONENT"

case $COMPONENT in
  dashboard)
    echo "Deploying Dashboard..."
    cd web/dashboard
    if [ "${SKIP_BUILD:-0}" != "1" ]; then
      npm run build
    else
      echo "Skipping dashboard build because SKIP_BUILD=1"
    fi
    cd ../..
    firebase deploy --only hosting --project "$PROJECT_ID"
    ;;
  *)
    echo "Unknown component: $COMPONENT"
    echo "Available: dashboard"
    exit 1
    ;;
esac

echo "✅ Deployment of $COMPONENT complete!"
