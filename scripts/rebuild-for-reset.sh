#!/usr/bin/env bash

# ==============================================================================
# Quick Rebuild for Reset Scripts
# ==============================================================================
# Rebuilds and deploys all services to include the new reset-database.ts scripts.
# This is a one-time operation needed after adding the reset scripts.
# ==============================================================================

set -e

PROJECT_ID="verichron-recover-staging"
REGION="us-central1"
REGISTRY="us-central1-docker.pkg.dev/${PROJECT_ID}/verichron-staging"

SERVICES=(
  "api-users"
  "api-organizations"
  "api-debts"
  "api-debtors"
  "api-transactions"
  "api-communications"
  "api-collectors"
  "api-voice"
  "api-workflows"
  "api-automations"
  "api-analytics"
  "api-audits"
)

echo "=============================================="
echo "Rebuilding Services with Reset Scripts"
echo "=============================================="
echo ""
echo "This will rebuild and push all 12 services."
echo "Cloud Run deploy will be skipped (images only)."
echo ""

read -p "Proceed? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

SUCCESS=0
FAILED=0

for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "--- Building: $SERVICE ---"

  if docker build \
    -f apps/${SERVICE}/Dockerfile.e2e \
    -t ${REGISTRY}/${SERVICE}:latest \
    . 2>&1 | tail -3; then

    echo "Pushing..."
    if docker push ${REGISTRY}/${SERVICE}:latest 2>&1 | tail -2; then
      echo "OK: $SERVICE"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "PUSH FAILED: $SERVICE"
      FAILED=$((FAILED + 1))
    fi
  else
    echo "BUILD FAILED: $SERVICE"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=============================================="
echo "Summary: $SUCCESS succeeded, $FAILED failed"
echo "=============================================="
echo ""
echo "Images updated. Reset scripts are now available."
echo ""
echo "To reset databases:"
echo "  node scripts/vops.js"
echo "  Database > RESET ALL Staging Data"
