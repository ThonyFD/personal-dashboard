#!/bin/bash

set -e

PROJECT_ID="mail-reader-433802"
REGION="us-central1"
SERVICE_NAME="finance-agent-notifier"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "Building and deploying ${SERVICE_NAME}..."

# Build and push image
echo "Building container image..."
gcloud builds submit --tag ${IMAGE_NAME} --project=${PROJECT_ID}

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --region ${REGION} \
  --platform managed \
  --no-allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60s \
  --service-account finance-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-env-vars GOOGLE_CLOUD_PROJECT=${PROJECT_ID} \
  --project ${PROJECT_ID}

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --format 'value(status.url)' \
  --project ${PROJECT_ID})

echo ""
echo "✅ Deployment successful!"
echo "Service URL: ${SERVICE_URL}"
echo ""
echo "Next steps:"
echo "1. Create Cloud Scheduler jobs:"
echo ""
echo "# Morning job (9am)"
echo "gcloud scheduler jobs create http notifier-morning \\"
echo "  --schedule='0 9 * * *' \\"
echo "  --time-zone='America/Panama' \\"
echo "  --uri='${SERVICE_URL}/notify' \\"
echo "  --http-method=POST \\"
echo "  --oidc-service-account-email='finance-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com' \\"
echo "  --location='us-central1' \\"
echo "  --project='${PROJECT_ID}'"
echo ""
echo "# Evening job (6pm)"
echo "gcloud scheduler jobs create http notifier-evening \\"
echo "  --schedule='0 18 * * *' \\"
echo "  --time-zone='America/Panama' \\"
echo "  --uri='${SERVICE_URL}/notify' \\"
echo "  --http-method=POST \\"
echo "  --oidc-service-account-email='finance-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com' \\"
echo "  --location='us-central1' \\"
echo "  --project='${PROJECT_ID}'"
echo ""
echo "2. Grant invoker permission to service account:"
echo "gcloud run services add-iam-policy-binding ${SERVICE_NAME} \\"
echo "  --member='serviceAccount:finance-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com' \\"
echo "  --role='roles/run.invoker' \\"
echo "  --region=${REGION} \\"
echo "  --project=${PROJECT_ID}"
