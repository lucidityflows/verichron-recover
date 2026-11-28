#!/bin/bash
# Setup GCP infrastructure for Verichron Staging environment
# Run this ONCE before deploying services
# Usage: ./scripts/setup-infrastructure-staging.sh

set -e

PROJECT="verichron-recover-staging"
REGION="us-central1"

echo "================================"
echo "Setting up Infrastructure"
echo "================================"
echo "Project: $PROJECT"
echo "Region: $REGION"
echo "================================"

# Set active project
gcloud config set project $PROJECT

echo ""
echo "========================================="
echo "1. Enabling Required APIs"
echo "========================================="
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  artifactregistry.googleapis.com \
  pubsub.googleapis.com \
  aiplatform.googleapis.com \
  documentai.googleapis.com \
  vpcaccess.googleapis.com \
  compute.googleapis.com \
  --project=$PROJECT

echo "✅ APIs enabled"

echo ""
echo "========================================="
echo "2. Creating Artifact Registry Repository"
echo "========================================="
if gcloud artifacts repositories describe verichron-staging \
  --location=$REGION \
  --project=$PROJECT &>/dev/null; then
  echo "⚠️  Repository already exists, skipping..."
else
  gcloud artifacts repositories create verichron-staging \
    --repository-format=docker \
    --location=$REGION \
    --description="Verichron Recover microservices" \
    --project=$PROJECT
  echo "✅ Artifact Registry repository created"
fi

echo ""
echo "========================================="
echo "3. Creating Cloud SQL Instance"
echo "========================================="
if gcloud sql instances describe verichron-recover \
  --project=$PROJECT &>/dev/null; then
  echo "⚠️  Cloud SQL instance already exists, skipping..."
else
  echo "Creating PostgreSQL instance (this may take 5-10 minutes)..."
  gcloud sql instances create verichron-recover \
    --database-version=POSTGRES_16 \
    --tier=db-f1-micro \
    --region=$REGION \
    --network=default \
    --enable-bin-log=false \
    --backup-start-time=03:00 \
    --backup-location=us \
    --retained-backups-count=7 \
    --project=$PROJECT

  # Generate and set password
  POSTGRES_PASS=$(openssl rand -base64 32)
  echo "Setting root password..."
  gcloud sql users set-password postgres \
    --instance=verichron-recover \
    --password="$POSTGRES_PASS" \
    --project=$PROJECT

  echo "✅ Cloud SQL instance created"
  echo "⚠️  SAVE THIS: Root password: $POSTGRES_PASS"

  # Create staging user
  STAGE_USER_PASS=$(openssl rand -base64 32)
  echo "Creating staging database user..."
  gcloud sql users create verichron_stage \
    --instance=verichron-recover \
    --password="$STAGE_USER_PASS" \
    --project=$PROJECT

  echo "✅ Staging user created"
  echo "⚠️  SAVE THIS: Staging user password: $STAGE_USER_PASS"

  # Create staging database
  echo "Creating staging database..."
  gcloud sql databases create verichron_stage_db \
    --instance=verichron-recover \
    --project=$PROJECT

  echo "✅ Staging database created"
fi

# Get connection name
CLOUD_SQL_CONNECTION=$(gcloud sql instances describe verichron-recover \
  --project=$PROJECT \
  --format='value(connectionName)')
echo "Cloud SQL Connection Name: $CLOUD_SQL_CONNECTION"

echo ""
echo "========================================="
echo "4. Creating Memorystore Redis"
echo "========================================="
if gcloud redis instances describe verichron-recover-redis \
  --region=$REGION \
  --project=$PROJECT &>/dev/null; then
  echo "⚠️  Redis instance already exists, skipping..."
else
  echo "Creating Redis instance (this may take 5-10 minutes)..."
  gcloud redis instances create verichron-recover-redis \
    --size=1 \
    --region=$REGION \
    --redis-version=redis_7_0 \
    --tier=standard \
    --project=$PROJECT

  echo "✅ Redis instance created"
fi

# Get Redis host
REDIS_HOST=$(gcloud redis instances describe verichron-recover-redis \
  --region=$REGION \
  --project=$PROJECT \
  --format='value(host)')
echo "Redis Host: $REDIS_HOST"

echo ""
echo "========================================="
echo "5. Creating GCS Buckets"
echo "========================================="

# Debtors documents bucket
if gsutil ls -p $PROJECT gs://verichron-debtors-documents-staging &>/dev/null; then
  echo "⚠️  Debtors bucket already exists, skipping..."
else
  gsutil mb -p $PROJECT \
    -c STANDARD \
    -l $REGION \
    gs://verichron-debtors-documents-staging
  echo "✅ Debtors documents bucket created"
fi

# Payments documents bucket
if gsutil ls -p $PROJECT gs://verichron-payments-docs-staging &>/dev/null; then
  echo "⚠️  Payments bucket already exists, skipping..."
else
  gsutil mb -p $PROJECT \
    -c STANDARD \
    -l $REGION \
    gs://verichron-payments-docs-staging
  echo "✅ Payments documents bucket created"
fi

echo ""
echo "========================================="
echo "6. Creating Pub/Sub Topics"
echo "========================================="

TOPICS=(
  "users-events"
  "organizations-events"
  "debts-events"
  "debtors-events"
  "transactions-events"
  "communications-events"
  "collectors-events"
  "voice-events"
  "workflows-events"
  "automations-events"
)

for TOPIC in "${TOPICS[@]}"; do
  if gcloud pubsub topics describe $TOPIC \
    --project=$PROJECT &>/dev/null; then
    echo "⚠️  Topic $TOPIC already exists, skipping..."
  else
    gcloud pubsub topics create $TOPIC \
      --project=$PROJECT
    echo "✅ Topic $TOPIC created"
  fi
done

echo ""
echo "========================================="
echo "7. Creating Secret Manager Secrets"
echo "========================================="

# Check if env-stage secret exists
if gcloud secrets describe env-stage \
  --project=$PROJECT &>/dev/null; then
  echo "⚠️  env-stage secret already exists"
  echo "To update: gcloud secrets versions add env-stage --data-file=.env.stage"
else
  if [ -f ".env.stage" ]; then
    gcloud secrets create env-stage \
      --data-file=.env.stage \
      --replication-policy="automatic" \
      --project=$PROJECT
    echo "✅ env-stage secret created"
  else
    echo "⚠️  .env.stage file not found, skipping secret creation"
    echo "Run: gcloud secrets create env-stage --data-file=.env.stage --project=$PROJECT"
  fi
fi

# Grant access to default service account
DEFAULT_SA="${PROJECT}@appspot.gserviceaccount.com"
echo "Granting secret access to $DEFAULT_SA..."
gcloud secrets add-iam-policy-binding env-stage \
  --member="serviceAccount:$DEFAULT_SA" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT || echo "⚠️  IAM binding may already exist"

echo ""
echo "========================================="
echo "✅ Infrastructure Setup Complete!"
echo "========================================="
echo ""
echo "Important Information:"
echo "  Cloud SQL Connection: $CLOUD_SQL_CONNECTION"
echo "  Redis Host: $REDIS_HOST"
echo ""
echo "Update your .env.stage file with:"
echo "  DATABASE_URL=postgresql://verichron_stage:PASSWORD@/verichron_stage_db?host=/cloudsql/$CLOUD_SQL_CONNECTION"
echo "  REDIS_HOST=$REDIS_HOST"
echo ""
echo "Next steps:"
echo "  1. Update .env.stage with the values above"
echo "  2. Upload updated secret: gcloud secrets versions add env-stage --data-file=.env.stage"
echo "  3. Setup MongoDB Atlas cluster (external)"
echo "  4. Build images: ./scripts/build-and-push-staging.sh"
echo "  5. Deploy services: ./scripts/deploy-all-staging.sh"
