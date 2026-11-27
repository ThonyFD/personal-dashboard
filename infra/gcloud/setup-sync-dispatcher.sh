#!/bin/bash
# Cloud Scheduler -> Workflows -> GitHub workflow_dispatch for frequent-email-sync.yml.
#
# GitHub's scheduled trigger for that workflow fires rarely, so near real-time
# budget alerts need an external clock. Safe to run again: existing resources
# are kept and only updated.
#
# The GitHub token is NOT set here. After this script, add it as a version of
# the secret github-sync-dispatch-token (Console > Secret Manager > New
# version, or: pbpaste | gcloud secrets versions add github-sync-dispatch-token --data-file=-).
# Token: fine-grained PAT, only this repository, permission "Actions: Read and write".

set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-mail-reader-433802}"
REGION="us-central1"
SA_NAME="sync-dispatcher"
SA="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SECRET="github-sync-dispatch-token"
WORKFLOW="dispatch-frequent-sync"
JOB="frequent-email-sync-dispatch"
# Off the top of the hour, same minutes as the GitHub cron in frequent-email-sync.yml.
SCHEDULE="7,22,37,52 * * * *"
HERE="$(cd "$(dirname "$0")" && pwd)"

gcloud services enable workflows.googleapis.com workflowexecutions.googleapis.com cloudscheduler.googleapis.com secretmanager.googleapis.com --project="$PROJECT_ID"

gcloud iam service-accounts describe "$SA" --project="$PROJECT_ID" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "$SA_NAME" --project="$PROJECT_ID" \
    --display-name="Starts frequent-email-sync on GitHub"

gcloud secrets describe "$SECRET" --project="$PROJECT_ID" >/dev/null 2>&1 ||
  gcloud secrets create "$SECRET" --project="$PROJECT_ID" --replication-policy=automatic

# Least privilege: read this one secret, start workflow executions.
gcloud secrets add-iam-policy-binding "$SECRET" --project="$PROJECT_ID" \
  --member="serviceAccount:${SA}" --role=roles/secretmanager.secretAccessor --condition=None >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA}" --role=roles/workflows.invoker --condition=None >/dev/null

gcloud workflows deploy "$WORKFLOW" --project="$PROJECT_ID" --location="$REGION" \
  --source="${HERE}/dispatch-frequent-sync.workflow.yaml" --service-account="$SA"

# Without a token every execution would fail, so the clock starts only once
# the secret has a version. Run this script again after adding it.
if [ -z "$(gcloud secrets versions list "$SECRET" --project="$PROJECT_ID" --filter=state:ENABLED --limit=1 --format='value(name)')" ]; then
  echo "Secret ${SECRET} has no version yet: add the token, then run this script again to create the Scheduler job."
  exit 0
fi

URI="https://workflowexecutions.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/workflows/${WORKFLOW}/executions"
if gcloud scheduler jobs describe "$JOB" --project="$PROJECT_ID" --location="$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$JOB" --project="$PROJECT_ID" --location="$REGION" \
    --schedule="$SCHEDULE" --time-zone="America/Panama" --uri="$URI" --http-method=POST \
    --message-body='{}' --oauth-service-account-email="$SA"
else
  gcloud scheduler jobs create http "$JOB" --project="$PROJECT_ID" --location="$REGION" \
    --schedule="$SCHEDULE" --time-zone="America/Panama" --uri="$URI" --http-method=POST \
    --message-body='{}' --oauth-service-account-email="$SA"
fi

echo "Done. Test once with: gcloud workflows run ${WORKFLOW} --location=${REGION} --project=${PROJECT_ID}"
