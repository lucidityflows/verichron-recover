### TC-ORG-SETTINGS-003: Settings Schema Validation
**Tags**: `api-organizations`, `settings`, `P1`, `validation`

**Preconditions**:
- Org admin authenticated

**Test Steps**:
1. PATCH `/organizations/{orgId}/settings` with invalid data:
   ```json
   {
     "settings": {
       "branding": {
         "primary_color_hex": "not-a-color"  // Invalid hex
       }
     }
   }
   ```
2. Verify response 400 Bad Request
3. Verify validation error details in response
4. GET `/organizations/{orgId}/settings` to confirm no change

**Expected Results**:
- Settings validated against FullSettingsDto schema
- Invalid data rejected
- Field-level validation errors returned
- Settings unchanged

**Cleanup**: None