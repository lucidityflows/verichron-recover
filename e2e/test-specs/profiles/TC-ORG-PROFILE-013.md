### TC-ORG-PROFILE-013: Add Primary Address to Organization
**Tags**: `api-organizations`, `profiles`, `P1`, `happy-path`

**Preconditions**:
- Organization exists
- Org admin authenticated

**Test Steps**:
1. POST `/orgs/{orgId}/addresses` with:
   ```json
   {
     "street1": "123 Main St",
     "city": "Springfield",
     "state": "IL",
     "postalCode": "62701",
     "country": "US",
     "isPrimary": true,
     "addressCategory": "HEADQUARTERS"
   }
   ```
2. Verify response 201 Created
3. Verify address ID returned
4. GET `/orgs/{orgId}/addresses`
5. Verify address in list with `isPrimary: true`

**Expected Results**:
- Address created successfully
- Primary flag respected
- Address linked to organization
- Accessible via list endpoint

**Cleanup**:
- Delete test address