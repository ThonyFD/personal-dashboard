#!/bin/bash
# Setup Google Secret Manager for OAuth credentials
# This script creates secret placeholders - you'll need to add the actual values manually

set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT}"

echo "Setting up Secret Manager for project: $PROJECT_ID"

# Enable Secret Manager API
echo "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com \
  --project=$PROJECT_ID

# Create secrets (without values - these must be added manually)
echo "Creating secret placeholders..."

gcloud secrets create gmail-oauth-client-id \
  --replication-policy="automatic" \
  --project=$PROJECT_ID \
  --quiet || echo "Secret gmail-oauth-client-id already exists"

gcloud secrets create gmail-oauth-client-secret \
  --replication-policy="automatic" \
  --project=$PROJECT_ID \
  --quiet || echo "Secret gmail-oauth-client-secret already exists"

gcloud secrets create gmail-oauth-refresh-token \
  --replication-policy="automatic" \
  --project=$PROJECT_ID \
  --quiet || echo "Secret gmail-oauth-refresh-token already exists"

echo ""
echo "Secret placeholders created!"
echo ""
echo "IMPORTANT: You must add the actual secret values using:"
echo "  echo -n 'YOUR_CLIENT_ID' | gcloud secrets versions add gmail-oauth-client-id --data-file=-"
echo "  echo -n 'YOUR_CLIENT_SECRET' | gcloud secrets versions add gmail-oauth-client-secret --data-file=-"
echo "  echo -n 'YOUR_REFRESH_TOKEN' | gcloud secrets versions add gmail-oauth-refresh-token --data-file=-"
echo ""
echo "To obtain OAuth credentials:"
echo "  1. Go to https://console.cloud.google.com/apis/credentials"
echo "  2. Create OAuth 2.0 Client ID (Desktop app type)"
echo "  3. Download credentials and use oauth2 flow to get refresh token"
echo "  4. Scope needed: https://www.googleapis.com/auth/gmail.readonly"
