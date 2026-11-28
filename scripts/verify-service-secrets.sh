#!/usr/bin/env bash

# ==============================================================================
# Verichron - Verify Service Secrets
# ==============================================================================
# Compares expected secrets for a Cloud Run service against what's deployed.
# Shows which secrets are configured, missing, or mismatched.
#
# Usage:
#   ./scripts/verify-service-secrets.sh <service-name>
#   ./scripts/verify-service-secrets.sh api-users
#   ./scripts/verify-service-secrets.sh --all
# ==============================================================================

set -e

PROJECT_ID="verichron-recover-staging"
REGION="us-central1"

# Service configurations: service_name -> "db_secret_name service_key additional_secrets"
# Must match deploy-all-staging.sh exactly
declare -A SERVICE_CONFIGS=(
  ["api-users"]="DATABASE_URL_USERS SERVICE_KEY_USERS"
  ["api-organizations"]="DATABASE_URL_ORGANIZATIONS SERVICE_KEY_ORGANIZATIONS"
  ["api-debts"]="DATABASE_URL_DEBTS SERVICE_KEY_DEBTS DOCUMENT_AI_PROCESSOR_ID,DOCUMENT_AI_LOCATION,DOCUMENT_AI_ENABLED,DOCUMENT_AI_TIMEOUT_MS,VERTEX_AI_ENABLED,VERTEX_AI_MODEL,VERTEX_AI_LOCATION,VERTEX_AI_TIMEOUT_MS"
  ["api-debtors"]="DATABASE_URL_DEBTORS SERVICE_KEY_DEBTORS DEBTORS_DOCUMENTS_BUCKET"
  ["api-transactions"]="DATABASE_URL_TRANSACTIONS SERVICE_KEY_TRANSACTIONS STRIPE_SECRET_KEY,STRIPE_PUBLISHABLE_KEY,STRIPE_WEBHOOK_SECRET"
  ["api-communications"]="DATABASE_URL_COMMUNICATIONS SERVICE_KEY_COMMUNICATIONS MONGODB_URI,SENDGRID_API_KEY,SENDGRID_WEBHOOK_PUBLIC_KEY,TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN,SMS_FROM_NUMBER,EMAIL_FROM_ADDRESS,EMAIL_FROM_NAME,ACTIVATION_BASE_URL,PASSWORD_RESET_BASE_URL"
  ["api-collectors"]="DATABASE_URL_COLLECTORS SERVICE_KEY_COLLECTORS MONGODB_URI"
  ["api-voice"]="DATABASE_URL_VOICE SERVICE_KEY_VOICE MONGODB_URI,TWILIO_VOICE_ACCOUNT_SID,TWILIO_VOICE_AUTH_TOKEN,TWILIO_VOICE_API_KEY_SID,TWILIO_VOICE_API_KEY_SECRET,TWILIO_VOICE_OUTGOING_APP_SID,TWILIO_VOICE_NUMBER,API_VOICE_ENCRYPTION_KEY"
  ["api-workflows"]="DATABASE_URL_WORKFLOWS SERVICE_KEY_WORKFLOWS BULLMQ_REDIS_HOST,BULLMQ_REDIS_PORT,BULLMQ_REDIS_DB"
  ["api-automations"]="DATABASE_URL_AUTOMATIONS SERVICE_KEY_AUTOMATIONS DOCUMENT_AI_PROCESSOR_ID,DOCUMENT_AI_LOCATION,DOCUMENT_AI_ENABLED,DOCUMENT_AI_TIMEOUT_MS"
  ["api-analytics"]="DATABASE_URL_ANALYTICS SERVICE_KEY_ANALYTICS"
  ["api-audits"]="DATABASE_URL_AUDITS SERVICE_KEY_AUDITS"
)

# Common secrets for all services
COMMON_SECRETS="REDIS_URL,REDIS_HOST,REDIS_PORT,JWT_SECRET,JWT_REFRESH_SECRET,JWT_ACCESS_TOKEN_EXPIRES_IN,JWT_REFRESH_TOKEN_EXPIRES_IN,AUTH_CONTEXT_TOKEN_SECRET,GCP_PROJECT_ID,GCP_LOCATION,PUBSUB_PROJECT_ID,API_USERS_URL,API_ORGANIZATIONS_URL,API_DEBTS_URL,API_DEBTORS_URL,API_TRANSACTIONS_URL,API_COMMUNICATIONS_URL,API_COLLECTORS_URL,API_VOICE_URL,API_WORKFLOWS_URL,API_AUTOMATIONS_URL,API_ANALYTICS_URL,API_AUDITS_URL"

verify_service() {
  local SERVICE=$1
  local CLOUD_RUN_NAME="${SERVICE}-staging"

  echo "=============================================="
  echo "Verifying: $SERVICE"
  echo "=============================================="
  echo ""

  # Check if service exists
  if ! gcloud run services describe "$CLOUD_RUN_NAME" --region="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "ERROR: Service '$CLOUD_RUN_NAME' not found in Cloud Run"
    echo ""
    return 1
  fi

  # Get deployed secrets
  local DEPLOYED_SECRETS
  DEPLOYED_SECRETS=$(gcloud run services describe "$CLOUD_RUN_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="yaml(spec.template.spec.containers[0].env)" 2>/dev/null | \
    grep -E "name:|secretKeyRef:" | \
    grep -B1 "secretKeyRef" | \
    grep "name:" | \
    awk '{print $2}' | \
    sort -u)

  # Get expected secrets for this service
  local CONFIG="${SERVICE_CONFIGS[$SERVICE]}"
  local DB_SECRET=$(echo "$CONFIG" | awk '{print $1}')
  local SERVICE_KEY=$(echo "$CONFIG" | awk '{print $2}')
  local ADDITIONAL=$(echo "$CONFIG" | cut -d' ' -f3-)

  # Build expected secrets list
  local EXPECTED_SECRETS="$COMMON_SECRETS,$DB_SECRET,$SERVICE_KEY"
  if [[ -n "$ADDITIONAL" ]]; then
    EXPECTED_SECRETS="$EXPECTED_SECRETS,$ADDITIONAL"
  fi

  # Convert to array
  IFS=',' read -ra EXPECTED_ARRAY <<< "$EXPECTED_SECRETS"

  local MISSING=0
  local OK=0

  echo "Expected Secrets:"
  echo ""

  for SECRET in "${EXPECTED_ARRAY[@]}"; do
    # Check if secret exists in GCP
    local GCP_EXISTS=false
    if gcloud secrets describe "$SECRET" --project="$PROJECT_ID" >/dev/null 2>&1; then
      GCP_EXISTS=true
    fi

    # Check if secret is deployed to service
    local DEPLOYED=false
    if echo "$DEPLOYED_SECRETS" | grep -q "^${SECRET}$"; then
      DEPLOYED=true
    fi

    # Also check if the env var exists (some secrets map to different env var names)
    # e.g., DATABASE_URL_USERS secret maps to DATABASE_URL env var

    if [[ "$GCP_EXISTS" == true && "$DEPLOYED" == true ]]; then
      echo "  [OK] $SECRET"
      OK=$((OK + 1))
    elif [[ "$GCP_EXISTS" == true && "$DEPLOYED" == false ]]; then
      echo "  [MISSING IN DEPLOY] $SECRET - exists in GCP but not configured for this service"
      MISSING=$((MISSING + 1))
    elif [[ "$GCP_EXISTS" == false ]]; then
      echo "  [NOT IN GCP] $SECRET - secret doesn't exist in Secret Manager"
      MISSING=$((MISSING + 1))
    fi
  done

  echo ""
  echo "Summary: $OK OK, $MISSING issues"
  echo ""

  if [[ $MISSING -gt 0 ]]; then
    return 1
  fi
  return 0
}

# Make scripts executable
chmod +x ./scripts/view-secret.sh 2>/dev/null || true

if [[ -z "$1" ]]; then
  echo "=============================================="
  echo "Verify Service Secrets"
  echo "=============================================="
  echo ""
  echo "Usage:"
  echo "  ./scripts/verify-service-secrets.sh <service-name>"
  echo "  ./scripts/verify-service-secrets.sh --all"
  echo ""
  echo "Available services:"
  for SERVICE in "${!SERVICE_CONFIGS[@]}"; do
    echo "  - $SERVICE"
  done | sort
  exit 1
fi

if [[ "$1" == "--all" ]]; then
  FAILED=0
  for SERVICE in "${!SERVICE_CONFIGS[@]}"; do
    if ! verify_service "$SERVICE"; then
      FAILED=$((FAILED + 1))
    fi
  done

  echo "=============================================="
  echo "Overall Summary"
  echo "=============================================="
  if [[ $FAILED -gt 0 ]]; then
    echo "$FAILED service(s) have secret configuration issues"
    exit 1
  else
    echo "All services have correct secret configuration"
    exit 0
  fi
else
  SERVICE="$1"
  if [[ -z "${SERVICE_CONFIGS[$SERVICE]}" ]]; then
    echo "Error: Unknown service '$SERVICE'"
    echo ""
    echo "Available services:"
    for SVC in "${!SERVICE_CONFIGS[@]}"; do
      echo "  - $SVC"
    done | sort
    exit 1
  fi

  verify_service "$SERVICE"
fi
