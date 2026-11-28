### TC-USR-AUTH-010: High Concurrent Login Load
**Tags**: `api-users`, `auth`, `P2`, `performance`

**Preconditions**:
- 100 test users exist
- Load testing tool available

**Test Steps**:
1. Simulate 100 concurrent login requests (Step 1)
2. Measure response times
3. Verify all succeed with 200 OK
4. Verify ACT cookies issued to all
5. Simulate 100 concurrent token exchanges (Step 2)
6. Verify all succeed
7. Verify JWTs issued correctly
8. Check Redis for ACT consumption tracking

**Expected Results**:
- System handles concurrent load
- All users can log in simultaneously
- Response times acceptable (< 2s p95)
- No race conditions in ACT handling
- Redis handles concurrent writes

**Cleanup**:
- Clean up test users