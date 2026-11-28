### TC-USR-PROFILE-005: Collector Cannot Access User Management
**Tags**: `api-users`, `profiles`, `P0`, `rbac`, `negative`

**Preconditions**:
- Collector authenticated
- Collector lacks `user:read` permission

**Test Steps**:
1. GET `/users` with valid `x-org-id` header
2. Verify response 403 Forbidden
3. POST `/users` (attempt to invite user)
4. Verify response 403 Forbidden
5. GET `/users/{specificUserId}`
6. Verify response 403 Forbidden

**Expected Results**:
- All user management endpoints denied
- Collector isolated from user data
- Consistent 403 responses
- Clear permission error messages

**Cleanup**: None