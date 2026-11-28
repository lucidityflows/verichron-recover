### TC-ORG-PROFILE-011: Organization List Pagination
**Tags**: `api-organizations`, `profiles`, `P1`, `pagination`

**Preconditions**:
- 50 organizations exist
- Platform admin authenticated

**Test Steps**:
1. GET `/orgs?page=1&pageSize=20`
2. Verify response contains 20 organizations
3. Verify pagination metadata:
   ```json
   {
     "meta": {
       "total": 50,
       "page": 1,
       "pageSize": 20,
       "totalPages": 3
     }
   }
   ```
4. GET `/orgs?page=2&pageSize=20`
5. Verify different 20 organizations returned
6. GET `/orgs?page=3&pageSize=20`
7. Verify final 10 organizations returned

**Expected Results**:
- Pagination works correctly
- Correct metadata returned
- No duplicate or missing records across pages
- Consistent ordering

**Cleanup**: None