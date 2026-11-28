### TC-USR-RBAC-008: Cannot Assign Permissions Not Defined in Platform
**Tags**: `api-users`, `rbac`, `P1`, `validation`, `negative`

**Preconditions**:
- Org admin authenticated
- Platform has defined set of permissions

**Test Steps**:
1. POST `/rbac/roles/{roleId}/permissions` with non-existent permission:
   ```json
   {
     "permissionId": "fake-permission-id"
   }
   ```
2. Verify 404 Not Found or 400 Bad Request
3. Verify error message indicates permission doesn't exist
4. GET `/rbac/permissions` to view all valid permissions

**Expected Results**:
- Invalid permissions rejected
- Platform maintains single source of truth for permissions
- Clear validation error
- All valid permissions queryable

**Cleanup**: None