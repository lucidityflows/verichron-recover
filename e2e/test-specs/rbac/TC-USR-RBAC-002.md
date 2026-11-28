### TC-USR-RBAC-002: Organization Admin Assigns Role to User
**Tags**: `api-users`, `rbac`, `P0`, `happy-path`

**Preconditions**:
- Org admin authenticated
- Target user exists in same organization
- Custom role "Senior Collector" exists
- Org admin has `role:assign` permission

**Test Steps**:
1. POST `/rbac/users/{userId}/roles` with:
   ```json
   {
     "roleId": "senior-collector-role-id"
   }
   ```
2. Verify response 200 OK
3. Verify `RoleAssigned` event published
4. Verify user's `user_memberships` record updated with new `roleId`
5. Have user log out and log back in
6. Verify new JWT contains permissions from "Senior Collector" role
7. User attempts to access `/analytics` (report:read permission)
8. Verify 200 OK (access granted)

**Expected Results**:
- Role assigned successfully
- User membership updated
- New permissions available after re-authentication
- User can access newly permitted resources
- Event published for audit trail

**Cleanup**:
- Remove role assignment
- Delete custom role