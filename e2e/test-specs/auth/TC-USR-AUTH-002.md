### TC-USR-AUTH-002: User with Multiple Organizations Switches Context
**Tags**: `api-users`, `auth`, `P1`, `multi-tenancy`

**Preconditions**:
- User belongs to Org A (as ORG_ADMIN) and Org B (as ORG_MANAGER)
- User authenticated with JWT scoped to Org A

**Test Steps**:
1. Verify current JWT claims show `organizationId`: "org-a"
2. POST `/auth/switch-context` with current JWT
3. Verify response contains new ACT cookie
4. POST `/auth/token` with `{ "organizationId": "org-b" }`
5. Verify new JWT scoped to Org B
6. Decode JWT and verify:
   - `organizationId`: "org-b"
   - `permissions`: ORG_MANAGER permissions (different from Org A)
7. GET `/users` with `x-org-id: org-b` header
8. Verify only Org B users returned

**Expected Results**:
- Context switch successful
- New JWT has different scope and permissions
- User can access Org B resources
- User cannot access Org A resources with Org B JWT

**Cleanup**: None