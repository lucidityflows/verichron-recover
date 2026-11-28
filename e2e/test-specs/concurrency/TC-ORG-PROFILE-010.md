### TC-ORG-PROFILE-010: Concurrent Organization Updates
**Tags**: `api-organizations`, `profiles`, `P2`, `concurrency`

**Preconditions**:
- Organization exists
- Two admin users authenticated

**Test Steps**:
1. Admin 1 and Admin 2 simultaneously PATCH `/orgs/{orgId}` with different fields
2. Verify both requests succeed (200 OK)
3. GET `/orgs/{orgId}` to verify final state
4. Verify both updates applied (last-write-wins or merge depending on implementation)
5. Verify events published for both updates

**Expected Results**:
- Concurrent updates handled gracefully
- No data corruption
- Events published for all changes
- Database handles concurrent writes

**Cleanup**:
- Restore original organization state