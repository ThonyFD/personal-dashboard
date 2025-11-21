#!/bin/bash
# Setup Cloud Scheduler for Gmail watch renewal
set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT}"
REGION="${GOOGLE_CLOUD_REGION:-us-central1}"
SERVICE_NAME="finance-agent-renewal"

echo "Setting up Cloud Scheduler for project: $PROJECT_ID"

# Enable Cloud Scheduler API
echo "Enabling Cloud Scheduler API..."
gcloud services enable cloudscheduler.googleapis.com \
  --project=$PROJECT_ID

# Get renewal service URL
echo "Getting renewal service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --platform=managed \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
  echo "ERROR: Renewal service not found. Please deploy it first."
  echo "Run: cd services/renewal && ./deploy.sh"
  exit 1
fi

echo "Service URL: $SERVICE_URL"

# Get service account email
SA_EMAIL="finance-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Create scheduler job
echo "Creating scheduler job..."
gcloud scheduler jobs create http gmail-watch-renewal \
  --schedule="0 0 * * *" \
  --time-zone="America/Panama" \
  --http-method=POST \
  --uri="${SERVICE_URL}/renew" \
  --oidc-service-account-email="$SA_EMAIL" \
  --location=$REGION \
  --project=$PROJECT_ID \
  --quiet || echo "Scheduler job already exists"

echo ""
echo "Cloud Scheduler setup complete!"
echo ""
echo "Job: gmail-watch-renewal"
echo "Schedule: Daily at midnight (Panama time)"
echo "Target: ${SERVICE_URL}/renew"
echo ""
echo "To manually trigger:"
echo "  gcloud scheduler jobs run gmail-watch-renewal --location=$REGION --project=$PROJECT_ID"
