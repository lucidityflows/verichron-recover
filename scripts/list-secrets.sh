#!/bin/bash
# List all secrets in the staging project
# Usage: ./scripts/list-secrets.sh

PROJECT="verichron-recover-staging"

echo "=================================================="
echo "Listing Secrets for Project: $PROJECT"
echo "=================================================="

if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found."
    exit 1
fi

# List secrets with name, creation time, and latest version state
gcloud secrets list \
  --project="$PROJECT" \
  --format="table[box](name, createTime.date('%Y-%m-%d'), replication.automatic, labels)"

echo ""
echo "To view a specific secret value:"
echo "gcloud secrets versions access latest --secret=SECRET_NAME --project=$PROJECT"
