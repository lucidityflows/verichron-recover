#!/bin/bash
# Deploy Extra UIs (Ops, Collectors) to Cloud Run to bypass Backend Bucket quota
# Usage: ./scripts/deploy-extra-uis-cloudrun.sh [project_id]

set -e

PROJECT_ID="${1:-verichron-recover-staging}"
REGION="us-central1"
REGISTRY="us-central1-docker.pkg.dev/${PROJECT_ID}/verichron-staging"

# Domain Configuration
DOMAIN_SUFFIX="staging.verichroninc.com"
API_BASE_URL="https://api.${DOMAIN_SUFFIX}"
AUTH_DOMAIN="auth.${DOMAIN_SUFFIX}"
APP_DOMAIN="app.${DOMAIN_SUFFIX}"
COLLECT_DOMAIN="collect.${DOMAIN_SUFFIX}"
OPS_DOMAIN="ops.${DOMAIN_SUFFIX}"

echo "=================================================="
echo "Deploying Extra UIs to Cloud Run"
echo "Project: ${PROJECT_ID}"
echo "Apps: ui-ops, ui-collectors"
echo "=================================================="

# Env vars for build
export VITE_API_USERS_URL="${API_BASE_URL}"
export VITE_API_ORGANIZATIONS_URL="${API_BASE_URL}"
export VITE_API_DEBTS_URL="${API_BASE_URL}"
export VITE_API_DEBTORS_URL="${API_BASE_URL}"
export VITE_API_TRANSACTIONS_URL="${API_BASE_URL}"
export VITE_API_COMMUNICATIONS_URL="${API_BASE_URL}"
export VITE_API_COLLECTORS_URL="${API_BASE_URL}"
export VITE_API_VOICE_URL="${API_BASE_URL}"
export VITE_API_WORKFLOWS_URL="${API_BASE_URL}"
export VITE_API_AUDITS_URL="${API_BASE_URL}"

export VITE_DASHBOARD_MANAGERS_URL="https://${APP_DOMAIN}"
export VITE_DASHBOARD_COLLECTORS_URL="https://${COLLECT_DOMAIN}"
export VITE_DASHBOARD_OPS_URL="https://${OPS_DOMAIN}"
export VITE_AUTH_URL="https://${AUTH_DOMAIN}"

deploy_ui_container() {
  local APP_NAME=$1
  local SERVICE_NAME="${APP_NAME}-staging"
  
  echo ""
  echo "--------------------------------------------------"
  echo "Processing ${APP_NAME} -> Cloud Run: ${SERVICE_NAME}"
  echo "--------------------------------------------------"

  # Build
  echo "🔨 Building Docker image..."
  if docker build \
    -f Dockerfile.ui \
    --build-arg APP_NAME="${APP_NAME}" \
    --build-arg VITE_API_USERS_URL \
    --build-arg VITE_API_ORGANIZATIONS_URL \
    --build-arg VITE_API_DEBTS_URL \
    --build-arg VITE_API_DEBTORS_URL \
    --build-arg VITE_API_TRANSACTIONS_URL \
    --build-arg VITE_API_COMMUNICATIONS_URL \
    --build-arg VITE_API_COLLECTORS_URL \
    --build-arg VITE_API_VOICE_URL \
    --build-arg VITE_API_WORKFLOWS_URL \
    --build-arg VITE_API_AUDITS_URL \
    --build-arg VITE_DASHBOARD_MANAGERS_URL \
    --build-arg VITE_DASHBOARD_COLLECTORS_URL \
    --build-arg VITE_DASHBOARD_PLATFORM_URL \
    --build-arg VITE_AUTH_URL \
    -t "${REGISTRY}/${APP_NAME}:latest" \
    . ; then
    echo "✅ Build successful"
  else
    echo "❌ Build failed"
    exit 1
  fi

  # Push
  echo "⬆️  Pushing to Artifact Registry..."
  docker push "${REGISTRY}/${APP_NAME}:latest"

  # Deploy
  echo "🚀 Deploying to Cloud Run..."
  gcloud run deploy "${SERVICE_NAME}" \
    --image="${REGISTRY}/${APP_NAME}:latest" \
    --platform=managed \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --allow-unauthenticated \
    --port=80 \
    --min-instances=0 \
    --max-instances=5 \
    --memory=512Mi

  echo "✅ ${APP_NAME} deployed to Cloud Run."
}

# Deploy the specific apps
deploy_ui_container "ui-ops"
deploy_ui_container "ui-collectors"

echo ""
echo "=================================================="
echo "🎉 Extra UIs Deployed to Cloud Run!"
echo "=================================================="
echo "Next: Run setup-load-balancer-staging.sh to link them."
