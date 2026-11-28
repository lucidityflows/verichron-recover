### TC-ORG-PROFILE-014: Cannot Have Multiple Primary Addresses
**Tags**: `api-organizations`, `profiles`, `P2`, `validation`

**Preconditions**:
- Organization has one primary address
- Org admin authenticated

**Test Steps**:
1. POST `/orgs/{orgId}/addresses` with `isPrimary: true`
2. Verify either:
   - Response 400 Bad Request (only one primary allowed), OR
   - Response 201 Created and previous primary updated to non-primary
3. GET `/orgs/{orgId}/addresses`
4. Verify only one address has `isPrimary: true`

**Expected Results**:
- Business rule enforced
- Only one primary address allowed
- Previous primary demoted or request rejected
- Consistent state maintained

**Cleanup**:
- Clean up test addresses