#!/bin/bash
# One-time setup for api-audits infrastructure in Staging
# Usage: ./scripts/setup-audits-staging.sh

set -e

PROJECT_ID="verichron-recover-staging"
REGION="us-central1"
INSTANCE="verichron-recover"

echo "================================"
echo "Setting up Audits Infrastructure"
echo "Target: $PROJECT_ID"
echo "================================"

# 1. Create the database in Cloud SQL
echo "1. Creating database 'audits_db'..."
if gcloud sql databases describe audits_db --instance=$INSTANCE --project=$PROJECT_ID &>/dev/null; then
  echo "   ✅ Database already exists."
else
  gcloud sql databases create audits_db --instance=$INSTANCE --project=$PROJECT_ID
  echo "   ✅ Database created."
fi

# 2. Setup Secrets
echo "2. Configuring Secrets..."

# Function to create or update a secret
create_secret() {
  local NAME=$1
  local VALUE=$2

  if gcloud secrets describe "$NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo "   Secret $NAME already exists. Adding new version..."
    echo -n "$VALUE" | gcloud secrets versions add "$NAME" --data-file=- --project="$PROJECT_ID"
  else
    echo "   Creating secret $NAME..."
    gcloud secrets create "$NAME" --replication-policy="automatic" --project="$PROJECT_ID"
    echo -n "$VALUE" | gcloud secrets versions add "$NAME" --data-file=- --project="$PROJECT_ID"
  fi
}

# DB URL (Reusing credentials from other services)
DB_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@/audits_db?host=/cloudsql/${PROJECT_ID}:${REGION}:${INSTANCE}"
create_secret "DATABASE_URL_AUDITS" "$DB_URL"

# Service Key
SERVICE_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
create_secret "SERVICE_KEY_AUDITS" "$SERVICE_KEY"

# Placeholder API URL (Required for other services to deploy)
# This will be updated by update-service-urls-staging.sh after deployment
API_URL="https://api-audits-staging-placeholder.run.app"
create_secret "API_AUDITS_URL" "$API_URL"

echo ""
echo "================================"
echo "✅ Audits setup complete!"
echo "Next Step: Deploy all services via vops.js"
echo "================================"
