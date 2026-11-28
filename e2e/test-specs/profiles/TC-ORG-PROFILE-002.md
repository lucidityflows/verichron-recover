### TC-ORG-PROFILE-002: Platform Admin Suspends Organization
**Tags**: `api-organizations`, `profiles`, `api-users`, `profiles`, `P0`, `integration`

**Preconditions**:
- Test organization exists with status `ACTIVE`
- Organization has 3 active users
- Platform admin authenticated

**Test Steps**:
1. PATCH `/orgs/{orgId}` with `{ "status": "SUSPENDED" }`
2. Verify response 200 OK
3. Verify organization status changed to `SUSPENDED`
4. Verify `OrganizationStatusChanged` event published with:
   - `previousStatus`: "ACTIVE"
   - `newStatus`: "SUSPENDED"
5. Wait 2 seconds for event processing
6. Verify all 3 users in organization have status `SUSPENDED` (query api-users)
7. Attempt login as suspended user → verify 401 Unauthorized

**Expected Results**:
- Organization status updated successfully
- Event published with correct payload
- All organization users suspended (event-driven)
- Suspended users cannot authenticate

**Cleanup**:
- Reactivate organization
- Reactivate test users