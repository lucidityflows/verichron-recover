### TC-USR-AUTH-009: Refresh Token Single-Use Enforcement
**Tags**: `api-users`, `auth`, `P2`, `security`

**Preconditions**:
- User authenticated with refresh token

**Test Steps**:
1. POST `/auth/refresh` with refresh token
2. Verify new access token returned
3. Attempt to reuse same refresh token
4. Verify 401 Unauthorized (token already used)

**Expected Results**:
- Refresh tokens are single-use (if rotation enabled)
- Prevents token replay attacks
- User must use new refresh token from response

**Cleanup**: None