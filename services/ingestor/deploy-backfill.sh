#!/bin/bash

set -e

echo "🚀 Deploying backfill Cloud Run Job..."

# Build the Docker image
echo "Building Docker image..."
~/google-cloud-sdk/bin/gcloud builds submit \
  --tag gcr.io/mail-reader-433802/backfill-week:latest \
  --project mail-reader-433802 \
  --file Dockerfile.backfill \
  .

# Deploy the Cloud Run Job
echo "Deploying Cloud Run Job..."
~/google-cloud-sdk/bin/gcloud run jobs deploy backfill-week \
  --image gcr.io/mail-reader-433802/backfill-week:latest \
  --region us-central1 \
  --project mail-reader-433802 \
  --set-env-vars GOOGLE_CLOUD_PROJECT=mail-reader-433802 \
  --set-secrets gmail-oauth-client-id=gmail-oauth-client-id:latest,gmail-oauth-client-secret=gmail-oauth-client-secret:latest,gmail-oauth-refresh-token=gmail-oauth-refresh-token:latest \
  --max-retries 0 \
  --task-timeout 30m \
  --memory 1Gi \
  --cpu 1

echo "✅ Deployment complete!"
echo ""
echo "To execute the job, run:"
echo "  gcloud run jobs execute backfill-week --region us-central1 --project mail-reader-433802"
