#!/usr/bin/env bash

# ==============================================================================
# Verichron Recover - Manual Migration Trigger (Staging)
# ==============================================================================
# Manually triggers database migrations for a specific service in Staging.
# Uses Cloud Run Jobs to execute the migration safely against Cloud SQL.
#
# Usage:
#   ./scripts/migrate-staging.sh <service-name>
#
# Example:
#   ./scripts/migrate-staging.sh api-users
# ==============================================================================

set -e

SERVICE=$1

if [[ -z "$SERVICE" ]]; then
  echo "❌ Error: Service name is required."
  echo "Usage: ./scripts/migrate-staging.sh <service-name>"
  exit 1
fi

PROJECT_ID="verichron-recover-staging"
REGION="us-central1"
REGISTRY="us-central1-docker.pkg.dev/${PROJECT_ID}/verichron-staging"
VPC_CONNECTOR="verirchron-connector"
CLOUD_SQL_INSTANCE="verichron-recover-staging:us-central1:verichron-recover"

# Common secrets for all services (copied from deploy-all-staging.sh)
COMMON_SECRETS="REDIS_URL=REDIS_URL:latest,REDIS_HOST=REDIS_HOST:latest,REDIS_PORT=REDIS_PORT:latest,JWT_SECRET=JWT_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest,JWT_ACCESS_TOKEN_EXPIRES_IN=JWT_ACCESS_TOKEN_EXPIRES_IN:latest,JWT_REFRESH_TOKEN_EXPIRES_IN=JWT_REFRESH_TOKEN_EXPIRES_IN:latest,AUTH_CONTEXT_TOKEN_SECRET=AUTH_CONTEXT_TOKEN_SECRET:latest,GCP_PROJECT_ID=GCP_PROJECT_ID:latest,GCP_LOCATION=GCP_LOCATION:latest,PUBSUB_PROJECT_ID=PUBSUB_PROJECT_ID:latest"

# Service configurations: service_name -> "db_secret_name service_key additional_secrets"
declare -A SERVICE_CONFIGS=(
  ["api-users"]="DATABASE_URL_USERS SERVICE_KEY_USERS"
  ["api-organizations"]="DATABASE_URL_ORGANIZATIONS SERVICE_KEY_ORGANIZATIONS"
  ["api-debts"]="DATABASE_URL_DEBTS SERVICE_KEY_DEBTS DOCUMENT_AI_PROCESSOR_ID=DOCUMENT_AI_PROCESSOR_ID:latest,DOCUMENT_AI_LOCATION=DOCUMENT_AI_LOCATION:latest,DOCUMENT_AI_ENABLED=DOCUMENT_AI_ENABLED:latest,DOCUMENT_AI_TIMEOUT_MS=DOCUMENT_AI_TIMEOUT_MS:latest,VERTEX_AI_ENABLED=VERTEX_AI_ENABLED:latest,VERTEX_AI_MODEL=VERTEX_AI_MODEL:latest,VERTEX_AI_LOCATION=VERTEX_AI_LOCATION:latest,VERTEX_AI_TIMEOUT_MS=VERTEX_AI_TIMEOUT_MS:latest"
  ["api-debtors"]="DATABASE_URL_DEBTORS SERVICE_KEY_DEBTORS DEBTORS_DOCUMENTS_BUCKET=DEBTORS_DOCUMENTS_BUCKET:latest"
  ["api-transactions"]="DATABASE_URL_TRANSACTIONS SERVICE_KEY_TRANSACTIONS STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest"
  ["api-communications"]="DATABASE_URL_COMMUNICATIONS SERVICE_KEY_COMMUNICATIONS MONGODB_URI=MONGODB_URI:latest,SENDGRID_API_KEY=SENDGRID_API_KEY:latest,SENDGRID_WEBHOOK_PUBLIC_KEY=SENDGRID_WEBHOOK_PUBLIC_KEY:latest,TWILIO_ACCOUNT_SID=TWILIO_ACCOUNT_SID:latest,TWILIO_AUTH_TOKEN=TWILIO_AUTH_TOKEN:latest,SMS_FROM_NUMBER=SMS_FROM_NUMBER:latest,EMAIL_FROM_ADDRESS=EMAIL_FROM_ADDRESS:latest,EMAIL_FROM_NAME=EMAIL_FROM_NAME:latest"
  ["api-collectors"]="DATABASE_URL_COLLECTORS SERVICE_KEY_COLLECTORS MONGODB_URI=MONGODB_URI:latest"
  ["api-voice"]="DATABASE_URL_VOICE SERVICE_KEY_VOICE MONGODB_URI=MONGODB_URI:latest,TWILIO_VOICE_ACCOUNT_SID=TWILIO_VOICE_ACCOUNT_SID:latest,TWILIO_VOICE_AUTH_TOKEN=TWILIO_VOICE_AUTH_TOKEN:latest,TWILIO_VOICE_API_KEY_SID=TWILIO_VOICE_API_KEY_SID:latest,TWILIO_VOICE_API_KEY_SECRET=TWILIO_VOICE_API_KEY_SECRET:latest,TWILIO_VOICE_OUTGOING_APP_SID=TWILIO_VOICE_OUTGOING_APP_SID:latest,TWILIO_VOICE_NUMBER=TWILIO_VOICE_NUMBER:latest,API_VOICE_ENCRYPTION_KEY=API_VOICE_ENCRYPTION_KEY:latest"
  ["api-workflows"]="DATABASE_URL_WORKFLOWS SERVICE_KEY_WORKFLOWS BULLMQ_REDIS_HOST=BULLMQ_REDIS_HOST:latest,BULLMQ_REDIS_PORT=BULLMQ_REDIS_PORT:latest,BULLMQ_REDIS_DB=BULLMQ_REDIS_DB:latest"
  ["api-automations"]="DATABASE_URL_AUTOMATIONS SERVICE_KEY_AUTOMATIONS DOCUMENT_AI_PROCESSOR_ID=DOCUMENT_AI_PROCESSOR_ID:latest,DOCUMENT_AI_LOCATION=DOCUMENT_AI_LOCATION:latest,DOCUMENT_AI_ENABLED=DOCUMENT_AI_ENABLED:latest,DOCUMENT_AI_TIMEOUT_MS=DOCUMENT_AI_TIMEOUT_MS:latest"
  ["api-analytics"]="DATABASE_URL_ANALYTICS SERVICE_KEY_ANALYTICS"
  ["api-audits"]="DATABASE_URL_AUDITS SERVICE_KEY_AUDITS"
)

if [[ -z "${SERVICE_CONFIGS[$SERVICE]}" ]]; then
  echo "❌ Error: Unknown service '$SERVICE' or service has no database config."
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐘 Preparing Migration Job for: $SERVICE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Parse service config
CONFIG="${SERVICE_CONFIGS[$SERVICE]}"
DB_SECRET_NAME=$(echo "$CONFIG" | awk '{print $1}')
SERVICE_KEY=$(echo "$CONFIG" | awk '{print $2}')
ADDITIONAL_SECRETS=$(echo "$CONFIG" | cut -d' ' -f3-)

# Build Secrets String
SECRETS_STRING="$COMMON_SECRETS,DATABASE_URL=${DB_SECRET_NAME}:latest,${SERVICE_KEY}=${SERVICE_KEY}:latest"
if [[ -n "$ADDITIONAL_SECRETS" && "$ADDITIONAL_SECRETS" != "$SERVICE_KEY" ]]; then
  SECRETS_STRING="${SECRETS_STRING},${ADDITIONAL_SECRETS}"
fi

JOB_NAME="${SERVICE}-migration-staging"

echo "🛠️  Creating/Updating Cloud Run Job: $JOB_NAME"

# Create or Update the Job
# We use the same image as the service, but override the command.
# The command runs the compiled TypeORM CLI against the compiled datasource.
gcloud run jobs deploy "$JOB_NAME" \
  --image="${REGISTRY}/${SERVICE}:latest" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --tasks=1 \
  --max-retries=0 \
  --memory=512Mi \
  --cpu=1 \
  --vpc-connector="$VPC_CONNECTOR" \
  --vpc-egress=private-ranges-only \
  --set-cloudsql-instances="$CLOUD_SQL_INSTANCE" \
  --set-env-vars="NODE_ENV=staging,LOG_LEVEL=info" \
  --set-secrets="$SECRETS_STRING" \
  --command="node" \
  --args="./node_modules/typeorm/cli.js,migration:run,-d,dist/datasource.js" \
  --quiet

echo "✅ Job configured successfully."
echo ""
echo "🚀 Executing Migration Job..."

# Execute the job and wait for completion
EXECUTION=$(gcloud run jobs execute "$JOB_NAME" --region="$REGION" --project="$PROJECT_ID" --format="value(metadata.name)")

echo "   Job execution started: $EXECUTION"
echo "   Waiting for completion..."

# Wait for the specific execution to complete
# This can fail if the migration fails, which is what we want to report.
if gcloud run jobs executions describe "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --format="value(status.completionTime)" > /dev/null; then
    # Simple wait loop since `executions describe` doesn't block
    while true; do
        STATUS=$(gcloud run jobs executions describe "$EXECUTION" --region="$REGION" --project="$PROJECT_ID" --format="value(status.conditions[0].status)")
        if [[ "$STATUS" == "True" ]]; then
            echo "   ✅ Migration completed successfully!"
            break
        elif [[ "$STATUS" == "False" ]]; then
            echo "   ❌ Migration FAILED."
            echo "   Logs:"
            gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=$JOB_NAME" --limit=20 --format="value(textPayload)"
            exit 1
        fi
        sleep 5
    done
else
   echo "   ❌ Failed to trigger execution."
   exit 1
fi
