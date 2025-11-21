#!/bin/bash
# Setup Cloud Scheduler for Gmail Poller service

set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-mail-reader-433802}"
REGION="${GOOGLE_CLOUD_REGION:-us-central1}"
SERVICE_NAME="gmail-poller"
JOB_NAME="gmail-poller-hourly"

echo "Setting up Cloud Scheduler for Gmail Poller..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo "Job: $JOB_NAME"

# Enable Cloud Scheduler API
echo "Enabling Cloud Scheduler API..."
gcloud services enable cloudscheduler.googleapis.com \
  --project=$PROJECT_ID

# Get poller service URL
echo "Getting poller service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --platform=managed \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
  echo "ERROR: Poller service not found. Please deploy it first."
  echo "Run: cd services/poller && ./deploy.sh"
  exit 1
fi

echo "Service URL: $SERVICE_URL"

# Get service account email
SA_EMAIL="finance-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Create scheduler job (runs every hour)
echo "Creating scheduler job..."
gcloud scheduler jobs create http $JOB_NAME \
  --schedule="0 * * * *" \
  --time-zone="America/Panama" \
  --http-method=POST \
  --uri="${SERVICE_URL}/scheduled-poll" \
  --oidc-service-account-email="$SA_EMAIL" \
  --location=$REGION \
  --project=$PROJECT_ID \
  --quiet || echo "Scheduler job already exists"

echo ""
echo "✅ Cloud Scheduler setup complete!"
echo ""
echo "Job: $JOB_NAME"
echo "Schedule: Every hour at minute 0 (Panama time)"
echo "Target: ${SERVICE_URL}/scheduled-poll"
echo ""
echo "To manually trigger:"
echo "  gcloud scheduler jobs run $JOB_NAME --location=$REGION --project=$PROJECT_ID"
echo ""
echo "To view logs:"
echo "  gcloud logging read 'resource.labels.service_name=$SERVICE_NAME' --limit=10"