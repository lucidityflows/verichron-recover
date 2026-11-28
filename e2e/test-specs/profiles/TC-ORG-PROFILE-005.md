### TC-ORG-PROFILE-005: User Can Only See Own Organization Data
**Tags**: `api-organizations`, `profiles`, `P0`, `multi-tenancy`, `security`

**Preconditions**:
- User belongs to Org A only
- Org B exists with data
- User authenticated with JWT scoped to Org A

**Test Steps**:
1. GET `/orgs` with `x-org-id: org-a`
2. Verify response contains Org A data only
3. GET `/orgs/{orgBId}` with `x-org-id: org-a`
4. Verify 404 Not Found or 403 Forbidden
5. Attempt to set `x-org-id: org-b` header
6. Verify request denied (user not member of Org B)

**Expected Results**:
- Complete data isolation between organizations
- User cannot access other organization's data
- Header validation prevents org spoofing
- Proper error codes (403 vs 404)

**Cleanup**: None