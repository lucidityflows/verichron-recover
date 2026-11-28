### TC-USR-RBAC-009: Grouped Permissions Endpoint for UI Rendering
**Tags**: `api-users`, `rbac`, `P2`, `enhancement`

**Preconditions**:
- User authenticated

**Test Steps**:
1. GET `/rbac/permissions/grouped`
2. Verify response groups permissions by resource:
   ```json
   {
     "user": [
       { "id": "...", "code": "user:create", "description": "..." },
       { "id": "...", "code": "user:read", "description": "..." }
     ],
     "debt": [
       { "id": "...", "code": "debt:read", "description": "..." }
     ],
     "role": [...]
   }
   ```
3. Verify all permissions included
4. Verify grouping by resource type

**Expected Results**:
- Permissions grouped by resource for easy UI rendering
- All platform permissions included
- Consistent structure
- Useful for permission selection interfaces

**Cleanup**: None