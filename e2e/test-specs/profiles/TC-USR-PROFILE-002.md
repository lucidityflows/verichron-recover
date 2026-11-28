### TC-USR-PROFILE-002: Organization Admin Invites New Team Member
**Tags**: `api-users`, `profiles`, `P0`, `happy-path`

**Preconditions**:
- Org admin authenticated with JWT
- Org admin has `user:create` permission
- Target email doesn't already exist

**Test Steps**:
1. POST `/users` with `x-org-id: org-123` and:
   ```json
   {
     "email": "collector@acme.com",
     "firstName": "Jane",
     "lastName": "Smith",
     "roleId": "collector-role-id"
   }
   ```
2. Verify response 201 Created
3. Verify user created with status `PENDING`
4. Verify `invitationToken` generated and stored
5. Verify `UserCreated` event published with:
   - `userId`, `email`, `organizationId`, `roleId`, `invitationToken`
6. Wait for event processing
7. Verify invitation email sent (check api-communications logs or mock)
8. Verify user appears in GET `/users?organizationId=org-123`

**Expected Results**:
- User created successfully in `PENDING` status
- Invitation token generated (24-hour expiry)
- Event published for downstream services
- User visible in organization's user list
- Invitation email queued/sent

**Cleanup**:
- Delete test user