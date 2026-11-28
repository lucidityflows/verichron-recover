### TC-USR-AUTH-004: Collector Login and Token Contains Limited Permissions
**Tags**: `api-users`, `auth`, `rbac`, `P1`

**Preconditions**:
- Collector user exists with Collector role
- Collector role has only: `debt:read`, `debt:update:notes`, `payment:create`, `payment_plan:create`

**Test Steps**:
1. Complete two-step login as collector
2. Decode JWT and verify permissions array contains only:
   - `debt:read`
   - `debt:update:notes`
   - `payment:create`
   - `payment_plan:create`
3. Verify JWT does NOT contain:
   - `user:read`
   - `user:create`
   - `role:assign`
   - `orgs:settings:write`

**Expected Results**:
- JWT contains correct limited permission set
- No elevated permissions leaked
- Permission list matches Collector role definition

**Cleanup**: None