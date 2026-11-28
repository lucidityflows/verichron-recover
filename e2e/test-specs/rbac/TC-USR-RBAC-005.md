### TC-USR-RBAC-005: Collector Cannot View or Modify RBAC Settings
**Tags**: `api-users`, `rbac`, `P1`, `rbac`, `negative`

**Preconditions**:
- Collector authenticated
- Collector lacks `role:read`, `role:create`, `role:assign` permissions

**Test Steps**:
1. GET `/rbac/roles` to list roles
2. Verify 403 Forbidden
3. POST `/rbac/roles` to create role
4. Verify 403 Forbidden
5. POST `/rbac/users/{userId}/roles` to assign role
6. Verify 403 Forbidden

**Expected Results**:
- All RBAC endpoints denied to Collector
- Role-based access control enforced
- Collectors completely isolated from RBAC management

**Cleanup**: None