#!/bin/bash
set -e

# OAuth Token Monitoring Setup
# This script sets up Cloud Scheduler and Cloud Monitoring alerts to detect OAuth token failures

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-mail-reader-433802}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="ingestor"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-thonyfd@gmail.com}"

echo "🔧 Setting up OAuth token monitoring..."
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service: $SERVICE_NAME"
echo "   Alert email: $NOTIFICATION_EMAIL"
echo ""

# Get the service URL
echo "📡 Getting Cloud Run service URL..."
SERVICE_URL=$(~/google-cloud-sdk/bin/gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)")

if [ -z "$SERVICE_URL" ]; then
  echo "❌ Error: Cloud Run service '$SERVICE_NAME' not found"
  exit 1
fi

HEALTH_URL="${SERVICE_URL}/health/oauth"
echo "   Health check URL: $HEALTH_URL"
echo ""

# Enable required APIs
echo "🔌 Enabling required APIs..."
~/google-cloud-sdk/bin/gcloud services enable \
  cloudscheduler.googleapis.com \
  monitoring.googleapis.com \
  --project="$PROJECT_ID"
echo "   ✅ APIs enabled"
echo ""

# Create or update Cloud Scheduler job
echo "⏰ Setting up Cloud Scheduler job..."
JOB_NAME="oauth-token-health-check"

# Check if job already exists
if ~/google-cloud-sdk/bin/gcloud scheduler jobs describe "$JOB_NAME" \
  --location="$REGION" \
  --project="$PROJECT_ID" &>/dev/null; then

  echo "   Updating existing job..."
  ~/google-cloud-sdk/bin/gcloud scheduler jobs update http "$JOB_NAME" \
    --location="$REGION" \
    --project="$PROJECT_ID" \
    --schedule="0 */6 * * *" \
    --uri="$HEALTH_URL" \
    --http-method=GET \
    --oidc-service-account-email="720071149950-compute@developer.gserviceaccount.com" \
    --oidc-token-audience="$SERVICE_URL" \
    --time-zone="America/Panama" \
    --attempt-deadline=60s
else
  echo "   Creating new job..."
  ~/google-cloud-sdk/bin/gcloud scheduler jobs create http "$JOB_NAME" \
    --location="$REGION" \
    --project="$PROJECT_ID" \
    --schedule="0 */6 * * *" \
    --uri="$HEALTH_URL" \
    --http-method=GET \
    --oidc-service-account-email="720071149950-compute@developer.gserviceaccount.com" \
    --oidc-token-audience="$SERVICE_URL" \
    --time-zone="America/Panama" \
    --attempt-deadline=60s
fi

echo "   ✅ Cloud Scheduler job configured"
echo "   Schedule: Every 6 hours"
echo ""

# Create log-based metric for OAuth failures (FIRST - before alert policy)
echo "📊 Setting up log-based metric..."
METRIC_NAME="oauth_health_check_failed"

# Check if metric already exists
if ~/google-cloud-sdk/bin/gcloud logging metrics describe "$METRIC_NAME" \
  --project="$PROJECT_ID" &>/dev/null; then

  echo "   Updating existing metric..."
  ~/google-cloud-sdk/bin/gcloud logging metrics update "$METRIC_NAME" \
    --project="$PROJECT_ID" \
    --description="Count of OAuth health check failures" \
    --log-filter='resource.type="cloud_run_revision"
resource.labels.service_name="'$SERVICE_NAME'"
jsonPayload.event="oauth_health_check_failed"'
else
  echo "   Creating new metric..."
  ~/google-cloud-sdk/bin/gcloud logging metrics create "$METRIC_NAME" \
    --project="$PROJECT_ID" \
    --description="Count of OAuth health check failures" \
    --log-filter='resource.type="cloud_run_revision"
resource.labels.service_name="'$SERVICE_NAME'"
jsonPayload.event="oauth_health_check_failed"'
fi

echo "   ✅ Log-based metric configured"
echo "   ⏳ Waiting 10 seconds for metric to be available..."
sleep 10
echo ""

# Create notification channel for email alerts
echo "📧 Setting up notification channel..."
CHANNEL_NAME="oauth-token-alerts"

# Install alpha component if needed
~/google-cloud-sdk/bin/gcloud components install alpha --quiet 2>/dev/null || true

# Check if channel already exists
EXISTING_CHANNEL=$(~/google-cloud-sdk/bin/gcloud alpha monitoring channels list \
  --project="$PROJECT_ID" \
  --filter="displayName:$CHANNEL_NAME" \
  --format="value(name)" \
  --limit=1 2>/dev/null || echo "")

if [ -n "$EXISTING_CHANNEL" ]; then
  echo "   Using existing notification channel: $EXISTING_CHANNEL"
  CHANNEL_ID="$EXISTING_CHANNEL"
else
  echo "   Creating new notification channel..."

  # Create channel using gcloud
  CHANNEL_ID=$(~/google-cloud-sdk/bin/gcloud alpha monitoring channels create \
    --display-name="$CHANNEL_NAME" \
    --type=email \
    --channel-labels=email_address="$NOTIFICATION_EMAIL" \
    --project="$PROJECT_ID" \
    --format="value(name)")

  echo "   ✅ Notification channel created: $CHANNEL_ID"
fi
echo ""

# Create alert policy for OAuth token failures
echo "🚨 Setting up alert policy..."
ALERT_POLICY_NAME="oauth-token-failure-alert"

# Create alert policy JSON
cat > /tmp/oauth-alert-policy.json <<EOF
{
  "displayName": "$ALERT_POLICY_NAME",
  "documentation": {
    "content": "OAuth refresh token has expired or is invalid. Manual re-authorization is required.\n\nFollow the instructions in: infra/gcloud/refresh-gmail-token.md",
    "mimeType": "text/markdown"
  },
  "conditions": [
    {
      "displayName": "OAuth health check failures",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"logging.googleapis.com/user/oauth_health_check_failed\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_SUM"
          }
        ]
      }
    }
  ],
  "combiner": "OR",
  "enabled": true,
  "notificationChannels": [
    "$CHANNEL_ID"
  ],
  "alertStrategy": {
    "autoClose": "604800s"
  }
}
EOF

# Check if alert policy already exists
EXISTING_POLICY=$(~/google-cloud-sdk/bin/gcloud alpha monitoring policies list \
  --project="$PROJECT_ID" \
  --filter="displayName:$ALERT_POLICY_NAME" \
  --format="value(name)" \
  --limit=1 2>/dev/null || echo "")

if [ -n "$EXISTING_POLICY" ]; then
  echo "   Updating existing alert policy..."
  ~/google-cloud-sdk/bin/gcloud alpha monitoring policies update "$EXISTING_POLICY" \
    --project="$PROJECT_ID" \
    --policy-from-file=/tmp/oauth-alert-policy.json || echo "   ⚠️  Alert policy update failed (may need time for metric to propagate)"
else
  echo "   Creating new alert policy..."
  ~/google-cloud-sdk/bin/gcloud alpha monitoring policies create \
    --project="$PROJECT_ID" \
    --policy-from-file=/tmp/oauth-alert-policy.json || echo "   ⚠️  Alert policy creation failed (may need time for metric to propagate)"
fi

rm /tmp/oauth-alert-policy.json
echo "   ✅ Alert policy configured"
echo ""

# Test the health check endpoint
echo "🧪 Testing OAuth health check endpoint..."
echo "   Triggering job manually..."
~/google-cloud-sdk/bin/gcloud scheduler jobs run "$JOB_NAME" \
  --location="$REGION" \
  --project="$PROJECT_ID"

echo ""
echo "   Waiting 10 seconds for logs..."
sleep 10

echo ""
echo "   Recent OAuth health check logs:"
~/google-cloud-sdk/bin/gcloud logging read \
  'resource.labels.service_name="'$SERVICE_NAME'" AND jsonPayload.event=~"oauth_health_check"' \
  --limit=3 \
  --project="$PROJECT_ID" \
  --format="table(timestamp,jsonPayload.event,jsonPayload.tokenExpiresIn,jsonPayload.error)"

echo ""
echo "✅ OAuth monitoring setup complete!"
echo ""
echo "📝 Summary:"
echo "   • Health check runs every 6 hours"
echo "   • Alerts sent to: $NOTIFICATION_EMAIL"
echo "   • Logs searchable with: jsonPayload.event=\"oauth_health_check_failed\""
echo ""
echo "🔍 Monitoring commands:"
echo ""
echo "   # View scheduler job status"
echo "   ~/google-cloud-sdk/bin/gcloud scheduler jobs describe $JOB_NAME --location=$REGION --project=$PROJECT_ID"
echo ""
echo "   # Manually trigger health check"
echo "   ~/google-cloud-sdk/bin/gcloud scheduler jobs run $JOB_NAME --location=$REGION --project=$PROJECT_ID"
echo ""
echo "   # View OAuth health check logs"
echo "   ~/google-cloud-sdk/bin/gcloud logging read 'jsonPayload.event=~\"oauth_health_check\"' --limit=10 --project=$PROJECT_ID"
echo ""
echo "   # View alert policies"
echo "   ~/google-cloud-sdk/bin/gcloud alpha monitoring policies list --project=$PROJECT_ID"
echo ""
echo "📚 If you receive an alert, follow: infra/gcloud/refresh-gmail-token.md"
echo ""
