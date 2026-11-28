### TC-ORG-PROFILE-007: Invalid Organization ID Returns 404
**Tags**: `api-organizations`, `profiles`, `P1`, `error-handling`

**Preconditions**:
- User authenticated

**Test Steps**:
1. GET `/orgs/non-existent-uuid`
2. Verify response 404 Not Found
3. Verify error message indicates organization not found
4. Verify error response structure matches ErrorResponseDto

**Expected Results**:
- Proper 404 status code
- Clear error message
- Consistent error response format

**Cleanup**: None