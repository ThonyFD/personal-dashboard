#!/bin/bash
set -e

# Helper script to deploy components
# Usage: ./deploy.sh [component]

COMPONENT=$1

if [ -z "$COMPONENT" ]; then
  echo "Usage: ./deploy.sh [ingestor|poller|renewal|dashboard|database|infra|all]"
  exit 1
fi

echo "🚀 Starting deployment for: $COMPONENT"

case $COMPONENT in
  ingestor)
    echo "Deploying Ingestor..."
    cd services/ingestor
    ./deploy.sh
    ;;
  poller)
    echo "Deploying Poller..."
    bash services/poller/deploy.sh
    ;;
  renewal)
    echo "Deploying Renewal..."
    bash services/renewal/deploy.sh
    ;;
  dashboard)
    echo "Deploying Dashboard..."
    cd web/dashboard
    npm run build
    cd ../..
    firebase deploy --only hosting
    ;;
  database)
    echo "Deploying Database..."
    firebase deploy --only dataconnect
    ;;
  infra)
    echo "Deploying Infrastructure..."
    cd infra/terraform
    
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    REGION="${GOOGLE_CLOUD_REGION:-us-central1}"

    if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
      echo "ERROR: GOOGLE_CLOUD_PROJECT not set and no gcloud project configured."
      exit 1
    fi

    export GOOGLE_CLOUD_PROJECT="$PROJECT_ID"
    export GOOGLE_CLOUD_REGION="$REGION"

    # Try to get Ingestor URL (new name)
    INGESTOR_URL=$(gcloud run services describe finance-agent-ingestor --platform=managed --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")
    
    # Fallback to old name if new one doesn't exist yet (for migration safety)
    if [ -z "$INGESTOR_URL" ]; then
       INGESTOR_URL=$(gcloud run services describe ingestor --platform=managed --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")
    fi

    if [ -z "$INGESTOR_URL" ]; then
      echo "ERROR: Ingestor service URL not found."
      exit 1
    fi
    echo "Found Ingestor URL: $INGESTOR_URL"

    # Try to get Renewal URL (gmail-renewal is the current service name)
    RENEWAL_URL=$(gcloud run services describe gmail-renewal --platform=managed --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")
    if [ -z "$RENEWAL_URL" ]; then
       RENEWAL_URL=$(gcloud run services describe finance-agent-renewal --platform=managed --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")
    fi

    if [ -z "$RENEWAL_URL" ]; then
      echo "ERROR: Renewal service URL not found."
      exit 1
    fi
    echo "Found Renewal URL: $RENEWAL_URL"

    export TF_VAR_project_id="$PROJECT_ID"
    export TF_VAR_region="$REGION"
    export TF_VAR_ingestor_url="$INGESTOR_URL"
    export TF_VAR_renewal_url="$RENEWAL_URL"

    bash ./import.sh
    terraform apply -auto-approve -var="project_id=$PROJECT_ID" -var="ingestor_url=$INGESTOR_URL" -var="renewal_url=$RENEWAL_URL"
    ;;
  all)
    echo "Deploying EVERYTHING..."
    ./deploy.sh database
    ./deploy.sh ingestor
    ./deploy.sh poller
    ./deploy.sh renewal
    # Infra needs ingestor URL, so it comes after services
    ./deploy.sh infra
    ./deploy.sh dashboard
    ;;
  *)
    echo "Unknown component: $COMPONENT"
    echo "Available: ingestor, poller, renewal, dashboard, database, infra, all"
    exit 1
    ;;
esac

echo "✅ Deployment of $COMPONENT complete!"
