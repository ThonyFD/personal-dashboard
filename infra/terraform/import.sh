#!/bin/bash
set -e

PROJECT_ID="mail-reader-433802"
REGION="us-central1"

export GOOGLE_CLOUD_PROJECT="$PROJECT_ID"
export GOOGLE_CLOUD_REGION="$REGION"

echo "Importing resources for project: $PROJECT_ID"

# Import Pub/Sub Topics
terraform import google_pubsub_topic.gmail_notifications projects/$PROJECT_ID/topics/gmail-notifications || echo "Topic already imported or failed"
terraform import google_pubsub_topic.gmail_dlq projects/$PROJECT_ID/topics/gmail-notifications-dlq || echo "DLQ Topic already imported or failed"

# Import Pub/Sub Subscriptions
terraform import google_pubsub_subscription.gmail_dlq_sub projects/$PROJECT_ID/subscriptions/gmail-dlq-sub || echo "DLQ Subscription already imported or failed"

# Import Secrets
terraform import google_secret_manager_secret.gmail_oauth_client_id projects/$PROJECT_ID/secrets/gmail-oauth-client-id || echo "Secret client-id already imported or failed"
terraform import google_secret_manager_secret.gmail_oauth_client_secret projects/$PROJECT_ID/secrets/gmail-oauth-client-secret || echo "Secret client-secret already imported or failed"
terraform import google_secret_manager_secret.gmail_oauth_refresh_token projects/$PROJECT_ID/secrets/gmail-oauth-refresh-token || echo "Secret refresh-token already imported or failed"

# Import Service Account
terraform import google_service_account.finance_agent_sa projects/$PROJECT_ID/serviceAccounts/finance-agent-sa@$PROJECT_ID.iam.gserviceaccount.com || echo "Service Account already imported or failed"

echo "Import complete!"
