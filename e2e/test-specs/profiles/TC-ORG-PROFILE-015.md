### TC-ORG-PROFILE-015: Update and Delete Organization Address
**Tags**: `api-organizations`, `profiles`, `P1`

**Preconditions**:
- Organization has address
- Org admin authenticated

**Test Steps**:
1. PATCH `/orgs/{orgId}/addresses/{addressId}` with:
   ```json
   {
     "street1": "456 Oak Ave"
   }
   ```
2. Verify response 200 OK
3. GET `/orgs/{orgId}/addresses/{addressId}`
4. Verify street1 updated
5. DELETE `/orgs/{orgId}/addresses/{addressId}`
6. Verify response 204 No Content
7. GET `/orgs/{orgId}/addresses/{addressId}`
8. Verify 404 Not Found

**Expected Results**:
- Update works (partial)
- Delete works (cascade or soft delete)
- Proper status codes
- Address removed from list

**Cleanup**: None (address deleted in test)