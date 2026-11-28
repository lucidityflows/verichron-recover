### TC-USR-AUTH-006: Invalid JWT Signature Rejected
**Tags**: `api-users`, `auth`, `P0`, `security`

**Preconditions**:
- Valid JWT payload structure
- JWT signed with incorrect secret

**Test Steps**:
1. Create JWT with valid payload but wrong signature
2. Make authenticated request with tampered JWT
3. Verify response 401 Unauthorized
4. Verify error indicates invalid signature

**Expected Results**:
- Signature validation enforced
- Tampered tokens rejected
- Security boundary maintained

**Cleanup**: None