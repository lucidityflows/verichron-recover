### TC-ORG-PROFILE-017: SQL Injection Prevented in Organization Query
**Tags**: `api-organizations`, `profiles`, `P0`, `security`

**Preconditions**:
- User authenticated

**Test Steps**:
1. GET `/orgs?name='; DROP TABLE organizations; --`
2. Verify request handled safely
3. Verify no SQL injection occurs
4. Verify organizations table intact
5. GET `/orgs` to confirm data still exists

**Expected Results**:
- Query sanitization prevents injection
- Parameterized queries used
- No tables dropped
- System remains secure

**Cleanup**: None