### TC-USR-AUTH-007: Missing JWT Returns 401
**Tags**: `api-users`, `auth`, `P0`, `security`

**Preconditions**:
- Protected endpoint exists

**Test Steps**:
1. Make request to protected endpoint without Authorization header
2. Verify response 401 Unauthorized
3. Verify error message indicates authentication required

**Expected Results**:
- Unauthenticated requests denied
- Clear error message
- Consistent 401 status code

**Cleanup**: None