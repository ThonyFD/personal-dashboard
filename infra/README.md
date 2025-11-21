# Infrastructure Setup

This directory contains infrastructure-as-code and setup scripts for the AI Finance Agent.

## Prerequisites

1. Google Cloud Project with billing enabled
2. gcloud CLI installed and authenticated
3. Required APIs enabled:
   - Cloud Run
   - Pub/Sub
   - Secret Manager
   - Firebase Data Connect
   - Cloud Scheduler

## Setup Order

### 1. Set Environment Variables

```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_REGION="us-central1"  # or your preferred region
```

### 2. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  pubsub.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  firebasedataconnect.googleapis.com \
  --project=$GOOGLE_CLOUD_PROJECT
```

### 3. Setup Pub/Sub

```bash
chmod +x gcloud/setup-pubsub.sh
./gcloud/setup-pubsub.sh
```

This creates:
- `gmail-notifications` topic
- `gmail-ingestor-sub` subscription with DLQ
- `gmail-notifications-dlq` topic
- `gmail-dlq-sub` subscription

### 4. Setup Secret Manager

```bash
chmod +x gcloud/setup-secrets.sh
./gcloud/setup-secrets.sh
```

Then add your OAuth credentials (see script output for instructions).

### 5. Deploy Services

See service-specific READMEs:
- [Ingestor Service](../services/ingestor/README.md)
- [Renewal Service](../services/renewal/README.md)

## Gmail OAuth Setup

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Desktop app type)
3. Download credentials
4. Use the credentials to obtain a refresh token with scope: `https://www.googleapis.com/auth/gmail.readonly`
5. Store credentials in Secret Manager using the commands from setup-secrets.sh output

## Security Notes

- Never commit credentials to git
- Use Workload Identity for service-to-service authentication
- All secrets are stored in Google Secret Manager
- Services use readonly Gmail scope only
