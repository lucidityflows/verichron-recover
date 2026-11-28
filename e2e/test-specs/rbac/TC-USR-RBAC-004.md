### TC-USR-RBAC-004: Manager Assigns Existing Role (Cannot Create New)
**Tags**: `api-users`, `rbac`, `P1`, `rbac`

**Preconditions**:
- Manager authenticated
- Manager has `role:assign` but not `role:create`
- Existing system roles available

**Test Steps**:
1. POST `/rbac/users/{userId}/roles` with existing role ID
2. Verify response 200 OK
3. Verify role assigned successfully
4. Attempt to create custom role: POST `/rbac/roles`
5. Verify 403 Forbidden
6. Verify Manager can only assign, not create

**Expected Results**:
- Manager can assign existing roles
- Manager cannot create custom roles
- Clear distinction between `role:assign` and `role:create` permissions

**Cleanup**:
- Remove role assignment