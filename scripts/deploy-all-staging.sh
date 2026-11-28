#!/usr/bin/env bash

# ==============================================================================
# Verichron Recover - Staging Deployment Script
# ==============================================================================
# Complete deployment of all 10 API microservices to Cloud Run
#
# Prerequisites:
#   - gcloud CLI authenticated with project access
#   - Docker installed and running
#   - Secret Manager configured with all required secrets
#   - Cloud SQL, Redis (Memorystore), VPC Connector already set up
#   - IAM permissions: Pub/Sub Admin, Cloud Run Admin, Secret Manager Accessor
#
# What this script does:
#   1. Creates Pub/Sub topics for event-driven architecture
#   2. Builds Docker images for each microservice (unless --skip-build)
#   3. Pushes images to Artifact Registry
#   4. Deploys to Cloud Run with all required secrets and configurations
#
# Usage:
#   ./deploy-all-staging.sh           # Full build and deploy
#   ./deploy-all-staging.sh --skip-build  # Deploy only (reuse existing images)
#
# ==============================================================================

set -e

PROJECT_ID="${PROJECT_ID:-verichron-recover-staging}"
REGION="us-central1"
REGISTRY="us-central1-docker.pkg.dev/${PROJECT_ID}/verichron-staging"
VPC_CONNECTOR="verirchron-connector"
CLOUD_SQL_INSTANCE="verichron-recover-staging:us-central1:verichron-recover"

# Parse arguments
SKIP_BUILD=false
if [[ "$1" == "--skip-build" ]]; then
  SKIP_BUILD=true
  echo "⏭️  Skipping Docker build (using existing images)"
fi

# Common secrets for all services
# NOTE: API_*_URL secrets are required for inter-service HTTP communication
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

# Service-specific resource configurations (memory/CPU/timeout)
# Format: "memory cpu timeout vpc_egress"
declare -A SERVICE_RESOURCES=(
  ["api-communications"]="1Gi 2 900 private-ranges-only"  # Needs more resources for MongoDB+PostgreSQL+Redis+Gateways
  ["api-analytics"]="1Gi 2 900 private-ranges-only"  # Heavy orchestration + PubSub access
)

echo "=========================================="
echo "🚀 Deploying All API Microservices"
echo "=========================================="
echo ""

# ============================================================================
# STEP 1: Create Pub/Sub Topics
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔔 Step 1: Creating Pub/Sub Topics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOPICS=(
  "users-v1"
  "organizations-v1"
  "debtors-v1"
  "debts-v1"
  "transactions-v1"
  "communications-v1"
  "analytics-v1"
  "orchestrations-v1"
  "collectors-v1"
  "voice-v1"
  "workflows-v1"
  "automations-v1"
  "audits-v1"
)

TOPICS_CREATED=0
TOPICS_EXISTED=0

for TOPIC in "${TOPICS[@]}"; do
  if gcloud pubsub topics describe "$TOPIC" --project="$PROJECT_ID" &>/dev/null; then
    echo "  ⏭️  Topic already exists: $TOPIC"
    TOPICS_EXISTED=$((TOPICS_EXISTED + 1))
  else
    if gcloud pubsub topics create "$TOPIC" --project="$PROJECT_ID" &>/dev/null; then
      echo "  ✅ Created topic: $TOPIC"
      TOPICS_CREATED=$((TOPICS_CREATED + 1))
    else
      echo "  ❌ Failed to create topic: $TOPIC"
    fi
  fi
done

echo ""
echo "✅ Pub/Sub setup complete: $TOPICS_CREATED created, $TOPICS_EXISTED existed"
echo ""

# ============================================================================
# STEP 2: Deploy Services
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚢 Step 2: Deploying Cloud Run Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0
declare -a FAILED_SERVICES

for SERVICE in "${!SERVICE_CONFIGS[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Processing: $SERVICE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Parse service config
  CONFIG="${SERVICE_CONFIGS[$SERVICE]}"
  DB_SECRET_NAME=$(echo "$CONFIG" | awk '{print $1}')
  SERVICE_KEY=$(echo "$CONFIG" | awk '{print $2}')
  ADDITIONAL_SECRETS=$(echo "$CONFIG" | cut -d' ' -f3-)

  # Build full secrets string - map DATABASE_URL to service-specific secret
  SECRETS_STRING="$COMMON_SECRETS,DATABASE_URL=${DB_SECRET_NAME}:latest,${SERVICE_KEY}=${SERVICE_KEY}:latest"
  if [[ -n "$ADDITIONAL_SECRETS" && "$ADDITIONAL_SECRETS" != "$SERVICE_KEY" ]]; then
    SECRETS_STRING="${SECRETS_STRING},${ADDITIONAL_SECRETS}"
  fi

  # Build environment variables string (combine common + service-specific)
  ENV_VARS_STRING="NODE_ENV=staging,LOG_LEVEL=info"
  if [[ -n "${SERVICE_ENV_VARS[$SERVICE]}" ]]; then
    ENV_VARS_STRING="${ENV_VARS_STRING},${SERVICE_ENV_VARS[$SERVICE]}"
  fi

  # Build Docker image (unless skipped)
  if [[ "$SKIP_BUILD" == false ]]; then
    echo "🔨 Building Docker image..."
    if docker build \
      -f apps/${SERVICE}/Dockerfile.e2e \
      -t ${REGISTRY}/${SERVICE}:latest \
      . 2>&1 | tail -5; then
      echo "   ✅ Build successful"
    else
      echo "   ❌ Build failed"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      FAILED_SERVICES+=("$SERVICE (build)")
      continue
    fi

    echo "⬆️  Pushing to Artifact Registry..."
    if docker push ${REGISTRY}/${SERVICE}:latest 2>&1 | tail -3; then
      echo "   ✅ Push successful"
    else
      echo "   ❌ Push failed"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      FAILED_SERVICES+=("$SERVICE (push)")
      continue
    fi
  fi

  # Get service-specific resources or use defaults
  if [[ -n "${SERVICE_RESOURCES[$SERVICE]}" ]]; then
    RESOURCE_CONFIG="${SERVICE_RESOURCES[$SERVICE]}"
    MEMORY=$(echo "$RESOURCE_CONFIG" | awk '{print $1}')
    CPU=$(echo "$RESOURCE_CONFIG" | awk '{print $2}')
    TIMEOUT=$(echo "$RESOURCE_CONFIG" | awk '{print $3}')
    VPC_EGRESS=$(echo "$RESOURCE_CONFIG" | awk '{print $4}')
    echo "   📊 Using custom resources: ${MEMORY} RAM, ${CPU} CPU, ${TIMEOUT}s timeout, ${VPC_EGRESS} egress"
  else
    MEMORY="512Mi"
    CPU="1"
    TIMEOUT="300"
    VPC_EGRESS="private-ranges-only"
  fi

  # Deploy to Cloud Run
  echo "🚀 Deploying to Cloud Run..."
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
    --quiet 2>&1 | tail -10; then

    # Get service URL
    SERVICE_URL=$(gcloud run services describe ${SERVICE}-staging \
      --region=${REGION} \
      --project=${PROJECT_ID} \
      --format="value(status.url)" 2>/dev/null)

    echo "   ✅ Deployment successful!"
    echo "   🔗 URL: $SERVICE_URL"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "   ❌ Deployment failed"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_SERVICES+=("$SERVICE (deploy)")

    # Show last few log lines
    echo "   📋 Recent logs:"
    gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE}-staging" \
      --project=${PROJECT_ID} \
      --limit=5 \
      --format="value(textPayload)" \
      --freshness=2m 2>/dev/null | grep -E "ERROR|error|Error" | head -3 || echo "   (no error logs found)"
  fi

  echo ""
done

echo ""
echo "=========================================="
echo "📊 Deployment Summary"
echo "=========================================="
echo ""
echo "🔔 Pub/Sub Topics:"
echo "   Created: $TOPICS_CREATED"
echo "   Already existed: $TOPICS_EXISTED"
echo ""
echo "🚢 Cloud Run Services:"
echo "   ✅ Successful: $SUCCESS_COUNT services"
echo "   ❌ Failed: $FAIL_COUNT services"

if [[ $FAIL_COUNT -gt 0 ]]; then
  echo ""
  echo "Failed services:"
  for svc in "${FAILED_SERVICES[@]}"; do
    echo "  - $svc"
  done
  echo ""
  echo "💡 To check logs for a failed service:"
  echo "   gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=SERVICE-NAME-staging\" \\"
  echo "     --project=$PROJECT_ID --limit=50 --format=\"value(textPayload)\" --freshness=10m"
  exit 1
else
  echo ""
  echo "🎉 All services deployed successfully!"
fi

echo ""
echo "🔍 Check all service status:"
echo "   gcloud run services list --region=$REGION --project=$PROJECT_ID"
echo ""
