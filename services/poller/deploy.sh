#!/bin/bash

# Gmail Poller Service Deployment Script

set -e

echo "🚀 Deploying Gmail Poller Service..."

# Variables
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-mail-reader-433802}"
REGION="${GOOGLE_CLOUD_REGION:-us-central1}"
SERVICE_NAME="gmail-poller"

echo "📍 Project: $PROJECT_ID"
echo "📍 Region: $REGION"
echo "📍 Service: $SERVICE_NAME"

# Build the service
echo "🔨 Building service..."
npm run build

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --project=$PROJECT_ID \
  --memory=256Mi \
  --cpu=1 \
  --max-instances=1 \
  --timeout=300 \
  --concurrency=1

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --platform=managed \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.url)")

echo ""
echo "✅ Deployment completed!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "🧪 Test the service:"
echo "curl $SERVICE_URL/health"
echo ""
echo "⏰ To setup Cloud Scheduler:"
echo "gcloud scheduler jobs create http gmail-poller \\"
echo "  --schedule=\"0 * * * *\" \\"
echo "  --http-method=POST \\"
echo "  --uri=\"$SERVICE_URL/scheduled-poll\" \\"
echo "  --oidc-service-account-email=\"finance-agent-sa@$PROJECT_ID.iam.gserviceaccount.com\" \\"
echo "  --location=$REGION \\"
echo "  --project=$PROJECT_ID"