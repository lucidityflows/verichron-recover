### TC-ORG-PROFILE-001: Platform Admin Views All Organizations Across Tenants
**Tags**: `api-organizations`, `profiles`, `P1`, `multi-tenancy`

**Preconditions**:
- Platform admin authenticated
- Multiple organizations exist (Org A, Org B, Org C)

**Test Steps**:
1. GET `/orgs` (no `x-org-id` header required for platform admin)
2. Verify response 200 OK
3. Verify response includes organizations from multiple tenants
4. Apply filter: GET `/orgs?organizationType=AGENCY`
5. Verify filtered results

**Expected Results**:
- Platform admin sees all organizations regardless of tenant
- Pagination metadata present (`total`, `page`, `limit`)
- Filtering works correctly
- Response includes organization details (id, name, type, status)

**Cleanup**: None