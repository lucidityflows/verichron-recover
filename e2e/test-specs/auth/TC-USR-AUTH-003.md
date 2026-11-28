### TC-USR-AUTH-003: JWT Refresh Token Flow
**Tags**: `api-users`, `auth`, `P1`, `security`

**Preconditions**:
- User authenticated with access token and refresh token
- Access token expires in 15 minutes
- Refresh token valid for 7 days

**Test Steps**:
1. Wait for access token to expire (or manipulate expiry for testing)
2. Make authenticated request with expired access token
3. Verify 401 Unauthorized
4. POST `/auth/refresh` with refresh token in body or cookie
5. Verify response 200 OK with new access token
6. Verify new access token has extended expiry
7. Make authenticated request with new token
8. Verify 200 OK

**Expected Results**:
- Expired token rejected
- Refresh token successfully issues new access token
- New token works for authenticated requests
- User doesn't need to re-enter credentials

**Cleanup**: None