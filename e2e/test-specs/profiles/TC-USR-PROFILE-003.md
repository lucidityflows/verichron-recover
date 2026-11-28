### TC-USR-PROFILE-003: Manager Invites Collector (Limited Permissions)
**Tags**: `api-users`, `profiles`, `P1`, `rbac`

**Preconditions**:
- Manager user authenticated
- Manager has `user:create` permission
- Manager lacks `role:create` permission

**Test Steps**:
1. POST `/users` with valid payload (assign existing Collector role)
2. Verify response 201 Created
3. Verify user created successfully
4. Manager attempts to create custom role: POST `/rbac/roles`
5. Verify response 403 Forbidden
6. Verify error indicates `role:create` permission required

**Expected Results**:
- Manager can invite users with existing roles
- Manager cannot create new roles
- Permission boundaries enforced correctly
- Clear error messages for denied actions

**Cleanup**:
- Delete test user