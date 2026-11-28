### TC-USR-PROFILE-009: User List Pagination with Org Scope
**Tags**: `api-users`, `profiles`, `P1`, `pagination`, `multi-tenancy`

**Preconditions**:
- Org A has 30 users
- Org admin authenticated with Org A scope

**Test Steps**:
1. GET `/users?page=1&pageSize=10` with `x-org-id: org-a`
2. Verify response contains 10 users from Org A
3. Verify pagination metadata shows `total: 30`
4. GET `/users?page=3&pageSize=10`
5. Verify final 10 users from Org A
6. Verify all users belong to Org A (no Org B users)

**Expected Results**:
- Pagination scoped to organization
- Total count accurate for organization
- Multi-tenancy isolation maintained
- No cross-org data leakage

**Cleanup**: None