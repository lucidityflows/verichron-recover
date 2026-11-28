### TC-USR-AUTH-001: Organization Admin Completes Two-Step Login
**Tags**: `api-users`, `auth`, `P0`, `happy-path`

**Preconditions**:
- Active user exists with email `admin@acme.com`
- User belongs to organization "Acme Collections"
- User has `ORG_ADMIN` role

**Test Steps**:
1. **Step 1 - Credentials Authentication**:
   - POST `/auth/login` with `{ "email": "admin@acme.com", "password": "password123" }`
   - Verify response 200 OK
   - Verify ACT cookie set (HttpOnly, Secure)
   - Verify response body contains:
     ```json
     {
       "availableOrganizations": [
         { "organizationId": "org-123", "organizationName": "Acme Collections" }
       ]
     }
     ```

2. **Step 2 - Organization Selection**:
   - POST `/auth/token` with `{ "organizationId": "org-123" }` (ACT cookie auto-sent)
   - Verify response 200 OK
   - Verify ACT cookie cleared
   - Verify response contains scoped JWT:
     ```json
     {
       "accessToken": "eyJhbGc...",
       "refreshToken": "eyJhbGc...",
       "expiresIn": 900
     }
     ```

3. **Verify JWT Payload**:
   - Decode JWT and verify:
     - `sub`: user-uuid
     - `https://verichroninc.com/claims.organizationId`: "org-123"
     - `https://verichroninc.com/claims.permissions`: includes "user:read", "user:create", etc.

4. **Attempt ACT Reuse** (negative test):
   - POST `/auth/token` again with same ACT
   - Verify 401 Unauthorized (ACT already consumed)

**Expected Results**:
- Two-step flow completes successfully
- ACT is single-use (stored in Redis with TTL)
- Final JWT is scoped to selected organization
- JWT contains all user permissions for that org
- User can make authenticated requests with JWT

**Cleanup**: None