#!/bin/bash
# Test the complete email invitation flow end-to-end

# Configuration
API_DEBTORS_URL="${API_DEBTORS_URL:-http://localhost:3004}"
API_COMMS_URL="${API_COMMUNICATIONS_URL:-http://localhost:3006}"
ORG_ID="${1:-}"
PORTFOLIO_ID="${2:-}"
JWT_TOKEN="${3:-}"

if [ -z "$ORG_ID" ] || [ -z "$PORTFOLIO_ID" ] || [ -z "$JWT_TOKEN" ]; then
  echo "❌ Usage: $0 <ORG_ID> <PORTFOLIO_ID> <JWT_TOKEN>"
  echo ""
  echo "Example:"
  echo "  $0 \\"
  echo "    123e4567-e89b-12d3-a456-426614174000 \\"
  echo "    987fcdeb-51a2-43d7-b890-123456789abc \\"
  echo "    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  exit 1
fi

echo "🚀 Testing Email Invitation Flow"
echo "=================================="
echo "   Organization: ${ORG_ID}"
echo "   Portfolio: ${PORTFOLIO_ID}"
echo "   Debtors API: ${API_DEBTORS_URL}"
echo "   Communications API: ${API_COMMS_URL}"
echo ""

# Step 1: Trigger invitation batch
echo "📤 Step 1: Sending invitation request..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${API_DEBTORS_URL}/organizations/${ORG_ID}/debtors/profiles/invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{\"portfolioId\": \"${PORTFOLIO_ID}\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ne 200 ] && [ "$HTTP_CODE" -ne 201 ]; then
  echo "❌ Failed to trigger invitations (HTTP ${HTTP_CODE})"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

echo "✅ Invitation request sent (HTTP ${HTTP_CODE})"
echo "$BODY" | jq '.'

# Extract batch ID
BATCH_ID=$(echo "$BODY" | jq -r '.invitationBatchId // .data.invitationBatchId')
TOTAL_INVITATIONS=$(echo "$BODY" | jq -r '.totalInvitations // .data.totalInvitations')

if [ -z "$BATCH_ID" ] || [ "$BATCH_ID" = "null" ]; then
  echo "⚠️  Warning: Could not extract batch ID from response"
  echo "    This is expected if the portfolio has no debtors with email addresses"
  exit 0
fi

echo ""
echo "📊 Batch Information:"
echo "   Batch ID: ${BATCH_ID}"
echo "   Total Invitations: ${TOTAL_INVITATIONS}"
echo ""

# Step 2: Poll for metrics
echo "📈 Step 2: Polling invitation metrics (10 iterations, 3s interval)..."
echo ""

for i in {1..10}; do
  sleep 3

  METRICS=$(curl -s -X GET \
    "${API_COMMS_URL}/organizations/${ORG_ID}/compliance/invitation-metrics/${BATCH_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

  TOTAL_SENT=$(echo "$METRICS" | jq -r '.data.totalSent // .totalSent // 0')
  DELIVERED=$(echo "$METRICS" | jq -r '.data.delivered // .delivered // 0')
  BOUNCED=$(echo "$METRICS" | jq -r '.data.bounced // .bounced // 0')
  OPENED=$(echo "$METRICS" | jq -r '.data.opened // .opened // 0')

  printf "[%2d/10] Sent: %3d | Delivered: %3d | Bounced: %3d | Opened: %3d\n" \
    "$i" "$TOTAL_SENT" "$DELIVERED" "$BOUNCED" "$OPENED"

  # Exit early if all sent
  if [ "$TOTAL_SENT" -ge "$TOTAL_INVITATIONS" ]; then
    echo ""
    echo "✅ All invitations dispatched!"
    break
  fi
done

echo ""
echo "📊 Final Metrics:"
echo "$METRICS" | jq '.'

echo ""
echo "✅ Test complete!"
echo ""
echo "Next steps:"
echo "  1. Check api-communications logs for dispatch details"
echo "  2. If using MockEmailService, emails will be logged to console"
echo "  3. If using SendGrid, check SendGrid Activity Feed"
echo "  4. Query communication_logs table: SELECT * FROM communication_logs WHERE type = 'EMAIL' ORDER BY created_at DESC LIMIT 10;"
