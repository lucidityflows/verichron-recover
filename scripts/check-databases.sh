#!/bin/bash
# Check databases on Staging Cloud SQL
# Usage: ./scripts/check-databases.sh

PROJECT="verichron-recover-staging"
REGION="us-central1"
INSTANCE="verichron-recover"

echo "Connecting to Cloud SQL to list databases..."
gcloud sql databases list --instance=$INSTANCE --project=$PROJECT
