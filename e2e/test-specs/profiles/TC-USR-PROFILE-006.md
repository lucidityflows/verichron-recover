### TC-USR-PROFILE-006: User Queries Return Only Own Organization Users
**Tags**: `api-users`, `profiles`, `P0`, `multi-tenancy`, `security`

**Preconditions**:
- Org A has 5 users
- Org B has 3 users
- User belongs to Org A
- User authenticated with JWT scoped to Org A

**Test Steps**:
1. GET `/users` with `x-org-id: org-a`
2. Verify response contains 5 users (all from Org A)
3. Verify no Org B users in response
4. Attempt to GET `/users/{orgBUserId}` (specific user from Org B)
5. Verify 404 Not Found (user doesn't exist in Org A context)

**Expected Results**:
- Complete user isolation
- Queries automatically scoped to organization
- Cannot access users from other organizations
- Database-level filtering applied (not application-level)

**Cleanup**: None