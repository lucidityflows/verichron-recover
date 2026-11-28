#!/bin/bash
# Setup HTTP-to-HTTPS Redirect for Verichron Load Balancer
# Usage: ./scripts/setup-http-redirect.sh [project_id]

set -e

PROJECT_ID="${1:-verichron-recover-staging}"
IP_NAME="verichron-staging-ip"
HTTP_URL_MAP_NAME="verichron-staging-http-redirect"
HTTP_PROXY_NAME="verichron-staging-http-proxy"
HTTP_FORWARDING_RULE_NAME="verichron-staging-http-forwarding-rule"

echo "=================================================="
echo "Setting up HTTP -> HTTPS Redirect for ${PROJECT_ID}"
echo "=================================================="

# 1. Get the existing IP address
IP_ADDRESS=$(gcloud compute addresses describe ${IP_NAME} --global --project=${PROJECT_ID} --format="value(address)")
echo "ℹ️  Using IP Address: ${IP_ADDRESS}"

# 2. Create a URL Map that redirects ALL traffic to HTTPS
if gcloud compute url-maps describe ${HTTP_URL_MAP_NAME} --global --project=${PROJECT_ID} >/dev/null 2>&1; then
  echo "✅ URL Map ${HTTP_URL_MAP_NAME} exists."
else
  echo "Creating HTTP Redirect URL Map..."
  # Create a yaml file for the redirect configuration
  cat > http-redirect.yaml <<EOF
name: ${HTTP_URL_MAP_NAME}
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
  stripQuery: false
EOF

  gcloud compute url-maps import ${HTTP_URL_MAP_NAME} \
    --source=http-redirect.yaml \
    --global \
    --project=${PROJECT_ID} \
    --quiet
  
  rm http-redirect.yaml
fi

# 3. Create Target HTTP Proxy
if gcloud compute target-http-proxies describe ${HTTP_PROXY_NAME} --project=${PROJECT_ID} >/dev/null 2>&1; then
  echo "✅ Target HTTP Proxy ${HTTP_PROXY_NAME} exists."
else
  echo "Creating Target HTTP Proxy..."
  gcloud compute target-http-proxies create ${HTTP_PROXY_NAME} \
    --url-map=${HTTP_URL_MAP_NAME} \
    --global \
    --project=${PROJECT_ID}
fi

# 4. Create Forwarding Rule for Port 80
if gcloud compute forwarding-rules describe ${HTTP_FORWARDING_RULE_NAME} --global --project=${PROJECT_ID} >/dev/null 2>&1; then
  echo "✅ Forwarding Rule ${HTTP_FORWARDING_RULE_NAME} exists."
else
  echo "Creating HTTP Forwarding Rule (Port 80)..."
  gcloud compute forwarding-rules create ${HTTP_FORWARDING_RULE_NAME} \
    --load-balancing-scheme=EXTERNAL \
    --network-tier=PREMIUM \
    --address=${IP_ADDRESS} \
    --target-http-proxy=${HTTP_PROXY_NAME} \
    --global \
    --ports=80 \
    --project=${PROJECT_ID}
fi

echo ""
echo "=================================================="
echo "🎉 HTTP Redirect Setup Complete!"
echo "=================================================="
echo "Traffic to http://verichroninc.com should now redirect to https://verichroninc.com"
