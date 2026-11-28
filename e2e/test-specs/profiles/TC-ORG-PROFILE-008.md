### TC-ORG-PROFILE-008: Malformed UUID Returns 400
**Tags**: `api-organizations`, `profiles`, `P1`, `validation`

**Preconditions**:
- User authenticated

**Test Steps**:
1. GET `/orgs/not-a-valid-uuid`
2. Verify response 400 Bad Request
3. Verify error message indicates invalid UUID format

**Expected Results**:
- Input validation enforced
- 400 for malformed input
- Clear validation error

**Cleanup**: None