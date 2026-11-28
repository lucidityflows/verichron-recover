### TC-ORG-ONBOARD-002: Non-Platform Admin Cannot Access Onboarding Endpoint
**Tags**: `api-organizations`, `onboarding`, `P0`, `security`, `negative`

**Preconditions**:
- Regular org admin user exists (not platform admin)
- Valid JWT token without `PLATFORM_ADMIN` role

**Test Steps**:
1. Org admin authenticates and receives JWT
2. POST `/onboarding` with valid payload
3. Verify response is 403 Forbidden

**Expected Results**:
- Request denied with 403 status
- Error message indicates insufficient permissions
- No organization created
- No event published

**Cleanup**: None