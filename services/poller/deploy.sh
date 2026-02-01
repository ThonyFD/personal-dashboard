#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GOOGLE_CLOUD_REGION:-us-central1}"

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "ERROR: GOOGLE_CLOUD_PROJECT not set and no gcloud project configured."
  exit 1
fi

IMAGE_NAME="gcr.io/${PROJECT_ID}/gmail-poller"

echo "Building ${IMAGE_NAME}..."
gcloud builds submit \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --config "${REPO_ROOT}/services/poller/cloudbuild.yaml" \
  "$REPO_ROOT"

echo "Deploying gmail-poller..."
gcloud run deploy gmail-poller \
  --image "${IMAGE_NAME}:latest" \
  --region "$REGION" \
  --allow-unauthenticated \
  --project "$PROJECT_ID"
