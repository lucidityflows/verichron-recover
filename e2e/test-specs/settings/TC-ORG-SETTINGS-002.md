### TC-ORG-SETTINGS-002: Non-Admin Cannot Update Settings
**Tags**: `api-organizations`, `settings`, `P1`, `security`, `negative`

**Preconditions**:
- Regular collector user authenticated
- User lacks `orgs:settings:write` permission

**Test Steps**:
1. PATCH `/organizations/{orgId}/settings` with valid payload
2. Verify response 403 Forbidden
3. Verify error message indicates insufficient permissions
4. GET `/organizations/{orgId}/settings` to confirm no changes

**Expected Results**:
- Request denied
- Settings unchanged
- No event published
- Clear permission error message

**Cleanup**: None