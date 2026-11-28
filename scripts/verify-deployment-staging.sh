#!/bin/bash
# Verify all Cloud Run services are deployed and healthy
# Usage: ./scripts/verify-deployment-staging.sh

set -e

PROJECT="verichron-recover-staging"
REGION="us-central1"

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

echo "================================"
echo "Verifying Staging Deployment"
echo "================================"
echo "Project: $PROJECT"
echo "Region: $REGION"
echo "================================"

TOTAL_SERVICES=${#SERVICES[@]}
HEALTHY_COUNT=0
UNHEALTHY_SERVICES=()

echo ""
echo "========================================="
echo "Testing Health Endpoints"
echo "========================================="

for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "----------------------------------------"
  echo "📦 $SERVICE"
  echo "----------------------------------------"

  # Get service URL
  URL=$(gcloud run services describe ${SERVICE}-staging \
    --region=$REGION \
    --project=$PROJECT \
    --format='value(status.url)' 2>/dev/null || echo "")

  if [ -z "$URL" ]; then
    echo "❌ Service not deployed"
    UNHEALTHY_SERVICES+=("$SERVICE (not deployed)")
    continue
  fi

  echo "URL: $URL"

  # Get service status
  STATUS=$(gcloud run services describe ${SERVICE}-staging \
    --region=$REGION \
    --project=$PROJECT \
    --format='value(status.conditions[0].status)' 2>/dev/null || echo "Unknown")

  echo "Status: $STATUS"

  # Test health endpoint
  echo "Testing /health endpoint..."

  HEALTH_RESPONSE=$(curl -f -s -w "\n%{http_code}" --max-time 10 "$URL/health" 2>/dev/null || echo -e "\nERROR")
  HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
  RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "✅ Health check passed (HTTP $HTTP_CODE)"
    ((HEALTHY_COUNT++))

    # Try to parse JSON response
    if [ -n "$RESPONSE_BODY" ]; then
      echo "Response:"
      if command -v jq &> /dev/null; then
        echo "$RESPONSE_BODY" | jq -C '.' 2>/dev/null || echo "$RESPONSE_BODY"
      else
        echo "$RESPONSE_BODY"
      fi
    fi
  else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    UNHEALTHY_SERVICES+=("$SERVICE (HTTP $HTTP_CODE)")

    # Show logs on failure
    echo ""
    echo "Recent logs:"
    gcloud run services logs read ${SERVICE}-staging \
      --region=$REGION \
      --project=$PROJECT \
      --limit=10 2>/dev/null || echo "Could not fetch logs"
  fi

  # Get resource usage
  MEMORY=$(gcloud run services describe ${SERVICE}-staging \
    --region=$REGION \
    --project=$PROJECT \
    --format='value(spec.template.spec.containers[0].resources.limits.memory)' 2>/dev/null || echo "N/A")

  CPU=$(gcloud run services describe ${SERVICE}-staging \
    --region=$REGION \
    --project=$PROJECT \
    --format='value(spec.template.spec.containers[0].resources.limits.cpu)' 2>/dev/null || echo "N/A")

  echo "Resources: $MEMORY memory, $CPU CPU"

  # Get latest revision
  REVISION=$(gcloud run services describe ${SERVICE}-staging \
    --region=$REGION \
    --project=$PROJECT \
    --format='value(status.latestCreatedRevisionName)' 2>/dev/null || echo "N/A")

  echo "Latest revision: $REVISION"
done

# Summary
echo ""
echo ""
echo "========================================="
echo "Deployment Verification Summary"
echo "========================================="
echo "Total services: $TOTAL_SERVICES"
echo "Healthy: $HEALTHY_COUNT"
echo "Unhealthy: ${#UNHEALTHY_SERVICES[@]}"

if [ ${#UNHEALTHY_SERVICES[@]} -gt 0 ]; then
  echo ""
  echo "❌ Unhealthy services:"
  for SERVICE in "${UNHEALTHY_SERVICES[@]}"; do
    echo "  - $SERVICE"
  done
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check service logs:"
  echo "     gcloud run services logs read ${SERVICE_NAME}-staging --region=$REGION --project=$PROJECT"
  echo "  2. Verify environment variables are correct in .env.stage"
  echo "  3. Check Cloud SQL and Redis connectivity"
  echo "  4. Verify secrets are accessible:"
  echo "     gcloud secrets versions access latest --secret=env-stage --project=$PROJECT"
  exit 1
else
  echo ""
  echo "✅ All services are healthy!"
fi

echo ""
echo "========================================="
echo "Testing Inter-Service Communication"
echo "========================================="

# Get api-users URL for testing
USERS_URL=$(gcloud run services describe api-users-staging \
  --region=$REGION \
  --project=$PROJECT \
  --format='value(status.url)' 2>/dev/null || echo "")

if [ ! -z "$USERS_URL" ]; then
  echo ""
  echo "Testing api-users OpenAPI endpoint..."
  if curl -f -s --max-time 10 "$USERS_URL/api/docs-json" > /dev/null 2>&1; then
    echo "✅ OpenAPI documentation accessible"
  else
    echo "⚠️  OpenAPI endpoint not available (may be disabled in staging)"
  fi
fi

echo ""
echo "========================================="
echo "Infrastructure Status"
echo "========================================="

echo ""
echo "Cloud SQL:"
CLOUD_SQL_STATUS=$(gcloud sql instances describe verichron-recover \
  --project=$PROJECT \
  --format='value(state)' 2>/dev/null || echo "UNKNOWN")
echo "  Status: $CLOUD_SQL_STATUS"

echo ""
echo "Memorystore Redis:"
REDIS_STATUS=$(gcloud redis instances describe verichron-recover-redis \
  --region=$REGION \
  --project=$PROJECT \
  --format='value(state)' 2>/dev/null || echo "UNKNOWN")
echo "  Status: $REDIS_STATUS"

echo ""
echo "GCS Buckets:"
gsutil ls -p $PROJECT 2>/dev/null | grep verichron || echo "  Could not list buckets"

echo ""
echo "Pub/Sub Topics:"
gcloud pubsub topics list --project=$PROJECT --format='value(name)' 2>/dev/null | grep -E '(users|organizations|debts|debtors|transactions|communications|collectors|voice|workflows|automations|analytics|orchestrations)-events' || echo "  Could not list topics"

echo ""
echo "========================================="
echo "✅ Verification Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Test end-to-end workflows (user creation, debt import, etc.)"
echo "  2. Configure custom domains (optional)"
echo "  3. Set up monitoring alerts"
echo "  4. Schedule load testing"
