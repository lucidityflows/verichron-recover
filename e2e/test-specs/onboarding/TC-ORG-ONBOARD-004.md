### TC-ORG-ONBOARD-004: Organization Created Event Triggers User Provisioning
**Tags**: `api-organizations`, `onboarding`, `api-users`, `profiles`, `P0`, `integration`, `async`

**Preconditions**:
- Platform admin authenticated
- Pub/Sub services running and healthy
- api-users event listener active

**Test Steps**:
1. POST `/onboarding` with valid payload including admin user details
2. Verify immediate response 201 Created (async provisioning)
3. Subscribe to `organizations-v1` topic
4. Verify `OrganizationCreated` event received with payload:
   ```json
   {
     "organizationId": "org-123",
     "organizationName": "Acme",
     "organizationType": "AGENCY",
     "adminUser": {
       "email": "admin@acme.com",
       "firstName": "John",
       "lastName": "Doe"
     }
   }
   ```
5. Wait up to 5 seconds
6. Query api-users: GET `/users?email=admin@acme.com`
7. Verify admin user created with:
   - Status: `PENDING`
   - Organization membership in Org 123
   - Role: ORG_ADMIN
   - Invitation token generated
8. Verify `UserCreated` event published by api-users

**Expected Results**:
- Event-driven provisioning works asynchronously
- No synchronous HTTP calls between services
- User created successfully via event
- Proper event chain: OrgCreated → UserCreated
- Retry mechanism handles transient failures

**Cleanup**:
- Delete test organization
- Delete test user