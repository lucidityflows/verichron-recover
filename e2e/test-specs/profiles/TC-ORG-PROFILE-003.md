### TC-ORG-PROFILE-003: Platform Admin Reactivates Suspended Organization
**Tags**: `api-organizations`, `profiles`, `P1`, `integration`

**Preconditions**:
- Test organization exists with status `SUSPENDED`
- Organization users are suspended

**Test Steps**:
1. PATCH `/orgs/{orgId}` with `{ "status": "ACTIVE" }`
2. Verify response 200 OK
3. Verify `OrganizationStatusChanged` event published
4. Wait for event processing
5. Verify users can now authenticate successfully

**Expected Results**:
- Organization reactivated
- Users reactivated via event cascade
- Users can log in and access resources

**Cleanup**:
- Reset organization status if needed