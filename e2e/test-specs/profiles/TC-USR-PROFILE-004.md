### TC-USR-PROFILE-004: Manager Cannot Delete Users
**Tags**: `api-users`, `profiles`, `P1`, `rbac`, `negative`

**Preconditions**:
- Manager authenticated
- Manager has `user:read`, `user:create`, `user:update` permissions
- Manager lacks `user:delete` permission
- Target user exists

**Test Steps**:
1. DELETE `/users/{userId}`
2. Verify response 403 Forbidden
3. Verify error message indicates `user:delete` permission required
4. GET `/users/{userId}` to confirm user still exists

**Expected Results**:
- Delete action denied
- User unchanged
- Clear permission error
- Manager's other user permissions still work

**Cleanup**: None