#!/bin/bash
set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GOOGLE_CLOUD_REGION:-us-central1}"

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "ERROR: GOOGLE_CLOUD_PROJECT not set and no gcloud project configured."
  exit 1
fi

echo "Importing resources for project: $PROJECT_ID"

# Import Pub/Sub Topics
terraform import google_pubsub_topic.gmail_notifications projects/$PROJECT_ID/topics/gmail-notifications || echo "Topic already imported or failed"
terraform import google_pubsub_topic.gmail_dlq projects/$PROJECT_ID/topics/gmail-notifications-dlq || echo "DLQ Topic already imported or failed"

# Import Pub/Sub Subscriptions
terraform import google_pubsub_subscription.gmail_ingestor_sub projects/$PROJECT_ID/subscriptions/gmail-ingestor-sub || echo "Subscription already imported or failed"
terraform import google_pubsub_subscription.gmail_dlq_sub projects/$PROJECT_ID/subscriptions/gmail-dlq-sub || echo "DLQ Subscription already imported or failed"

# Import Secrets
terraform import google_secret_manager_secret.gmail_oauth_client_id projects/$PROJECT_ID/secrets/gmail-oauth-client-id || echo "Secret client-id already imported or failed"
terraform import google_secret_manager_secret.gmail_oauth_client_secret projects/$PROJECT_ID/secrets/gmail-oauth-client-secret || echo "Secret client-secret already imported or failed"
terraform import google_secret_manager_secret.gmail_oauth_refresh_token projects/$PROJECT_ID/secrets/gmail-oauth-refresh-token || echo "Secret refresh-token already imported or failed"

# Import Scheduler Job
terraform import google_cloud_scheduler_job.gmail_watch_renewal projects/$PROJECT_ID/locations/$REGION/jobs/gmail-watch-renewal || echo "Scheduler job already imported or failed"

# Import Service Account
terraform import google_service_account.finance_agent_sa projects/$PROJECT_ID/serviceAccounts/finance-agent-sa@$PROJECT_ID.iam.gserviceaccount.com || echo "Service Account already imported or failed"

echo "Import complete!"
