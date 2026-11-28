#!/bin/bash
# Setup Global External Load Balancer for Verichron Staging
# Usage: ./scripts/setup-load-balancer-staging.sh [project_id]

set -e

PROJECT_ID="${1:-verichron-recover-staging}"
REGION="us-central1"

# Network & IP
IP_NAME="verichron-staging-ip"
SSL_CERT_NAME="verichron-staging-cert-v2"
URL_MAP_NAME="verichron-staging-url-map"
TARGET_PROXY_NAME="verichron-staging-proxy"
FORWARDING_RULE_NAME="verichron-staging-forwarding-rule"

# Domains
DOMAIN="staging.verichroninc.com"
PROD_DOMAIN="verichroninc.com"
# Google Managed Certs do not support wildcards. List explicitly.
DOMAINS="${PROD_DOMAIN},www.${PROD_DOMAIN},auth.${DOMAIN},app.${DOMAIN},collect.${DOMAIN},ops.${DOMAIN},api.${DOMAIN}"

echo "=================================================="
echo "Setting up Load Balancer for ${PROJECT_ID}"
echo "Domains: ${DOMAINS}"
echo "=================================================="

# 1. Reserve Static IP
if gcloud compute addresses describe ${IP_NAME} --global --project=${PROJECT_ID} >/dev/null 2>&1; then
  echo "✅ IP Address ${IP_NAME} exists."
else
  echo "Creating global static IP..."
  gcloud compute addresses create ${IP_NAME} --global --project=${PROJECT_ID}
fi
IP_ADDRESS=$(gcloud compute addresses describe ${IP_NAME} --global --project=${PROJECT_ID} --format="value(address)")
echo "ℹ️  LB IP Address: ${IP_ADDRESS}"

# 2. Create SSL Certificate (Managed)
if gcloud compute ssl-certificates describe ${SSL_CERT_NAME} --project=${PROJECT_ID} >/dev/null 2>&1; then
  echo "✅ SSL Certificate ${SSL_CERT_NAME} exists."
else
  echo "Creating Managed SSL Certificate for ${DOMAINS}..."
  gcloud compute ssl-certificates create ${SSL_CERT_NAME} \
    --domains="${DOMAINS}" \
    --global \
    --project=${PROJECT_ID}
fi

# 3. Create Backend Buckets for UIs (Standard Hosting)
# Only Auth, Managers, and Marketing stay on Buckets due to quota
UI_APPS=("ui-auth" "ui-managers" "ui-marketing")
# Map app names to subdomains
declare -A UI_DOMAINS
UI_DOMAINS["ui-auth"]="auth.${DOMAIN}"
UI_DOMAINS["ui-managers"]="app.${DOMAIN}"
UI_DOMAINS["ui-marketing"]="${PROD_DOMAIN}"

for APP in "${UI_APPS[@]}"; do
  BACKEND_NAME="${APP}-backend"
  BUCKET_DOMAIN="${UI_DOMAINS[$APP]}"
  
  if gcloud compute backend-buckets describe ${BACKEND_NAME} --project=${PROJECT_ID} >/dev/null 2>&1; then
    echo "✅ Backend Bucket ${BACKEND_NAME} exists."
  else
    echo "Creating Backend Bucket ${BACKEND_NAME} for gs://${BUCKET_DOMAIN}..."
    gcloud compute backend-buckets create ${BACKEND_NAME} \
      --gcs-bucket-name="${BUCKET_DOMAIN}" \
      --enable-cdn \
      --project=${PROJECT_ID}
  fi
done

# 4. Create Serverless NEGs and Backend Services for API Microservices
# Services: api-users, api-organizations, etc.
API_SERVICES=(
  "api-users" "api-organizations" "api-debts" "api-debtors"
  "api-transactions" "api-communications" "api-collectors"
  "api-voice" "api-workflows" "api-automations" "api-audits" "api-analytics"
)

# 4b. Create Serverless NEGs for Containerized UIs (Bypassing Bucket Quota)
# These run on Cloud Run but are served via Load Balancer
CONTAINER_UIS=(
  "ui-ops" "ui-collectors"
)

# Combine lists for processing
ALL_CLOUD_RUN_SERVICES=("${API_SERVICES[@]}" "${CONTAINER_UIS[@]}")

for SERVICE in "${ALL_CLOUD_RUN_SERVICES[@]}"; do
  NEG_NAME="${SERVICE}-neg"
  CLOUD_RUN_SERVICE="${SERVICE}-staging" # Matches deploy scripts

  if gcloud compute network-endpoint-groups describe ${NEG_NAME} --region=${REGION} --project=${PROJECT_ID} >/dev/null 2>&1; then
    echo "✅ NEG ${NEG_NAME} exists."
  else
    echo "Creating NEG ${NEG_NAME} for Cloud Run service ${CLOUD_RUN_SERVICE}..."
    gcloud compute network-endpoint-groups create ${NEG_NAME} \
      --region=${REGION} \
      --network-endpoint-type=serverless \
      --cloud-run-service=${CLOUD_RUN_SERVICE} \
      --project=${PROJECT_ID}
  fi

  # Backend Service for the NEG
  BACKEND_SERVICE_NAME="${SERVICE}-backend"
  if gcloud compute backend-services describe ${BACKEND_SERVICE_NAME} --global --project=${PROJECT_ID} >/dev/null 2>&1; then
    echo "✅ Backend Service ${BACKEND_SERVICE_NAME} exists."
  else
    echo "Creating Backend Service ${BACKEND_SERVICE_NAME}..."
    gcloud compute backend-services create ${BACKEND_SERVICE_NAME} \
      --global \
      --project=${PROJECT_ID}
    
    gcloud compute backend-services add-backend ${BACKEND_SERVICE_NAME} \
      --global \
      --network-endpoint-group=${NEG_NAME} \
      --network-endpoint-group-region=${REGION} \
      --project=${PROJECT_ID}
  fi
done

# 5. Create URL Map (Load Balancer Logic)
# We need a YAML file for complex routing
cat > url-map.yaml <<EOF
defaultService: projects/${PROJECT_ID}/global/backendBuckets/ui-marketing-backend
name: ${URL_MAP_NAME}
hostRules:
- hosts:
  - "${PROD_DOMAIN}"
  - "www.${PROD_DOMAIN}"
  pathMatcher: path-matcher-marketing
- hosts:
  - "auth.${DOMAIN}"
  pathMatcher: path-matcher-auth
- hosts:
  - "app.${DOMAIN}"
  pathMatcher: path-matcher-managers
- hosts:
  - "collect.${DOMAIN}"
  pathMatcher: path-matcher-collectors
- hosts:
  - "ops.${DOMAIN}"
  pathMatcher: path-matcher-ops
- hosts:
  - "api.${DOMAIN}"
  pathMatcher: path-matcher-api
pathMatchers:
- name: path-matcher-marketing
  defaultService: projects/${PROJECT_ID}/global/backendBuckets/ui-marketing-backend
- name: path-matcher-auth
  defaultService: projects/${PROJECT_ID}/global/backendBuckets/ui-auth-backend
- name: path-matcher-managers
  defaultService: projects/${PROJECT_ID}/global/backendBuckets/ui-managers-backend
- name: path-matcher-collectors
  defaultService: projects/${PROJECT_ID}/global/backendServices/ui-collectors-backend
- name: path-matcher-ops
  defaultService: projects/${PROJECT_ID}/global/backendServices/ui-ops-backend
- name: path-matcher-api
  defaultService: projects/${PROJECT_ID}/global/backendServices/api-users-backend
  pathRules:
EOF

# Generate API Path Rules for all services
# Routes: /v1/alias/*, /ops/alias/*, /public/alias/*
for SERVICE in "${API_SERVICES[@]}"; do
  # Remove 'api-' prefix to get the alias (e.g., api-users -> users)
  ALIAS=${SERVICE#api-}
  echo "  - paths: [\"/v1/${ALIAS}\", \"/v1/${ALIAS}/*\", \"/ops/${ALIAS}\", \"/ops/${ALIAS}/*\", \"/public/${ALIAS}\", \"/public/${ALIAS}/*\"]" >> url-map.yaml
  echo "    service: projects/${PROJECT_ID}/global/backendServices/${SERVICE}-backend" >> url-map.yaml
done

# Finish the YAML file
cat >> url-map.yaml <<EOF
EOF
if gcloud compute url-maps describe ${URL_MAP_NAME} --global --project=${PROJECT_ID} >/dev/null 2>&1; then
  echo "Updating URL Map..."
  gcloud compute url-maps import ${URL_MAP_NAME} --source=url-map.yaml --global --project=${PROJECT_ID} --quiet
else
  echo "Creating URL Map..."
  gcloud compute url-maps import ${URL_MAP_NAME} --source=url-map.yaml --global --project=${PROJECT_ID} --quiet
fi
rm url-map.yaml

# 6. Create Target HTTPS Proxy
if gcloud compute target-https-proxies describe ${TARGET_PROXY_NAME} --project=${PROJECT_ID} >/dev/null 2>&1; then
  echo "✅ Target HTTPS Proxy exists. Updating SSL Cert..."
  gcloud compute target-https-proxies update ${TARGET_PROXY_NAME} \
    --ssl-certificates=${SSL_CERT_NAME} \
    --global \
    --project=${PROJECT_ID}
else
  echo "Creating Target HTTPS Proxy..."
  gcloud compute target-https-proxies create ${TARGET_PROXY_NAME} \
    --url-map=${URL_MAP_NAME} \
    --ssl-certificates=${SSL_CERT_NAME} \
    --global \
    --project=${PROJECT_ID}
fi

# 7. Create Global Forwarding Rule
if gcloud compute forwarding-rules describe ${FORWARDING_RULE_NAME} --global --project=${PROJECT_ID} >/dev/null 2>&1; then
  echo "✅ Forwarding Rule exists."
else
  echo "Creating Forwarding Rule..."
  gcloud compute forwarding-rules create ${FORWARDING_RULE_NAME} \
    --load-balancing-scheme=EXTERNAL \
    --network-tier=PREMIUM \
    --address=${IP_ADDRESS} \
    --target-https-proxy=${TARGET_PROXY_NAME} \
    --global \
    --ports=443 \
    --project=${PROJECT_ID}
fi

echo ""
echo "=================================================="
echo "🎉 Load Balancer Setup Complete!"
echo "=================================================="
echo "Next Steps:"
echo "1. Configure DNS Records:"
echo "   Create CNAME records for *.staging.verichroninc.com pointing to the IP address below."
echo "   (Or A records if your DNS provider doesn't support CNAME root)"
echo ""
echo "   IP Address: ${IP_ADDRESS}"
echo ""
echo "2. Wait for SSL Certificate Provisioning:"
echo "   It may take 15-60 minutes for the managed certificate to become active."
echo "   Check status: gcloud compute ssl-certificates describe ${SSL_CERT_NAME} --global"
