#!/bin/bash
# Deploy ingestor service to Cloud Run
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Resolve project/region, allowing defaults from gcloud config
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-}"
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
fi
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "ERROR: GOOGLE_CLOUD_PROJECT is not set and no gcloud default project found."
  echo "Set it with: export GOOGLE_CLOUD_PROJECT=your-project-id"
  exit 1
fi
export GOOGLE_CLOUD_PROJECT="$PROJECT_ID"

REGION="${GOOGLE_CLOUD_REGION:-us-central1}"
export GOOGLE_CLOUD_REGION="$REGION"
SERVICE_NAME="finance-agent-ingestor"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "Deploying ${SERVICE_NAME} to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

# Build and push Docker image
echo "Building Docker image..."
gcloud builds submit "$REPO_ROOT" \
  --config "$SCRIPT_DIR/cloudbuild.deploy.yaml" \
  --substitutions "_IMAGE=$IMAGE_NAME" \
  --project=$PROJECT_ID

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
