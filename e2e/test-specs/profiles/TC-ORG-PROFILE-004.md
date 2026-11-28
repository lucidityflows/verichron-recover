### TC-ORG-PROFILE-004: Organization Name Change Propagates to api-users
**Tags**: `api-organizations`, `profiles`, `api-users`, `profiles`, `P1`, `integration`

**Preconditions**:
- Organization "Acme Collections" exists with 2 users
- Org admin authenticated

**Test Steps**:
1. PATCH `/orgs/{orgId}` with:
   ```json
   {
     "name": "Acme Collection Agency LLC"
   }
   ```
2. Verify response 200 OK
3. Verify both events published:
   - `OrganizationUpdated` (general)
   - `OrganizationNameChanged` (specific) with `previousName` and `newName`
4. Wait 2 seconds for event processing
5. Query api-users `user_memberships` table for users in this org
6. Verify `organizationName` column updated to "Acme Collection Agency LLC"
7. User logs out and logs back in
8. Verify organization selection list shows updated name

**Expected Results**:
- Organization name updated in api-organizations
- Specific `OrganizationNameChanged` event published
- Denormalized name in api-users updated via event
- Users see updated name at login (no api-organizations call needed)
- Eventual consistency maintained

**Cleanup**:
- Restore original organization name