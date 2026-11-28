### TC-USR-PROFILE-010: User Actions Include Audit Trail
**Tags**: `api-users`, `profiles`, `P2`, `audit`

**Preconditions**:
- Org admin authenticated
- RequestContext captures user info

**Test Steps**:
1. POST `/users` to create user
2. Verify `UserCreated` event includes `createdBy` field with admin user ID
3. PATCH `/users/{userId}` to update user
4. Verify `UserProfileUpdated` event includes `updatedBy` field
5. DELETE `/users/{userId}` to deactivate
6. Verify `UserStatusChanged` event includes `changedBy` field

**Expected Results**:
- All state changes include actor information
- Events suitable for audit logging
- RequestContext provides consistent user tracking
- Audit trail complete

**Cleanup**:
- Delete test user