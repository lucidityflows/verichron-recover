### TC-USR-RBAC-006: Roles Are Organization-Scoped
**Tags**: `api-users`, `rbac`, `P0`, `multi-tenancy`

**Preconditions**:
- Org A has custom role "Senior Collector"
- Org B has custom role "Senior Collector" (different ID, same name)
- User is member of both orgs

**Test Steps**:
1. Authenticate and select Org A context
2. GET `/rbac/roles`
3. Verify response contains Org A's "Senior Collector" role only
4. Note role ID
5. Switch to Org B context
6. GET `/rbac/roles`
7. Verify response contains Org B's "Senior Collector" role only
8. Verify role ID is different from Org A's
9. Attempt to assign Org A's role ID to user in Org B
10. Verify 404 Not Found (role doesn't exist in Org B)

**Expected Results**:
- Roles completely isolated between organizations
- Same role name in different orgs = different entities
- Cannot cross-assign roles between orgs
- Role visibility scoped to current organization

**Cleanup**: None