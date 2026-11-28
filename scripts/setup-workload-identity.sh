#!/bin/bash
# setup-workload-identity.sh
# Configures Google Cloud Workload Identity Federation for GitHub Actions
# This is the SECURE way to authenticate GitHub with GCP without using JSON keys.

set -e

# ==============================================================================
# CONFIGURATION
# ==============================================================================
PROJECT_ID="verichron-recover-staging"
REPO="verichroninc/recover" # Format: org/repo
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-actions-provider"
SERVICE_ACCOUNT_NAME="github-deployer"

# ==============================================================================
# EXECUTION
# ==============================================================================

echo "🚀 Starting Workload Identity Federation Setup..."

# 1. Create the Service Account if it doesn't exist
if ! gcloud iam service-accounts describe "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" --project="${PROJECT_ID}" &>/dev/null; then
  echo "👤 Creating Service Account: ${SERVICE_ACCOUNT_NAME}"
  gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
    --project="${PROJECT_ID}" \
    --display-name="GitHub Actions Deployer"
else
  echo "✅ Service Account already exists"
fi

# 2. Enable required APIs
echo "🔌 Enabling required APIs..."
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project="${PROJECT_ID}"

# 3. Create the Workload Identity Pool
if ! gcloud iam workload-identity-pools describe "${POOL_NAME}" --project="${PROJECT_ID}" --location="global" &>/dev/null; then
  echo "🎱 Creating Workload Identity Pool: ${POOL_NAME}"
  gcloud iam workload-identity-pools create "${POOL_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --display-name="GitHub Actions Pool"
else
  echo "✅ Workload Identity Pool already exists"
fi

# 4. Create the Workload Identity Provider
if ! gcloud iam workload-identity-pools providers describe "${PROVIDER_NAME}" --project="${PROJECT_ID}" --location="global" --workload-identity-pool="${POOL_NAME}" &>/dev/null; then
  echo "🔗 Creating Workload Identity Provider: ${PROVIDER_NAME}"
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_NAME}" --project="${PROJECT_ID}" --location="global" --workload-identity-pool="${POOL_NAME}" --display-name="GitHub Actions Provider" --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" --attribute-condition="assertion.repository=='${REPO}'" --issuer-uri="https://token.actions.githubusercontent.com"
else
  echo "✅ Workload Identity Provider already exists"
fi

# 5. Bind the Service Account to the Pool
echo "🤝 Binding Service Account to the Workload Identity Pool..."
gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${REPO}"

# 6. Grant Deployment Permissions to the Service Account
echo "🛡️ Granting deployment permissions..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/pubsub.admin"

# Necessary for service accounts to use themselves
gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.serviceAccountUser" \
  --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo ""
echo "=============================================================================="
echo "🎉 SETUP COMPLETE!"
echo "=============================================================================="
echo "Now add these values to your GitHub Repository Secrets:"
echo ""
echo "GCP_PROJECT_ID: ${PROJECT_ID}"
echo "WIF_PROVIDER: projects/$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"
echo "WIF_SERVICE_ACCOUNT: ${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
echo "=============================================================================="
