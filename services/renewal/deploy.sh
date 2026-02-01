#!/bin/bash
# Deploy renewal service to Cloud Run
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GOOGLE_CLOUD_REGION:-us-central1}"
SERVICE_NAME="gmail-renewal"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "ERROR: GOOGLE_CLOUD_PROJECT not set and no gcloud project configured."
  exit 1
fi

echo "Deploying ${SERVICE_NAME} to Cloud Run..."

# Build and push
gcloud builds submit \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --config "${REPO_ROOT}/services/renewal/cloudbuild.yaml" \
  "$REPO_ROOT"

# Deploy
gcloud run deploy "$SERVICE_NAME" \
  --image="${IMAGE_NAME}:latest" \
  --platform=managed \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --no-allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
  --quiet

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform=managed \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(status.url)')

echo ""
echo "Deployment complete!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "Next: Set up Cloud Scheduler to hit ${SERVICE_URL}/renew daily"
