#!/bin/bash
# Script to create missing secrets for api-analytics with known/generated values

PROJECT_ID="verichron-recover-staging"

# 1. Known Database URL
DB_URL="postgresql://verichron_stage:<REDACTED_DB_PASSWORD>@/analytics_db?host=/cloudsql/verichron-recover-staging:us-central1:verichron-recover"

# 2. Generated Service Key (32 chars)
SERVICE_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

echo "Creating secrets for api-analytics in project $PROJECT_ID..."
echo ""

# Function to create or update a secret
create_secret() {
  local NAME=$1
  local VALUE=$2

  if gcloud secrets describe "$NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo "Secret $NAME already exists. Adding new version..."
    echo -n "$VALUE" | gcloud secrets versions add "$NAME" --data-file=- --project="$PROJECT_ID"
  else
    echo "Creating secret $NAME..."
    echo -n "$VALUE" | gcloud secrets create "$NAME" --data-file=- --project="$PROJECT_ID"
  fi
}

echo "1. Creating DATABASE_URL_ANALYTICS..."
create_secret "DATABASE_URL_ANALYTICS" "$DB_URL"

echo "2. Creating SERVICE_KEY_ANALYTICS..."
create_secret "SERVICE_KEY_ANALYTICS" "$SERVICE_KEY"

echo ""
echo "Done! Secrets created."
echo "Service Key generated: $SERVICE_KEY"