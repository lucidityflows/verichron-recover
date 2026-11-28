### TC-USR-PROFILE-007: Duplicate Email Registration Prevented
**Tags**: `api-users`, `profiles`, `P1`, `validation`

**Preconditions**:
- User exists with email `existing@example.com`
- Org admin authenticated

**Test Steps**:
1. POST `/users` with email `existing@example.com`
2. Verify response 409 Conflict
3. Verify error message indicates email already exists
4. Verify no duplicate user created

**Expected Results**:
- Duplicate detection works
- 409 Conflict status code
- Clear error message
- Database constraint enforced

**Cleanup**: None