### TC-ORG-PROFILE-009: Missing Required Header x-org-id Returns 400
**Tags**: `api-organizations`, `profiles`, `P0`, `validation`

**Preconditions**:
- Org-scoped user authenticated (not platform admin)

**Test Steps**:
1. GET `/orgs` without `x-org-id` header
2. Verify response 400 Bad Request
3. Verify error message indicates missing required header

**Expected Results**:
- Header validation enforced
- Clear error about missing context
- Request rejected before processing

**Cleanup**: None