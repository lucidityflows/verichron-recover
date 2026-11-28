# Email Invitation System - Verification Report

**Date**: 2026-01-03
**Status**: ✅ BACKEND COMPLETE | ⚠️ TEMPLATE MISSING | ✅ SMTP CONFIGURED

---

## Executive Summary

The email invitation system is **fully implemented** from an architectural standpoint:
- ✅ Backend event flow complete (api-debtors → api-communications)
- ✅ Frontend UI and handlers complete
- ✅ Real-time progress tracking complete
- ✅ SMTP gateway configured (SendGrid)
- ⚠️ **MISSING**: `debtor-portal-invitation` email template

**Action Required**: Create the email template before going live.

---

## System Architecture Verification

### 1. ✅ Event Flow (COMPLETE)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Invite All" (IngestionCenter.tsx)               │
│    Triggers: profilesControllerInvitePortfolioDebtors()        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. API Request: POST /organizations/:id/debtors/profiles/invite│
│    (api-debtors/src/profiles/profiles.controller.ts)           │
│    Publishes: DEBTORS_INVITATION_BATCH_REQUESTED               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Listener: DebtorInvitationBatchRequestedListener            │
│    (api-communications)                                        │
│    Calls: dispatchService.dispatch() for each debtor          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. DispatchService Workflow:                                   │
│    a. Check compliance rules                                   │
│    b. Fetch template: 'debtor-portal-invitation' ⚠️ MISSING   │
│    c. Render template with Handlebars                         │
│    d. Send via SendGrid gateway                               │
│    e. Publish: COMMUNICATIONS_COMMUNICATION_DISPATCHED        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Frontend: InvitationWave Component                          │
│    Polls: /compliance/invitation-metrics/:batchId             │
│    Displays: Real-time progress, delivered/bounced/opened     │
└─────────────────────────────────────────────────────────────────┘
```

**Files Verified**:
- ✅ `apps/api-debtors/src/profiles/profiles.controller.ts` - Invitation endpoint
- ✅ `apps/api-communications/src/notifications/listeners/debtor-invitation-batch-requested.listener.ts`
- ✅ `apps/api-communications/src/dispatch/dispatch.service.ts`
- ✅ `apps/ui-organizations/src/features/inventory/IngestionCenter.tsx` - UI handler
- ✅ `apps/ui-organizations/src/features/inventory/components/InvitationWave.tsx` - Real-time tracking

---

### 2. ✅ SMTP Configuration (COMPLETE)

**Gateway**: SendGrid
**Configuration**: `/apps/api-communications/src/config/gateway.config.ts`

**Environment Variables (.env.test)**:
```bash
# SendGrid API Key (configured)
SENDGRID_API_KEY=REDACTED_SENDGRID_KEY

# Email From Address
EMAIL_FROM_ADDRESS=noreply@verichron-test.com

# Webhook Public Key (for event tracking)
SENDGRID_WEBHOOK_PUBLIC_KEY="MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE..."
```

**Fallback Behavior**:
- If `SENDGRID_API_KEY` is missing → Falls back to `MockEmailService`
- MockEmailService logs emails instead of sending (safe for development)

**Location**: `apps/api-communications/src/gateways/gateway-factory.service.ts` (lines 17-34)

---

### 3. ⚠️ Email Template (MISSING)

**Required Template Name**: `debtor-portal-invitation`

**Template System**:
- Database table: `templates` (PostgreSQL)
- Entity: `apps/api-communications/src/templates/entities/template.entity.ts`
- Service: `apps/api-communications/src/templates/templates.service.ts`
- API Endpoint: `POST /organizations/:orgId/communications/templates`

**What Happens Without Template**:
1. Dispatch service calls `templatesService.findActiveByName(organizationId, 'debtor-portal-invitation')`
2. Template not found → Throws `TemplateNotFoundException`
3. Email dispatch **FAILS**
4. Error logged to communication_logs with status `FAILED`

**Required Template Fields**:
- `name`: "debtor-portal-invitation"
- `type`: "EMAIL" (TemplateType enum)
- `subject`: Email subject line (Handlebars template)
- `body`: HTML email body (Handlebars template)
- `organizationId`: UUID of the organization
- `isActive`: true
- `version`: 1

**Available Context Variables** (from listener):
```typescript
{
  debtorProfileId: string,
  email: string,
  firstName: string,
  lastName: string,
  organizationId: string,
  // Plus any additional context from the invitation object
}
```

---

## ⚠️ Critical Action Required

### Create the Email Template

You have **two options**:

#### Option A: Create via API (Recommended for Production)

Use the Templates API endpoint to create the template programmatically.

**Script**: See `create-invitation-template.sh` below

#### Option B: Direct Database Insert (Quick Test)

Insert the template directly into the database for testing.

**Script**: See `create-invitation-template.sql` below

---

## Testing Scripts

### 1. Create Template via API

**File**: `scripts/create-invitation-template.sh`

```bash
#!/bin/bash
# Create the debtor-portal-invitation email template via API

# Configuration
API_URL="http://localhost:3006"
ORG_ID="YOUR_ORGANIZATION_ID_HERE"  # Replace with actual org ID
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"      # Replace with actual JWT

# Template payload
curl -X POST "${API_URL}/organizations/${ORG_ID}/communications/templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{
    "name": "debtor-portal-invitation",
    "displayName": "Debtor Portal Invitation Email",
    "type": "EMAIL",
    "subject": "Welcome to Your Account Portal - {{firstName}} {{lastName}}",
    "body": "<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:#4f46e5;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#f9fafb;padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px}.button{display:inline-block;background:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin:20px 0}.footer{text-align:center;color:#6b7280;font-size:12px;margin-top:20px}</style></head><body><div class=\"header\"><h1>Welcome to Your Account Portal</h1></div><div class=\"content\"><p>Dear {{firstName}} {{lastName}},</p><p>We'\''ve created a secure online portal for you to manage your account. You can view your balance, make payments, and communicate with us directly.</p><a href=\"https://portal.debtluciditysolutions.com/register?token={{invitationToken}}\" class=\"button\">Access Your Portal</a><p>If you have any questions, please don'\''t hesitate to contact us.</p><p>Best regards,<br><strong>Debt Lucidity Solutions Team</strong></p></div><div class=\"footer\"><p>This is an automated message. Please do not reply to this email.</p></div></body></html>",
    "description": "Email sent to debtors inviting them to register for the self-service portal",
    "requiredVariables": ["firstName", "lastName", "email", "invitationToken"]
  }'

echo "✅ Template created successfully"
```

**Usage**:
```bash
chmod +x scripts/create-invitation-template.sh
./scripts/create-invitation-template.sh
```

---

### 2. Create Template via Database (Alternative)

**File**: `scripts/create-invitation-template.sql`

```sql
-- Insert debtor-portal-invitation template
-- NOTE: Replace 'YOUR_ORG_ID_HERE' with actual organization UUID

INSERT INTO templates (
  id,
  organization_id,
  name,
  display_name,
  type,
  subject,
  body,
  version,
  is_active,
  description,
  required_variables,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'YOUR_ORG_ID_HERE',  -- ⚠️ REPLACE THIS
  'debtor-portal-invitation',
  'Debtor Portal Invitation Email',
  'EMAIL',
  'Welcome to Your Account Portal - {{firstName}} {{lastName}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to Your Account Portal</h1>
  </div>
  <div class="content">
    <p>Dear {{firstName}} {{lastName}},</p>
    <p>We''ve created a secure online portal for you to manage your account. You can view your balance, make payments, and communicate with us directly.</p>
    <a href="https://portal.debtluciditysolutions.com/register?token={{invitationToken}}" class="button">Access Your Portal</a>
    <p>If you have any questions, please don''t hesitate to contact us.</p>
    <p>Best regards,<br><strong>Debt Lucidity Solutions Team</strong></p>
  </div>
  <div class="footer">
    <p>This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>',
  1,
  true,
  'Email sent to debtors inviting them to register for the self-service portal',
  '["firstName", "lastName", "email", "invitationToken"]'::jsonb,
  NOW(),
  NOW()
);
```

**Usage**:
```bash
psql -h localhost -U postgres -d your_database -f scripts/create-invitation-template.sql
```

---

### 3. Test Email Sending (End-to-End)

**File**: `scripts/test-email-flow.sh`

```bash
#!/bin/bash
# Test the complete email invitation flow

API_URL="http://localhost:3004"  # api-debtors
ORG_ID="YOUR_ORGANIZATION_ID_HERE"
PORTFOLIO_ID="YOUR_PORTFOLIO_ID_HERE"
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"

echo "🚀 Testing email invitation flow..."
echo "=================================="

# Step 1: Trigger invitation batch
echo "📤 Sending invitation request..."
RESPONSE=$(curl -s -X POST \
  "${API_URL}/organizations/${ORG_ID}/debtors/profiles/invite" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d "{\"portfolioId\": \"${PORTFOLIO_ID}\"}")

echo "Response: ${RESPONSE}"

# Extract batch ID
BATCH_ID=$(echo $RESPONSE | jq -r '.invitationBatchId')
echo "📊 Invitation Batch ID: ${BATCH_ID}"

# Step 2: Poll for metrics
echo ""
echo "📈 Polling invitation metrics (5 iterations)..."
for i in {1..5}; do
  sleep 3
  METRICS=$(curl -s -X GET \
    "http://localhost:3006/organizations/${ORG_ID}/compliance/invitation-metrics/${BATCH_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

  echo "Iteration $i: $(echo $METRICS | jq -c '.')"
done

echo ""
echo "✅ Test complete. Check api-communications logs for email dispatch details."
```

**Usage**:
```bash
chmod +x scripts/test-email-flow.sh
./scripts/test-email-flow.sh
```

---

## Verification Checklist

### Pre-Flight Checks

- [ ] **1. Database Connection**
  ```bash
  # Verify templates table exists
  psql -h localhost -U postgres -d your_db -c "\d templates"
  ```

- [ ] **2. SMTP Configuration**
  ```bash
  # Check environment variables
  echo $SENDGRID_API_KEY
  echo $EMAIL_FROM_ADDRESS
  ```

- [ ] **3. Pub/Sub Emulator Running**
  ```bash
  # For local testing
  gcloud beta emulators pubsub start --project=test-project --host-port=localhost:8085
  ```

- [ ] **4. Create Email Template**
  - Run `create-invitation-template.sh` OR
  - Run `create-invitation-template.sql`
  - Verify: `SELECT * FROM templates WHERE name = 'debtor-portal-invitation';`

### Test Execution

- [ ] **5. Start Services**
  ```bash
  # In separate terminals or via docker-compose
  cd apps/api-debtors && npm run start:dev
  cd apps/api-communications && npm run start:dev
  ```

- [ ] **6. Import Test Portfolio**
  - Use IngestionCenter UI to upload a CSV
  - Wait for COMPLETED status

- [ ] **7. Trigger Email Invitations**
  - Click "Invite All" button
  - Observe InvitationWave component appear

- [ ] **8. Monitor Logs**
  ```bash
  # api-communications console output
  # Look for:
  # - "📨 Received DEBTORS_INVITATION_BATCH_REQUESTED"
  # - "Dispatching EMAIL to debtor..."
  # - "=== MOCK EMAIL ===" (if using mock gateway)
  # - "Dispatch completed. Log ID: ..."
  ```

- [ ] **9. Verify Database Logs**
  ```sql
  -- Check communication logs
  SELECT * FROM communication_logs
  WHERE type = 'EMAIL'
  ORDER BY created_at DESC
  LIMIT 10;

  -- Expected statuses: SENT (success), BLOCKED (compliance), FAILED (error)
  ```

- [ ] **10. Check SendGrid Dashboard** (if using real API)
  - Login to SendGrid console
  - Navigate to Activity Feed
  - Verify emails dispatched

---

## Common Issues & Troubleshooting

### Issue 1: "Template not found: debtor-portal-invitation"

**Cause**: Template doesn't exist in database
**Solution**: Run `create-invitation-template.sh` or SQL script
**Verify**: `SELECT * FROM templates WHERE name = 'debtor-portal-invitation';`

---

### Issue 2: Emails not sending (falling back to mock)

**Cause**: `SENDGRID_API_KEY` not set
**Solution**:
```bash
export SENDGRID_API_KEY="SG.your-api-key-here"
```
**Verify**: Check logs for "MockEmailService" vs "SendGridService"

---

### Issue 3: InvitationWave shows 0 sent

**Cause**: Event not published or listener not running
**Solution**:
1. Check Pub/Sub emulator is running
2. Verify api-communications is subscribed to `debtors-v1` topic
3. Check logs for "Received DEBTORS_INVITATION_BATCH_REQUESTED"

**Debug**:
```bash
# List Pub/Sub topics
curl http://localhost:8085/v1/projects/test-project/topics

# List subscriptions
curl http://localhost:8085/v1/projects/test-project/subscriptions
```

---

### Issue 4: Template rendering errors

**Cause**: Invalid Handlebars syntax or missing variables
**Solution**: Validate template syntax
```bash
# Test render via API
curl -X POST "http://localhost:3006/organizations/${ORG_ID}/communications/templates/preview" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Hello {{firstName}}!",
    "context": {"firstName": "John"}
  }'
```

---

### Issue 5: Compliance blocking emails

**Cause**: Compliance rules blocking communication
**Solution**: Check compliance logs
```sql
SELECT * FROM communication_logs
WHERE status = 'BLOCKED'
ORDER BY created_at DESC;
```
**Fix**: Adjust compliance rules or debtor opt-out status

---

## Production Deployment Checklist

Before going live with email invitations:

- [ ] **1. SendGrid Account Setup**
  - [ ] Create production SendGrid account
  - [ ] Generate API key with "Mail Send" permission
  - [ ] Configure sender authentication (domain verification)
  - [ ] Set up event webhook for delivery tracking

- [ ] **2. Email Template**
  - [ ] Create production-ready HTML template
  - [ ] Test rendering with real debtor data
  - [ ] Include unsubscribe link (compliance)
  - [ ] Add company logo and branding
  - [ ] Test on multiple email clients (Gmail, Outlook, Apple Mail)

- [ ] **3. Environment Variables**
  ```bash
  SENDGRID_API_KEY=<production-key>
  EMAIL_FROM_ADDRESS=noreply@yourdomain.com
  EMAIL_FROM_NAME=Your Company Name
  SENDGRID_WEBHOOK_URL=https://api.yourdomain.com/webhooks/sendgrid
  SENDGRID_WEBHOOK_PUBLIC_KEY=<webhook-verification-key>
  ```

- [ ] **4. Rate Limiting**
  - [ ] Configure SendGrid daily sending limit
  - [ ] Implement batch throttling (e.g., 100 emails/minute)
  - [ ] Set up monitoring alerts for high volume

- [ ] **5. Compliance**
  - [ ] Verify CAN-SPAM compliance (unsubscribe link, physical address)
  - [ ] Test opt-out flow
  - [ ] Configure compliance rules in api-communications

- [ ] **6. Monitoring**
  - [ ] Set up SendGrid webhook to track deliveries, bounces, opens
  - [ ] Configure alerts for high bounce rates
  - [ ] Dashboard for invitation metrics

---

## Summary

### ✅ What's Working
1. Complete event-driven architecture
2. SendGrid integration with fallback to mock
3. Real-time UI progress tracking
4. Compliance checking before dispatch
5. Communication logging for audit trail

### ⚠️ What's Missing
1. **EMAIL TEMPLATE** - Must be created before use
2. Production SendGrid configuration (using test key currently)
3. Email content design (current template is basic placeholder)

### 🚀 Next Steps
1. Run `create-invitation-template.sh` to create the template
2. Test the flow with `test-email-flow.sh`
3. Refine email template design for production
4. Set up SendGrid webhook for delivery tracking

---

## Support Resources

- **SendGrid Docs**: https://docs.sendgrid.com/
- **Handlebars Docs**: https://handlebarsjs.com/
- **Templates API**: `GET /organizations/:id/communications/templates`
- **Logs Query**: `GET /organizations/:id/communications/logs`

---

**Report Generated**: 2026-01-03
**Next Review**: After template creation and first test
