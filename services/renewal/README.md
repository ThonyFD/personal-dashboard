# Renewal Service

Cloud Run service that renews the Gmail watch subscription daily. Gmail watch subscriptions expire after 7 days, so this service must run at least once per week.

## Features

- Renews Gmail push notification watch
- Triggered by Cloud Scheduler (daily)
- Minimal resource usage (256MB, 1 CPU)
- Structured logging

## Architecture

```
Cloud Scheduler → Cloud Run (this service) → Gmail API
```

## Deployment

```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_REGION="us-central1"
chmod +x deploy.sh
./deploy.sh
```

## Cloud Scheduler Setup

After deploying, create a Cloud Scheduler job:

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe finance-agent-renewal \
  --platform=managed \
  --region=us-central1 \
  --format='value(status.url)')

# Create scheduler job
gcloud scheduler jobs create http gmail-watch-renewal \
  --schedule="0 0 * * *" \
  --http-method=POST \
  --uri="${SERVICE_URL}/renew" \
  --oidc-service-account-email="finance-agent-sa@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
  --location=us-central1 \
  --project=${GOOGLE_CLOUD_PROJECT}
```

Schedule: Daily at midnight (0 0 * * *)

## Manual Trigger

Test renewal manually:

```bash
gcloud scheduler jobs run gmail-watch-renewal \
  --location=us-central1 \
  --project=${GOOGLE_CLOUD_PROJECT}
```

## Monitoring

Key alerts to set up:
- Alert if renewal fails 2 days in a row
- Alert if no Gmail notifications received in 6+ hours (watch may have expired)

## Endpoints

- `GET /health` - Health check
- `POST /renew` - Trigger watch renewal (called by Cloud Scheduler)
