### TC-ORG-ONBOARD-001: Platform Admin Successfully Onboards New Organization
**Tags**: `api-organizations`, `onboarding`, `P0`, `happy-path`

**Preconditions**:
- Platform admin user exists with `PLATFORM_ADMIN` role
- Valid JWT token for platform admin
- PostgreSQL and Pub/Sub services running

**Test Steps**:
1. Platform admin authenticates and receives JWT
2. POST `/onboarding` with payload:
   ```json
   {
     "organization": {
       "name": "Acme Collections",
       "displayName": "Acme",
       "organizationType": "AGENCY",
       "taxId": "12-3456789"
     },
     "initialAdmin": {
       "email": "admin@acme.com",
       "firstName": "John",
       "lastName": "Doe"
     }
   }
   ```
3. Verify response 201 Created with `orgId`
4. Verify `OrganizationCreated` event published to `organizations-v1` topic
5. GET `/onboarding/{orgId}/status`
6. Verify organization status is `ACTIVE`

**Expected Results**:
- Organization created with status `PROVISIONING` → `ACTIVE`
- Event payload includes all organization details + admin user info
- Organization record exists in `organizations_db`
- Response includes orgId, orgName, adminEmail

**Cleanup**:
- Delete test organization
- Delete test admin user (if provisioned)
