### TC-ORG-ANALYTICS-003: Dashboard Handles Timeout Gracefully
**Tags**: `api-organizations`, `analytics`, `P2`, `performance`, `resilience`

**Preconditions**:
- One responding service (api-debts) is slow or unresponsive
- Org admin authenticated

**Test Steps**:
1. Mock api-debts to delay response > 5 seconds
2. GET `/organizations/{orgId}/dashboard-summary`
3. Verify response returns within 5 second timeout
4. Verify partial results (data from responding services only)
5. Verify graceful degradation (missing metrics handled)

**Expected Results**:
- Request doesn't hang indefinitely
- Timeout enforced
- Partial results returned
- No error thrown (or handled gracefully)
- User gets available data

**Cleanup**:
- Restore api-debts normal response time