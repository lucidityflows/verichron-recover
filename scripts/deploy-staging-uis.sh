#!/bin/bash
# Deploy Staging UIs (Auth, Managers, Collectors) to GCS Buckets
# Usage: ./scripts/deploy-staging-uis.sh [project_id]

set -e

PROJECT_ID="${1:-verichron-recover-staging}"
REGION="us-central1"

# Ensure we are in the project root
cd "$(dirname "$0")/.."

# Domain Configuration (Staging)
DOMAIN_SUFFIX="staging.verichroninc.com"
AUTH_DOMAIN="auth.${DOMAIN_SUFFIX}"
APP_DOMAIN="app.${DOMAIN_SUFFIX}"
COLLECT_DOMAIN="collect.${DOMAIN_SUFFIX}"
OPS_DOMAIN="ops.${DOMAIN_SUFFIX}"

# API Configuration
# Assuming API Gateway pattern as per Strategy Doc
API_BASE_URL="https://api.${DOMAIN_SUFFIX}"

echo "=================================================="
echo "Deploying Staging Microfrontends"
echo "Project: ${PROJECT_ID}"
echo "Domain Suffix: ${DOMAIN_SUFFIX}"
echo "API Gateway: ${API_BASE_URL}"
echo "=================================================="

# Function to deploy an app
deploy_app() {
  local APP_NAME=$1
  local BUCKET_NAME=$2
  
  echo ""
  echo "--------------------------------------------------"
  echo "Processing ${APP_NAME} -> gs://${BUCKET_NAME}"
  echo "--------------------------------------------------"

  # Create bucket if needed
  if gsutil ls -b gs://${BUCKET_NAME} >/dev/null 2>&1; then
    echo "✅ Bucket exists."
  else
    echo "Creating bucket..."
    if ! gsutil mb -p ${PROJECT_ID} -c STANDARD -l ${REGION} gs://${BUCKET_NAME}; then
      echo "❌ Failed to create bucket gs://${BUCKET_NAME}. Check domain verification."
      return 1
    fi
  fi

  # Configure website hosting
  gsutil web set -m index.html -e index.html gs://${BUCKET_NAME}
  gsutil iam ch allUsers:objectViewer gs://${BUCKET_NAME}

  # Build
  echo "Building ${APP_NAME}..."
  cd apps/${APP_NAME}

  # Inject Environment Variables for Staging
  # We use 'cross-env' or just export them before build
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
  
  # Dashboard URLs for redirects (e.g. Auth redirects back to App)
  export VITE_DASHBOARD_MANAGERS_URL="https://${APP_DOMAIN}"
  export VITE_DASHBOARD_COLLECTORS_URL="https://${COLLECT_DOMAIN}"
  # Ops/Consumers if needed
  export VITE_DASHBOARD_OPS_URL="https://${OPS_DOMAIN}" 
  # export VITE_DASHBOARD_CONSUMERS_URL="https://portal.${DOMAIN_SUFFIX}"

  # Auth URL (needed by apps to redirect to login)
  export VITE_AUTH_URL="https://${AUTH_DOMAIN}"

  # Run generation and build
  # We skip type check (tsc) to speed up or prevent strict errors from blocking deploy if desired, 
  # but 'build' script usually includes it.
  pnpm build

  # Sync
  echo "Uploading to GCS..."
  gsutil -m rsync -R -d dist gs://${BUCKET_NAME}

  cd ../..
  echo "✅ ${APP_NAME} deployed."
}

# Deploy Apps
deploy_app "ui-auth" "${AUTH_DOMAIN}"
deploy_app "ui-managers" "${APP_DOMAIN}"
deploy_app "ui-collectors" "${COLLECT_DOMAIN}"
deploy_app "ui-ops" "${OPS_DOMAIN}"

echo ""
echo "=================================================="
echo "🎉 All Staging UIs Deployed!"
echo "=================================================="
echo "URLs:"
echo "  Auth:      http://${AUTH_DOMAIN}"
echo "  Managers:  http://${APP_DOMAIN}"
echo "  Collectors: http://${COLLECT_DOMAIN}"
echo "  Ops:       http://${OPS_DOMAIN}"
echo ""
echo "⚠️  Note: These buckets serve over HTTP by default."
echo "   For HTTPS (required for Secure Cookies in Auth), you MUST set up a Load Balancer."
