### TC-ORG-PROFILE-006: Settings Update Event Consumed by Other Services
**Tags**: `api-organizations`, `settings`, `P2`, `integration`, `async`

**Preconditions**:
- Organization exists
- Mock subscriber listening to `organizations-v1` topic
- Org admin authenticated

**Test Steps**:
1. PATCH `/organizations/{orgId}/settings` to update compliance settings
2. Verify `OrganizationSettingsUpdated` event published
3. Verify event payload includes:
   - `organizationId`
   - `updatedSettingKeys`: ["compliance.fdcpa_strict_mode"]
   - `updatedBy`: admin user ID
4. Mock subscriber receives event
5. Verify subscriber can query GET `/organizations/{orgId}/settings` for full settings

**Expected Results**:
- Event published immediately after update
- Subscribers receive notification of change
- Event contains enough info to decide if action needed
- Subscribers can fetch full settings if needed (thin events)

**Cleanup**:
- Restore original settings
- Remove mock subscriber