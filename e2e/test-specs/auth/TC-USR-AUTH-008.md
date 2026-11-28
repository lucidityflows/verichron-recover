### TC-USR-AUTH-008: ACT Token Cannot Be Used for Regular Requests
**Tags**: `api-users`, `auth`, `P1`, `security`, `negative`

**Preconditions**:
- User completed Step 1 of login (has ACT cookie)
- ACT is valid but not yet exchanged for JWT

**Test Steps**:
1. Attempt to use ACT cookie for regular API request (e.g., GET `/users`)
2. Verify request rejected (401 Unauthorized)
3. Verify ACT only valid for `/auth/token` endpoint

**Expected Results**:
- ACT tokens only work for token exchange
- ACT cannot be used for general API access
- Clear security boundary between ACT and JWT

**Cleanup**: None