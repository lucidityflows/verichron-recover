#!/bin/bash
# Deploy ui-marketing to Production/Staging Bucket
# Usage: ./scripts/deploy-ui-marketing.sh [project_id]

set -e

PROJECT_ID="${1:-verichron-recover-staging}"
MODE="${2:-stage}"
BUCKET_NAME="verichroninc.com" # As requested by user

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "=================================================="
echo "Deploying ui-marketing to gs://${BUCKET_NAME}"
echo "Project: ${PROJECT_ID}"
echo "Mode:    ${MODE}"
echo "=================================================="

# Check if bucket exists, create if not
if gsutil ls -b gs://${BUCKET_NAME} >/dev/null 2>&1; then
  echo "✅ Bucket gs://${BUCKET_NAME} exists."
else
  echo "Creating bucket gs://${BUCKET_NAME}..."
  # Try to create bucket. Note: Domain-named buckets require domain verification.
  if ! gsutil mb -p ${PROJECT_ID} -c STANDARD -l US-CENTRAL1 gs://${BUCKET_NAME}; then
    echo "❌ Failed to create bucket. Ensure you have verified domain ownership of ${BUCKET_NAME} in Google Search Console."
    echo "   See: https://cloud.google.com/storage/docs/domain-name-verification"
    exit 1
  fi
fi

# Configure bucket for website hosting
echo "Configuring bucket for website hosting..."
gsutil web set -m index.html -e index.html gs://${BUCKET_NAME}
gsutil iam ch allUsers:objectViewer gs://${BUCKET_NAME}

# Build the application
echo "Building ui-marketing (mode: ${MODE})..."
cd apps/ui-marketing

# Install dependencies if needed (assuming pnpm is used at root)
# pnpm install

# Build with specified mode
# Note: User must ensure VITE_EMAILJS_* vars are set in .env.${MODE} or environment
pnpm build --mode ${MODE}

# Sync to bucket
echo "Uploading to GCS..."
gsutil -m rsync -R -d dist gs://${BUCKET_NAME}

echo "✅ Deployment complete!"
echo "   URL: http://${BUCKET_NAME} (HTTP)"
echo "   Note: For HTTPS, configure a Load Balancer with SSL certificate."
