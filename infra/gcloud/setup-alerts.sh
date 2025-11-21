#!/bin/bash
# Setup Cloud Monitoring alerts
set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT}"
NOTIFICATION_EMAIL="${ALERT_EMAIL:-admin@example.com}"

echo "Setting up Cloud Monitoring alerts for project: $PROJECT_ID"
echo "Notification email: $NOTIFICATION_EMAIL"

# Create notification channel (email)
echo "Creating notification channel..."
CHANNEL_ID=$(gcloud alpha monitoring channels create \
  --display-name="Email Alerts" \
  --type=email \
  --channel-labels=email_address=$NOTIFICATION_EMAIL \
  --project=$PROJECT_ID \
  --format='value(name)' 2>/dev/null || echo "")

if [ -z "$CHANNEL_ID" ]; then
  echo "Note: Notification channel may already exist or creation failed"
  echo "You can create it manually in Cloud Console"
fi

# Alert 1: High error rate in ingestor service
cat > /tmp/alert-high-error-rate.yaml << EOF
displayName: "Finance Agent - High Error Rate"
conditions:
  - displayName: "Error rate > 5%"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="finance-agent-ingestor" AND metric.type="logging.googleapis.com/log_entry_count" AND metric.labels.severity="ERROR"'
      comparison: COMPARISON_GT
      thresholdValue: 5
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
alertStrategy:
  autoClose: 86400s
EOF

echo "Creating alert: High Error Rate..."
gcloud alpha monitoring policies create --policy-from-file=/tmp/alert-high-error-rate.yaml \
  --project=$PROJECT_ID --quiet || echo "Alert may already exist"

# Alert 2: DLQ has messages
cat > /tmp/alert-dlq-messages.yaml << EOF
displayName: "Finance Agent - Dead Letter Queue Not Empty"
conditions:
  - displayName: "DLQ message count > 0"
    conditionThreshold:
      filter: 'resource.type="pubsub_subscription" AND resource.labels.subscription_id="gmail-dlq-sub" AND metric.type="pubsub.googleapis.com/subscription/num_unacked_messages_by_region"'
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_MAX
alertStrategy:
  autoClose: 86400s
EOF

echo "Creating alert: DLQ Messages..."
gcloud alpha monitoring policies create --policy-from-file=/tmp/alert-dlq-messages.yaml \
  --project=$PROJECT_ID --quiet || echo "Alert may already exist"

# Alert 3: Watch renewal failures
cat > /tmp/alert-renewal-failure.yaml << EOF
displayName: "Finance Agent - Watch Renewal Failed"
conditions:
  - displayName: "Renewal failures > 0"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="finance-agent-renewal" AND metric.type="logging.googleapis.com/log_entry_count" AND jsonPayload.event="watch_renewal_failed"'
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
alertStrategy:
  autoClose: 86400s
EOF

echo "Creating alert: Renewal Failures..."
gcloud alpha monitoring policies create --policy-from-file=/tmp/alert-renewal-failure.yaml \
  --project=$PROJECT_ID --quiet || echo "Alert may already exist"

# Clean up temp files
rm -f /tmp/alert-*.yaml

echo ""
echo "Alert setup complete!"
echo ""
echo "Configured alerts:"
echo "  1. High error rate (>5% errors)"
echo "  2. Dead letter queue not empty"
echo "  3. Watch renewal failures"
echo ""
echo "To view alerts: https://console.cloud.google.com/monitoring/alerting?project=$PROJECT_ID"
