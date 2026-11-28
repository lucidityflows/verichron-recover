### TC-USR-PROFILE-001: New Organization Admin Activates Account
**Tags**: `api-users`, `profiles`, `P0`, `happy-path`

**Preconditions**:
- User record exists with status `PENDING`
- Valid `invitationToken` generated
- Token not expired (< 24 hours old)

**Test Steps**:
1. Receive invitation email with activation link containing `invitationToken`
2. POST `/users/{userId}/activate` with:
   ```json
   {
     "invitationToken": "token-12345",
     "password": "SecurePass123!"
   }
   ```
3. Verify response 200 OK
4. Verify user status changed from `PENDING` to `ACTIVE`
5. Verify `UserActivated` event published
6. Verify `invitationToken` consumed and deleted
7. Attempt to reuse same token → verify 400 Bad Request

**Expected Results**:
- User activated successfully
- Password hashed with bcrypt (never stored plaintext)
- Token is single-use only
- Event published with userId and organizationId
- User can now authenticate

**Cleanup**:
- Delete test user