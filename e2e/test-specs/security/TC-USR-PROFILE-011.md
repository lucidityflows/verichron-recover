### TC-USR-PROFILE-011: XSS Prevention in User Input
**Tags**: `api-users`, `profiles`, `P1`, `security`

**Preconditions**:
- Org admin authenticated

**Test Steps**:
1. POST `/users` with malicious input:
   ```json
   {
     "firstName": "<script>alert('XSS')</script>",
     "lastName": "Smith",
     "email": "test@example.com"
   }
   ```
2. Verify user created
3. GET `/users/{userId}`
4. Verify script tags either:
   - Sanitized/escaped in storage, OR
   - Escaped in response serialization

**Expected Results**:
- XSS payload not executable
- Data sanitized or escaped
- System remains secure
- No script execution in UI

**Cleanup**:
- Delete test user