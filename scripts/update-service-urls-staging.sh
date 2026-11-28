#!/bin/bash
# Automatically update Cloud Run service URLs in .env.stage
# Usage: ./scripts/update-service-urls-staging.sh
# Run after: ./scripts/deploy-all-staging.sh

set -e

PROJECT="verichron-recover-staging"
REGION="us-central1"

SERVICES=(
  "api-users-staging"
  "api-organizations-staging"
  "api-debts-staging"
  "api-debtors-staging"
  "api-transactions-staging"
  "api-communications-staging"
  "api-collectors-staging"
  "api-voice-staging"
  "api-workflows-staging"
  "api-automations-staging"
  "api-analytics-staging"
  "api-audits-staging"
)

echo "================================"
echo "Updating Service URLs"
echo "================================"
echo "Project: $PROJECT"
echo "Region: $REGION"
echo "================================"

# Check if .env.stage exists
if [ ! -f ".env.stage" ]; then
  echo "❌ .env.stage file not found in current directory"
  echo "Please run this script from the project root: ."
  exit 1
fi

# Create backup
BACKUP_FILE=".env.stage.backup.$(date +%Y%m%d_%H%M%S)"
cp .env.stage "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

echo ""
echo "========================================="
echo "Fetching Cloud Run Service URLs..."
echo "========================================="

# Temporary file for new URLs
TEMP_FILE=$(mktemp)

# Fetch all service URLs
for SERVICE in "${SERVICES[@]}"; do
  echo "Fetching $SERVICE..."

  URL=$(gcloud run services describe $SERVICE \
    --region=$REGION \
    --project=$PROJECT \
    --format='value(status.url)' 2>/dev/null || echo "")

  if [ -z "$URL" ]; then
    echo "⚠️  Warning: Could not fetch URL for $SERVICE (service may not be deployed)"
    continue
  fi

  echo "  $URL"

  # Convert service name to env var format (api-users-staging -> API_USERS_URL)
  # Strip -staging suffix before converting
  BASE_SERVICE=$(echo "$SERVICE" | sed 's/-staging$//')
  ENV_VAR_NAME=$(echo "$BASE_SERVICE" | tr '[:lower:]' '[:upper:]' | tr '-' '_')_URL

  # Store in temp file
  echo "${ENV_VAR_NAME}=${URL}" >> "$TEMP_FILE"
done

# Check if we got any URLs
if [ ! -s "$TEMP_FILE" ]; then
  echo ""
  echo "❌ No service URLs found. Are the services deployed?"
  echo "Deploy services first: ./scripts/deploy-all-staging.sh"
  rm "$TEMP_FILE"
  exit 1
fi

echo ""
echo "========================================="
echo "Updating .env.stage file..."
echo "========================================="

# Read the new URLs
while IFS='=' read -r VAR_NAME VAR_VALUE; do
  # Update the .env.stage file
  if grep -q "^${VAR_NAME}=" .env.stage; then
    # Replace existing line
    sed -i "s|^${VAR_NAME}=.*|${VAR_NAME}=${VAR_VALUE}|" .env.stage
    echo "✅ Updated $VAR_NAME"
  else
    # Add new line (shouldn't happen, but just in case)
    echo "${VAR_NAME}=${VAR_VALUE}" >> .env.stage
    echo "✅ Added $VAR_NAME"
  fi
done < "$TEMP_FILE"

rm "$TEMP_FILE"

echo ""
echo "========================================="
echo "✅ Service URLs Updated Successfully!"
echo "========================================="
echo ""
echo "Updated URLs in .env.stage:"
echo ""

# Display the updated URLs
for SERVICE in "${SERVICES[@]}"; do
  BASE_SERVICE=$(echo "$SERVICE" | sed 's/-staging$//')
  ENV_VAR_NAME=$(echo "$BASE_SERVICE" | tr '[:lower:]' '[:upper:]' | tr '-' '_')_URL
  URL=$(grep "^${ENV_VAR_NAME}=" .env.stage | cut -d '=' -f2-)
  if [ ! -z "$URL" ] && [[ ! "$URL" =~ REPLACE ]]; then
    echo "  $ENV_VAR_NAME"
    echo "    $URL"
  fi
done

echo ""
echo "========================================="
echo "Next Steps"
echo "========================================="
echo "1. Upload updated secret to GCP:"
echo "   gcloud secrets versions add env-stage \\"
echo "     --data-file=.env.stage \\"
echo "     --project=$PROJECT"
echo ""
echo "2. Re-deploy services to pick up new URLs:"
echo "   ./scripts/deploy-all-staging.sh"
echo ""
echo "3. Verify inter-service communication:"
echo "   ./scripts/verify-deployment-staging.sh"
echo ""
echo "Backup saved at: $BACKUP_FILE"
