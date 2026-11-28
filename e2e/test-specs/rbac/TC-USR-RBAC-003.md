### TC-USR-RBAC-003: Cannot Delete System Roles
**Tags**: `api-users`, `rbac`, `P1`, `security`, `negative`

**Preconditions**:
- Org admin authenticated
- System roles exist: "Organization Admin", "Manager", "Collector"

**Test Steps**:
1. GET `/rbac/roles` to identify system role ID
2. Verify role has `isSystemRole: true`
3. DELETE `/rbac/roles/{systemRoleId}`
4. Verify response 403 Forbidden or 400 Bad Request
5. Verify error message indicates system roles cannot be deleted
6. GET `/rbac/roles/{systemRoleId}` to confirm still exists

**Expected Results**:
- System role deletion prevented
- Clear error message
- System role still exists and functional
- No event published

**Cleanup**: None