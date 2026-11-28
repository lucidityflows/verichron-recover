### TC-ORG-ONBOARD-003: Onboarding with Invalid Data Fails Validation
**Tags**: `api-organizations`, `onboarding`, `P1`, `validation`, `negative`

**Preconditions**:
- Platform admin authenticated

**Test Steps**:
1. POST `/onboarding` with missing required fields:
   ```json
   {
     "organization": {
       "name": ""  // Empty name
     },
     "initialAdmin": {
       "email": "invalid-email"  // Invalid format
     }
   }
   ```
2. Verify response is 400 Bad Request
3. Verify validation error details in response

**Expected Results**:
- Request rejected with 400 status
- Error response includes field-level validation errors
- No organization created
- No event published

**Cleanup**: None