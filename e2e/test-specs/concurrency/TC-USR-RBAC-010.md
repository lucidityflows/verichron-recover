### TC-USR-RBAC-010: Concurrent Role Assignment to Same User
**Tags**: `api-users`, `rbac`, `P2`, `concurrency`

**Preconditions**:
- User exists with no role
- Two admins authenticated

**Test Steps**:
1. Admin 1 and Admin 2 simultaneously POST different roles to same user
2. Verify both requests process
3. Verify final role state (one role wins, or error)
4. Verify events published appropriately

**Expected Results**:
- Race condition handled
- User ends up with consistent state
- No orphaned role assignments
- Events accurate to final state

**Cleanup**:
- Remove role assignments