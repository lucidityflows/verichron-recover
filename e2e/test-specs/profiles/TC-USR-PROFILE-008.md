### TC-USR-PROFILE-008: Invitation Token Expiry Enforced
**Tags**: `api-users`, `profiles`, `P1`, `security`

**Preconditions**:
- User created with invitation token
- Token expired (> 24 hours old)

**Test Steps**:
1. POST `/users/{userId}/activate` with expired token
2. Verify response 400 Bad Request or 401 Unauthorized
3. Verify error message indicates token expired
4. Verify user status remains `PENDING`

**Expected Results**:
- Expired tokens rejected
- User cannot activate with expired token
- Clear expiration error
- User status unchanged

**Cleanup**:
- Delete test user or regenerate token