#!/bin/bash
# Deploy ingestor service to Cloud Run
set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT}"
REGION="${GOOGLE_CLOUD_REGION:-us-central1}"
SERVICE_NAME="finance-agent-ingestor"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "Deploying ${SERVICE_NAME} to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

# Build and push Docker image
echo "Building Docker image..."
gcloud builds submit --tag $IMAGE_NAME --project=$PROJECT_ID

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image=$IMAGE_NAME \
  --platform=managed \
  --region=$REGION \
  --project=$PROJECT_ID \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60s \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
  --set-secrets="DATABASE_URL=finance-agent-db-url:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest" \
  --service-account="finance-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --quiet

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --platform=managed \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)')

echo ""
echo "Deployment complete!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "Next steps:"
echo "1. Configure Pub/Sub subscription to push to: ${SERVICE_URL}/pubsub"
echo "2. Test health endpoint: ${SERVICE_URL}/health"
