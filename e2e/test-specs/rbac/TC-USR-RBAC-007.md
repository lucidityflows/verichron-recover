### TC-USR-RBAC-007: Permission Check for Feature Flags
**Tags**: `api-users`, `rbac`, `P2`, `enhancement`

**Preconditions**:
- User authenticated with specific permissions
- Feature flag system uses permission checks

**Test Steps**:
1. POST `/rbac/check-permission` with:
   ```json
   {
     "userId": "user-123",
     "organizationId": "org-123",
     "permission": "report:read"
   }
   ```
2. Verify response indicates permission granted or denied
3. POST `/rbac/check-permissions` (bulk check) with array of permissions
4. Verify bulk response includes results for all permissions

**Expected Results**:
- Permission check endpoint works correctly
- Useful for feature flag systems
- Bulk checks are efficient
- Results match JWT claims

**Cleanup**: None