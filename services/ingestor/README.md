# Ingestor Service

Cloud Run service that receives Gmail push notifications via Pub/Sub, fetches emails, parses transactions, and stores them in the database.

## Features

- Receives Gmail push notifications via Pub/Sub
- Fetches email content using Gmail API
- Detects financial provider (BAC, Clave, Yappy, etc.)
- Parses transaction details using regex
- Stores emails and transactions in PostgreSQL
- Idempotent transaction insertion
- Structured logging for Cloud Monitoring

## Architecture

```
Gmail → Pub/Sub → Cloud Run (this service) → Firebase Data Connect (Postgres)
```

## Environment Variables

Required:
- `GOOGLE_CLOUD_PROJECT` - GCP project ID
- `DATABASE_URL` - PostgreSQL connection string (from Secret Manager)

## Secrets (via Secret Manager)

- `gmail-oauth-client-id` - OAuth 2.0 client ID
- `gmail-oauth-client-secret` - OAuth 2.0 client secret
- `gmail-oauth-refresh-token` - OAuth 2.0 refresh token

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
export DATABASE_URL="postgresql://user:pass@host:5432/db"
```

3. Run in development mode:
```bash
npm run dev
```

## Deployment

1. Ensure infrastructure is set up (see [infra/README.md](../../infra/README.md))

2. Deploy to Cloud Run:
```bash
chmod +x deploy.sh
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_REGION="us-central1"
./deploy.sh
```

## Endpoints

- `GET /health` - Health check
- `POST /pubsub` - Pub/Sub push endpoint
- `POST /trigger/:messageId` - Manual trigger for testing

## Testing

Test with a specific Gmail message ID:
```bash
curl -X POST https://your-service-url/trigger/MESSAGE_ID
```

## Supported Providers

- BAC (Banco de América Central)
- Clave (Panama digital payments)
- Yappy (Banco General mobile payments)

Additional providers can be added in `src/parsers/`

## Error Handling

- Pub/Sub retries on transient failures (5 attempts)
- Failed messages sent to DLQ after max retries
- All errors logged to Cloud Logging

## Monitoring

Key metrics to monitor:
- Request latency
- Error rate
- Pub/Sub unacked messages
- DLQ message count
