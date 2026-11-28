### TC-USR-RBAC-001: Organization Admin Creates Custom Role
**Tags**: `api-users`, `rbac`, `P1`, `happy-path`

**Preconditions**:
- Org admin authenticated
- Org admin has `role:create` permission

**Test Steps**:
1. POST `/rbac/roles` with `x-org-id: org-123` and:
   ```json
   {
     "name": "Senior Collector",
     "description": "Collector with additional reporting access",
     "permissionIds": [
       "debt:read", "debt:update:notes", "payment:create", "report:read"
     ]
   }
   ```
2. Verify response 201 Created
3. Verify role created with `isSystemRole: false`
4. Verify `RoleCreated` event published
5. GET `/rbac/roles/{roleId}`
6. Verify role includes assigned permissions
7. Verify role scoped to `organizationId: org-123`

**Expected Results**:
- Custom role created successfully
- Role is organization-scoped (not visible to other orgs)
- Permissions correctly assigned
- Role marked as custom (not system role)
- Event published for audit logging

**Cleanup**:
- Delete custom role