### TC-ORG-SETTINGS-004: Webhook Configuration Stored
**Tags**: `api-organizations`, `settings`, `P3`, `future`

**Preconditions**:
- Org admin authenticated
- Webhook feature enabled

**Test Steps**:
1. PATCH `/organizations/{orgId}/settings` with webhook config:
   ```json
   {
     "settings": {
       "webhooks": {
         "user_created": "https://external.com/webhook",
         "payment_received": "https://external.com/payments"
       }
     }
   }
   ```
2. Verify settings saved
3. Trigger UserCreated event
4. Verify webhook called (mock external endpoint)

**Expected Results**:
- Webhook configuration stored
- Events trigger webhook calls
- External integrations supported

**Cleanup**:
- Remove webhook config