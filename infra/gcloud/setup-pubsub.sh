#!/bin/bash
# Setup Pub/Sub infrastructure for AI Finance Agent
# This script creates the Pub/Sub topic and subscriptions needed for Gmail push notifications

set -e

# Configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT}"
TOPIC_NAME="gmail-notifications"
SUBSCRIPTION_NAME="gmail-ingestor-sub"
DLQ_TOPIC="gmail-notifications-dlq"
DLQ_SUBSCRIPTION="gmail-dlq-sub"
INGESTOR_URL="${INGESTOR_URL:-https://ingestor-720071149950.us-central1.run.app}"

echo "========================================"
echo "Pub/Sub Setup"
echo "========================================"
echo ""
echo "Project: $PROJECT_ID"
echo "Ingestor URL: $INGESTOR_URL"
echo ""

# Create main topic for Gmail notifications
echo "Creating topic: $TOPIC_NAME"
gcloud pubsub topics create $TOPIC_NAME \
  --project=$PROJECT_ID \
  --quiet || echo "Topic $TOPIC_NAME already exists"

# Create DLQ topic
echo "Creating DLQ topic: $DLQ_TOPIC"
gcloud pubsub topics create $DLQ_TOPIC \
  --project=$PROJECT_ID \
  --quiet || echo "DLQ topic $DLQ_TOPIC already exists"

# Create DLQ subscription
echo "Creating DLQ subscription: $DLQ_SUBSCRIPTION"
gcloud pubsub subscriptions create $DLQ_SUBSCRIPTION \
  --topic=$DLQ_TOPIC \
  --project=$PROJECT_ID \
  --quiet || echo "DLQ subscription $DLQ_SUBSCRIPTION already exists"

# Create main subscription with DLQ and push endpoint
echo "Creating main subscription: $SUBSCRIPTION_NAME with DLQ and push endpoint"
~/google-cloud-sdk/bin/gcloud pubsub subscriptions create $SUBSCRIPTION_NAME \
  --topic=$TOPIC_NAME \
  --push-endpoint="${INGESTOR_URL}/pubsub" \
  --ack-deadline=60 \
  --min-retry-delay=10s \
  --max-retry-delay=600s \
  --dead-letter-topic=$DLQ_TOPIC \
  --max-delivery-attempts=5 \
  --project=$PROJECT_ID \
  --quiet || echo "Subscription $SUBSCRIPTION_NAME already exists, updating..."

# Update existing subscription if it already exists
~/google-cloud-sdk/bin/gcloud pubsub subscriptions update $SUBSCRIPTION_NAME \
  --push-endpoint="${INGESTOR_URL}/pubsub" \
  --project=$PROJECT_ID \
  --quiet 2>/dev/null || true

# Grant Pub/Sub service account permission to publish to DLQ
SERVICE_ACCOUNT="service-$(~/google-cloud-sdk/bin/gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@gcp-sa-pubsub.iam.gserviceaccount.com"

echo "Granting DLQ publish permissions to: $SERVICE_ACCOUNT"
~/google-cloud-sdk/bin/gcloud pubsub topics add-iam-policy-binding $DLQ_TOPIC \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/pubsub.publisher" \
  --project=$PROJECT_ID \
  --quiet

~/google-cloud-sdk/bin/gcloud pubsub subscriptions add-iam-policy-binding $SUBSCRIPTION_NAME \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/pubsub.subscriber" \
  --project=$PROJECT_ID \
  --quiet

echo ""
echo "========================================"
echo "Pub/Sub setup complete!"
echo "========================================"
echo ""
echo "Created resources:"
echo "  ✓ Topic: $TOPIC_NAME"
echo "  ✓ Subscription: $SUBSCRIPTION_NAME"
echo "  ✓ Push endpoint: ${INGESTOR_URL}/pubsub"
echo "  ✓ DLQ Topic: $DLQ_TOPIC"
echo "  ✓ DLQ Subscription: $DLQ_SUBSCRIPTION"
echo ""
echo "Next step:"
echo "  Run ./setup-gmail-watch.sh to configure Gmail notifications"
echo ""
