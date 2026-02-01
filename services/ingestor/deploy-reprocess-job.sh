#!/bin/bash
# Deploy Banistmo reprocessing job to Cloud Run

set -e

PROJECT_ID="mail-reader-433802"
REGION="us-central1"
JOB_NAME="reprocess-banistmo"
IMAGE_NAME="gcr.io/$PROJECT_ID/$JOB_NAME"
SQL_INSTANCE="mail-reader-433802:us-central1:personal-dashboard-fdc"

echo "🚀 Deploying Banistmo Reprocessing Job to Cloud Run"
echo ""

# Build and push Docker image using Cloud Build
echo "📦 Building Docker image with Cloud Build..."
cd "$(dirname "$0")"

~/google-cloud-sdk/bin/gcloud builds submit \
  --project="$PROJECT_ID" \
  --config=cloudbuild.reprocess.yaml \
  .

echo ""
echo "☁️  Creating/Updating Cloud Run Job..."
~/google-cloud-sdk/bin/gcloud run jobs deploy "$JOB_NAME" \
  --image="$IMAGE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --set-cloudsql-instances="$SQL_INSTANCE" \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,INSTANCE_UNIX_SOCKET=/cloudsql/$SQL_INSTANCE,DB_NAME=fdcdb_dc,DB_USER=postgres" \
  --set-secrets="gmail-oauth-client-id=gmail-oauth-client-id:latest,gmail-oauth-client-secret=gmail-oauth-client-secret:latest,gmail-oauth-refresh-token=gmail-oauth-refresh-token:latest" \
  --max-retries=0 \
  --task-timeout=30m \
  --memory=512Mi \
  --cpu=1 \
  --quiet

echo ""
echo "✅ Job deployed successfully!"
echo ""
echo "To execute the job, run:"
echo "  ~/google-cloud-sdk/bin/gcloud run jobs execute $JOB_NAME --region=$REGION --project=$PROJECT_ID"
