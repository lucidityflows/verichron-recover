#!/usr/bin/env bash

# ==============================================================================
# Verichron - Deploy Single API Service to Staging
# ==============================================================================
# Builds, pushes, and deploys a single API microservice to Cloud Run.
# Shows a preview of all secrets that will be configured before deploying.
#
# Usage:
#   ./scripts/deploy-single-staging.sh <service-name>
#   ./scripts/deploy-single-staging.sh api-users
#   ./scripts/deploy-single-staging.sh api-users --skip-build
#   ./scripts/deploy-single-staging.sh api-users --yes  # Skip confirmation
#
# Available services:
#   api-users, api-organizations, api-debts, api-debtors, api-transactions,
#   api-communications, api-collectors, api-voice, api-workflows,
#   api-automations, api-analytics, api-audits
# ==============================================================================

set -e

PROJECT_ID="verichron-recover-staging"
REGION="us-central1"
REGISTRY="us-central1-docker.pkg.dev/${PROJECT_ID}/verichron-staging"
VPC_CONNECTOR="verirchron-connector"
CLOUD_SQL_INSTANCE="verichron-recover-staging:us-central1:verichron-recover"

# Parse arguments
SERVICE=""
SKIP_BUILD=false
AUTO_CONFIRM=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --yes|-y)
      AUTO_CONFIRM=true
      shift
      ;;
    *)
      SERVICE="$1"
      shift
      ;;
  esac
done

# Common secrets for all services
COMMON_SECRETS="REDIS_URL=REDIS_URL:latest,REDIS_HOST=REDIS_HOST:latest,REDIS_PORT=REDIS_PORT:latest,JWT_SECRET=JWT_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest,JWT_ACCESS_TOKEN_EXPIRES_IN=JWT_ACCESS_TOKEN_EXPIRES_IN:latest,JWT_REFRESH_TOKEN_EXPIRES_IN=JWT_REFRESH_TOKEN_EXPIRES_IN:latest,AUTH_CONTEXT_TOKEN_SECRET=AUTH_CONTEXT_TOKEN_SECRET:latest,GCP_PROJECT_ID=GCP_PROJECT_ID:latest,GCP_LOCATION=GCP_LOCATION:latest,PUBSUB_PROJECT_ID=PUBSUB_PROJECT_ID:latest,API_USERS_URL=API_USERS_URL:latest,API_ORGANIZATIONS_URL=API_ORGANIZATIONS_URL:latest,API_DEBTS_URL=API_DEBTS_URL:latest,API_DEBTORS_URL=API_DEBTORS_URL:latest,API_TRANSACTIONS_URL=API_TRANSACTIONS_URL:latest,API_COMMUNICATIONS_URL=API_COMMUNICATIONS_URL:latest,API_COLLECTORS_URL=API_COLLECTORS_URL:latest,API_VOICE_URL=API_VOICE_URL:latest,API_WORKFLOWS_URL=API_WORKFLOWS_URL:latest,API_AUTOMATIONS_URL=API_AUTOMATIONS_URL:latest,API_ANALYTICS_URL=API_ANALYTICS_URL:latest,API_AUDITS_URL=API_AUDITS_URL:latest"

# Service configurations: service_name -> "db_secret_name service_key additional_secrets"
declare -A SERVICE_CONFIGS=(
  ["api-users"]="DATABASE_URL_USERS SERVICE_KEY_USERS"
  ["api-organizations"]="DATABASE_URL_ORGANIZATIONS SERVICE_KEY_ORGANIZATIONS"
  ["api-debts"]="DATABASE_URL_DEBTS SERVICE_KEY_DEBTS DOCUMENT_AI_PROCESSOR_ID=DOCUMENT_AI_PROCESSOR_ID:latest,DOCUMENT_AI_LOCATION=DOCUMENT_AI_LOCATION:latest,DOCUMENT_AI_ENABLED=DOCUMENT_AI_ENABLED:latest,DOCUMENT_AI_TIMEOUT_MS=DOCUMENT_AI_TIMEOUT_MS:latest,VERTEX_AI_ENABLED=VERTEX_AI_ENABLED:latest,VERTEX_AI_MODEL=VERTEX_AI_MODEL:latest,VERTEX_AI_LOCATION=VERTEX_AI_LOCATION:latest,VERTEX_AI_TIMEOUT_MS=VERTEX_AI_TIMEOUT_MS:latest"
  ["api-debtors"]="DATABASE_URL_DEBTORS SERVICE_KEY_DEBTORS DEBTORS_DOCUMENTS_BUCKET=DEBTORS_DOCUMENTS_BUCKET:latest"
  ["api-transactions"]="DATABASE_URL_TRANSACTIONS SERVICE_KEY_TRANSACTIONS STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest"
  ["api-communications"]="DATABASE_URL_COMMUNICATIONS SERVICE_KEY_COMMUNICATIONS MONGODB_URI=MONGODB_URI:latest,SENDGRID_API_KEY=SENDGRID_API_KEY:latest,SENDGRID_WEBHOOK_PUBLIC_KEY=SENDGRID_WEBHOOK_PUBLIC_KEY:latest,TWILIO_ACCOUNT_SID=TWILIO_ACCOUNT_SID:latest,TWILIO_AUTH_TOKEN=TWILIO_AUTH_TOKEN:latest,SMS_FROM_NUMBER=SMS_FROM_NUMBER:latest,EMAIL_FROM_ADDRESS=EMAIL_FROM_ADDRESS:latest,EMAIL_FROM_NAME=EMAIL_FROM_NAME:latest,ACTIVATION_BASE_URL=ACTIVATION_BASE_URL:latest,PASSWORD_RESET_BASE_URL=PASSWORD_RESET_BASE_URL:latest"
  ["api-collectors"]="DATABASE_URL_COLLECTORS SERVICE_KEY_COLLECTORS MONGODB_URI=MONGODB_URI:latest"
  ["api-voice"]="DATABASE_URL_VOICE SERVICE_KEY_VOICE MONGODB_URI=MONGODB_URI:latest,TWILIO_VOICE_ACCOUNT_SID=TWILIO_VOICE_ACCOUNT_SID:latest,TWILIO_VOICE_AUTH_TOKEN=TWILIO_VOICE_AUTH_TOKEN:latest,TWILIO_VOICE_API_KEY_SID=TWILIO_VOICE_API_KEY_SID:latest,TWILIO_VOICE_API_KEY_SECRET=TWILIO_VOICE_API_KEY_SECRET:latest,TWILIO_VOICE_OUTGOING_APP_SID=TWILIO_VOICE_OUTGOING_APP_SID:latest,TWILIO_VOICE_NUMBER=TWILIO_VOICE_NUMBER:latest,API_VOICE_ENCRYPTION_KEY=API_VOICE_ENCRYPTION_KEY:latest"
  ["api-workflows"]="DATABASE_URL_WORKFLOWS SERVICE_KEY_WORKFLOWS BULLMQ_REDIS_HOST=BULLMQ_REDIS_HOST:latest,BULLMQ_REDIS_PORT=BULLMQ_REDIS_PORT:latest,BULLMQ_REDIS_DB=BULLMQ_REDIS_DB:latest"
  ["api-automations"]="DATABASE_URL_AUTOMATIONS SERVICE_KEY_AUTOMATIONS DOCUMENT_AI_PROCESSOR_ID=DOCUMENT_AI_PROCESSOR_ID:latest,DOCUMENT_AI_LOCATION=DOCUMENT_AI_LOCATION:latest,DOCUMENT_AI_ENABLED=DOCUMENT_AI_ENABLED:latest,DOCUMENT_AI_TIMEOUT_MS=DOCUMENT_AI_TIMEOUT_MS:latest"
  ["api-analytics"]="DATABASE_URL_ANALYTICS SERVICE_KEY_ANALYTICS"
  ["api-audits"]="DATABASE_URL_AUDITS SERVICE_KEY_AUDITS"
)

# Service-specific environment variables (non-secrets)
declare -A SERVICE_ENV_VARS=(
  ["api-voice"]="APP_URL=https://api.staging.verichroninc.com"
)

# Service-specific resource configurations (memory/CPU/timeout vpc_egress)
declare -A SERVICE_RESOURCES=(
  ["api-communications"]="1Gi 2 900 private-ranges-only"
)

# Validate service name
if [[ -z "$SERVICE" ]]; then
  echo "=============================================="
  echo "Deploy Single API Service"
  echo "=============================================="
  echo ""
  echo "Usage:"
  echo "  ./scripts/deploy-single-staging.sh <service-name>"
  echo "  ./scripts/deploy-single-staging.sh <service-name> --skip-build"
  echo "  ./scripts/deploy-single-staging.sh <service-name> --yes"
  echo ""
  echo "Available services:"
  for SVC in "${!SERVICE_CONFIGS[@]}"; do
    echo "  - $SVC"
  done | sort
  exit 1
fi

if [[ -z "${SERVICE_CONFIGS[$SERVICE]}" ]]; then
  echo "Error: Unknown service '$SERVICE'"
  echo ""
  echo "Available services:"
  for SVC in "${!SERVICE_CONFIGS[@]}"; do
    echo "  - $SVC"
  done | sort
  exit 1
fi

# Parse service config
CONFIG="${SERVICE_CONFIGS[$SERVICE]}"
DB_SECRET_NAME=$(echo "$CONFIG" | awk '{print $1}')
SERVICE_KEY=$(echo "$CONFIG" | awk '{print $2}')
ADDITIONAL_SECRETS=$(echo "$CONFIG" | cut -d' ' -f3-)

# Build full secrets string
SECRETS_STRING="$COMMON_SECRETS,DATABASE_URL=${DB_SECRET_NAME}:latest,${SERVICE_KEY}=${SERVICE_KEY}:latest"
if [[ -n "$ADDITIONAL_SECRETS" && "$ADDITIONAL_SECRETS" != "$SERVICE_KEY" ]]; then
  SECRETS_STRING="${SECRETS_STRING},${ADDITIONAL_SECRETS}"
fi

# Build environment variables string
ENV_VARS_STRING="NODE_ENV=staging,LOG_LEVEL=info"
if [[ -n "${SERVICE_ENV_VARS[$SERVICE]}" ]]; then
  ENV_VARS_STRING="${ENV_VARS_STRING},${SERVICE_ENV_VARS[$SERVICE]}"
fi

# Get resource config
if [[ -n "${SERVICE_RESOURCES[$SERVICE]}" ]]; then
  RESOURCE_CONFIG="${SERVICE_RESOURCES[$SERVICE]}"
  MEMORY=$(echo "$RESOURCE_CONFIG" | awk '{print $1}')
  CPU=$(echo "$RESOURCE_CONFIG" | awk '{print $2}')
  TIMEOUT=$(echo "$RESOURCE_CONFIG" | awk '{print $3}')
  VPC_EGRESS=$(echo "$RESOURCE_CONFIG" | awk '{print $4}')
else
  MEMORY="512Mi"
  CPU="1"
  TIMEOUT="300"
  VPC_EGRESS="private-ranges-only"
fi

echo "=============================================="
echo "Deploy: $SERVICE"
echo "=============================================="
echo ""
echo "Target: ${SERVICE}-staging"
echo "Region: $REGION"
echo "Project: $PROJECT_ID"
echo ""
echo "Resources:"
echo "  Memory:  $MEMORY"
echo "  CPU:     $CPU"
echo "  Timeout: ${TIMEOUT}s"
echo ""
echo "=============================================="
echo "Secrets Preview"
echo "=============================================="
echo ""

# Fetch all secret names in one API call
GCP_SECRETS=$(gcloud secrets list --project="$PROJECT_ID" --format="value(name)" 2>/dev/null || echo "")

check_secret() {
  echo "$GCP_SECRETS" | grep -qx "$1"
}

# Parse and display secrets with validation
echo "Common Secrets:"
IFS=',' read -ra COMMON_ARRAY <<< "$COMMON_SECRETS"
MISSING_SECRETS=0
for SECRET_PAIR in "${COMMON_ARRAY[@]}"; do
  SECRET_NAME=$(echo "$SECRET_PAIR" | cut -d'=' -f2 | cut -d':' -f1)
  if check_secret "$SECRET_NAME"; then
    echo "  [OK] $SECRET_NAME"
  else
    echo "  [MISSING] $SECRET_NAME"
    MISSING_SECRETS=$((MISSING_SECRETS + 1))
  fi
done

echo ""
echo "Service-Specific Secrets:"
echo "  Database: $DB_SECRET_NAME"
if check_secret "$DB_SECRET_NAME"; then
  echo "    [OK]"
else
  echo "    [MISSING]"
  MISSING_SECRETS=$((MISSING_SECRETS + 1))
fi

echo "  Service Key: $SERVICE_KEY"
if check_secret "$SERVICE_KEY"; then
  echo "    [OK]"
else
  echo "    [MISSING]"
  MISSING_SECRETS=$((MISSING_SECRETS + 1))
fi

if [[ -n "$ADDITIONAL_SECRETS" && "$ADDITIONAL_SECRETS" != "$SERVICE_KEY" ]]; then
  echo ""
  echo "Additional Secrets:"
  IFS=',' read -ra ADDITIONAL_ARRAY <<< "$ADDITIONAL_SECRETS"
  for SECRET_PAIR in "${ADDITIONAL_ARRAY[@]}"; do
    SECRET_NAME=$(echo "$SECRET_PAIR" | cut -d'=' -f2 | cut -d':' -f1)
    if check_secret "$SECRET_NAME"; then
      echo "  [OK] $SECRET_NAME"
    else
      echo "  [MISSING] $SECRET_NAME"
      MISSING_SECRETS=$((MISSING_SECRETS + 1))
    fi
  done
fi

echo ""

if [[ $MISSING_SECRETS -gt 0 ]]; then
  echo "WARNING: $MISSING_SECRETS secret(s) are missing in GCP Secret Manager"
  echo "The deployment may fail or the service may not work correctly."
  echo ""
fi

# Confirmation
if [[ "$AUTO_CONFIRM" == false ]]; then
  echo "=============================================="
  if [[ "$SKIP_BUILD" == true ]]; then
    echo "This will deploy $SERVICE using the existing image."
  else
    echo "This will build and deploy $SERVICE."
  fi
  echo "=============================================="
  echo ""
  read -p "Proceed with deployment? (y/n): " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Deployment cancelled."
    exit 0
  fi
fi

echo ""

# Build Docker image
if [[ "$SKIP_BUILD" == false ]]; then
  echo "=============================================="
  echo "Building Docker Image"
  echo "=============================================="
  echo ""

  if docker build \
    -f apps/${SERVICE}/Dockerfile.e2e \
    -t ${REGISTRY}/${SERVICE}:latest \
    . 2>&1 | tail -10; then
    echo ""
    echo "Build successful"
  else
    echo ""
    echo "Build failed"
    exit 1
  fi

  echo ""
  echo "=============================================="
  echo "Pushing to Artifact Registry"
  echo "=============================================="
  echo ""

  if docker push ${REGISTRY}/${SERVICE}:latest 2>&1 | tail -5; then
    echo ""
    echo "Push successful"
  else
    echo ""
    echo "Push failed"
    exit 1
  fi
fi

echo ""
echo "=============================================="
echo "Deploying to Cloud Run"
echo "=============================================="
echo ""

if gcloud run deploy ${SERVICE}-staging \
  --image=${REGISTRY}/${SERVICE}:latest \
  --platform=managed \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --min-instances=0 \
  --max-instances=10 \
  --memory=${MEMORY} \
  --cpu=${CPU} \
  --timeout=${TIMEOUT} \
  --vpc-connector=${VPC_CONNECTOR} \
  --vpc-egress=${VPC_EGRESS} \
  --add-cloudsql-instances=${CLOUD_SQL_INSTANCE} \
  --set-env-vars="$ENV_VARS_STRING" \
  --set-secrets="$SECRETS_STRING" \
  --allow-unauthenticated \
  --quiet 2>&1 | tail -15; then

  # Get service URL
  SERVICE_URL=$(gcloud run services describe ${SERVICE}-staging \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --format="value(status.url)" 2>/dev/null)

  echo ""
  echo "=============================================="
  echo "Deployment Successful!"
  echo "=============================================="
  echo ""
  echo "Service: ${SERVICE}-staging"
  echo "URL: $SERVICE_URL"
  echo ""
  echo "Verify with:"
  echo "  curl $SERVICE_URL/health"
else
  echo ""
  echo "=============================================="
  echo "Deployment Failed"
  echo "=============================================="
  echo ""
  echo "Check logs with:"
  echo "  gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE}-staging\" \\"
  echo "    --project=$PROJECT_ID --limit=50 --format=\"value(textPayload)\" --freshness=5m"
  exit 1
fi
