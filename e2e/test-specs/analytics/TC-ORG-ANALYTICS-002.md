### TC-ORG-ANALYTICS-002: Dashboard Respects User Permissions
**Tags**: `api-organizations`, `analytics`, `P1`, `rbac`, `security`

**Preconditions**:
- Collector user authenticated (no `analytics:read` permission)
- Manager user authenticated (has `analytics:read` permission)

**Test Steps**:
1. **As Collector**:
   - GET `/organizations/{orgId}/dashboard-summary`
   - Verify 403 Forbidden
   - Verify error indicates `analytics:read` permission required

2. **As Manager**:
   - GET `/organizations/{orgId}/dashboard-summary`
   - Verify 200 OK
   - Verify dashboard data returned

**Expected Results**:
- Permission guard enforces `analytics:read` requirement
- Collectors cannot access dashboard
- Managers can access dashboard
- Clear permission error messages

**Cleanup**: None