### TC-USR-AUTH-005: Expired Access Token Rejected
**Tags**: `api-users`, `auth`, `P1`, `security`

**Preconditions**:
- User authenticated with access token
- Access token manually expired (or wait 15 minutes)

**Test Steps**:
1. Make authenticated request with expired access token
2. Verify response 401 Unauthorized
3. Verify error message indicates token expired
4. Verify no data returned

**Expected Results**:
- Expired tokens rejected
- Clear expiration error message
- User must refresh or re-authenticate

**Cleanup**: None