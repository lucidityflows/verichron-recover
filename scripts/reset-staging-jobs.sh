#!/usr/bin/env bash

# ==============================================================================
# Verichron - Reset Staging Data via Cloud Run Jobs
# ==============================================================================
# Resets database data for staging by running Cloud Run Jobs.
# No local Cloud SQL Proxy required - runs entirely in GCP.
#
# Usage:
#   ./scripts/reset-staging-jobs.sh              # Reset all services
#   ./scripts/reset-staging-jobs.sh api-users    # Reset single service
#   ./scripts/reset-staging-jobs.sh --list       # List available services
#
# Prerequisites:
#   - Services must be deployed (images exist in Artifact Registry)
#   - reset-database.ts must be compiled into the image
# ==============================================================================

set -e

PROJECT_ID="verichron-recover-staging"
REGION="us-central1"
REGISTRY="us-central1-docker.pkg.dev/${PROJECT_ID}/verichron-staging"
VPC_CONNECTOR="verirchron-connector"
CLOUD_SQL_INSTANCE="verichron-recover-staging:us-central1:verichron-recover"

# Service configurations: service_name -> "db_secret_name"
declare -A SERVICE_DB_SECRETS=(
  ["api-users"]="DATABASE_URL_USERS"
  ["api-organizations"]="DATABASE_URL_ORGANIZATIONS"
  ["api-debts"]="DATABASE_URL_DEBTS"
  ["api-debtors"]="DATABASE_URL_DEBTORS"
  ["api-transactions"]="DATABASE_URL_TRANSACTIONS"
  ["api-communications"]="DATABASE_URL_COMMUNICATIONS"
  ["api-collectors"]="DATABASE_URL_COLLECTORS"
  ["api-voice"]="DATABASE_URL_VOICE"
  ["api-workflows"]="DATABASE_URL_WORKFLOWS"
  ["api-automations"]="DATABASE_URL_AUTOMATIONS"
  ["api-analytics"]="DATABASE_URL_ANALYTICS"
  ["api-audits"]="DATABASE_URL_AUDITS"
)

# Order matters for foreign key dependencies
SERVICES_ORDER=(
  "api-audits"
  "api-analytics"
  "api-automations"
  "api-workflows"
  "api-voice"
  "api-collectors"
  "api-communications"
  "api-transactions"
  "api-debtors"
  "api-debts"
  "api-organizations"
  "api-users"
)

reset_service() {
  local SERVICE=$1
  local DB_SECRET="${SERVICE_DB_SECRETS[$SERVICE]}"
  local JOB_NAME="${SERVICE}-reset-staging"

  echo ""
  echo "=============================================="
  echo "Resetting: $SERVICE"
  echo "=============================================="

  # Check if image exists
  if ! gcloud artifacts docker images describe "${REGISTRY}/${SERVICE}:latest" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "WARNING: Image not found for $SERVICE. Skipping."
    echo "Deploy the service first: ./scripts/deploy-single-staging.sh $SERVICE"
    return 1
  fi

  echo "Creating Cloud Run Job: $JOB_NAME"

  # Create or update the job
  gcloud run jobs deploy "$JOB_NAME" \
    --image="${REGISTRY}/${SERVICE}:latest" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --tasks=1 \
    --max-retries=0 \
    --memory=512Mi \
    --cpu=1 \
    --task-timeout=300s \
    --vpc-connector="$VPC_CONNECTOR" \
    --vpc-egress=private-ranges-only \
    --set-cloudsql-instances="$CLOUD_SQL_INSTANCE" \
    --set-env-vars="NODE_ENV=staging" \
    --set-secrets="DATABASE_URL=${DB_SECRET}:latest" \
    --command="node" \
    --args="dist/src/scripts/reset-database.js" \
    --quiet 2>&1 | tail -5

  echo "Executing job..."

  # Execute the job
  EXECUTION=$(gcloud run jobs execute "$JOB_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(metadata.name)" 2>/dev/null)

  if [[ -z "$EXECUTION" ]]; then
    echo "FAILED: Could not start job execution"
    return 1
  fi

  echo "Execution: $EXECUTION"
  echo "Waiting for completion..."

  # Wait for completion with timeout
  local TIMEOUT=60
  local ELAPSED=0

  while [[ $ELAPSED -lt $TIMEOUT ]]; do
    STATUS=$(gcloud run jobs executions describe "$EXECUTION" \
      --region="$REGION" \
      --project="$PROJECT_ID" \
      --format="value(status.conditions[0].type,status.conditions[0].status)" 2>/dev/null)

    TYPE=$(echo "$STATUS" | cut -f1)
    STATE=$(echo "$STATUS" | cut -f2)

    if [[ "$TYPE" == "Completed" && "$STATE" == "True" ]]; then
      echo "SUCCESS: $SERVICE database reset complete"
      return 0
    elif [[ "$TYPE" == "Completed" && "$STATE" == "False" ]]; then
      echo "FAILED: $SERVICE database reset failed"
      echo ""
      echo "Logs:"
      gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=$JOB_NAME" \
        --project="$PROJECT_ID" \
        --limit=20 \
        --format="value(textPayload)" \
        --freshness=5m 2>/dev/null | head -20
      return 1
    fi

    sleep 3
    ELAPSED=$((ELAPSED + 3))
    echo -n "."
  done

  echo ""
  echo "TIMEOUT: Job did not complete within ${TIMEOUT}s"
  return 1
}

# Main execution
if [[ "$1" == "--list" ]]; then
  echo "Available services:"
  for SERVICE in "${SERVICES_ORDER[@]}"; do
    echo "  - $SERVICE"
  done
  exit 0
fi

if [[ -n "$1" && "$1" != "--all" ]]; then
  # Reset single service
  SERVICE="$1"
  if [[ -z "${SERVICE_DB_SECRETS[$SERVICE]}" ]]; then
    echo "Error: Unknown service '$SERVICE'"
    echo "Run with --list to see available services"
    exit 1
  fi

  reset_service "$SERVICE"
  exit $?
fi

# Reset all services
echo "=============================================="
echo "STAGING DATA RESET (Cloud Run Jobs)"
echo "=============================================="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""
echo "This will reset ALL staging databases."
echo "Schema and migrations will be preserved."
echo ""

read -p "Are you sure you want to proceed? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

SUCCESS_COUNT=0
FAILED_COUNT=0
declare -a FAILED_SERVICES

for SERVICE in "${SERVICES_ORDER[@]}"; do
  if reset_service "$SERVICE"; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    FAILED_COUNT=$((FAILED_COUNT + 1))
    FAILED_SERVICES+=("$SERVICE")
  fi
done

echo ""
echo "=============================================="
echo "RESET SUMMARY"
echo "=============================================="
echo "Successful: $SUCCESS_COUNT"
echo "Failed: $FAILED_COUNT"

if [[ $FAILED_COUNT -gt 0 ]]; then
  echo ""
  echo "Failed services:"
  for SVC in "${FAILED_SERVICES[@]}"; do
    echo "  - $SVC"
  done
  echo ""
  echo "You may need to deploy these services first."
fi

echo ""
echo "Next steps:"
echo "  1. Seed platform admin:  vops > Seeding > Seed Platform Admin"
echo "  2. Seed templates:       vops > Seeding > Seed Email Templates"
echo "  3. Seed workflows:       vops > Seeding > Seed Workflows"
