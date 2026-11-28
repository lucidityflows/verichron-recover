### TC-ORG-PROFILE-012: Organization Filtering and Sorting
**Tags**: `api-organizations`, `profiles`, `P1`, `filtering`

**Preconditions**:
- Organizations exist with different types and statuses
- Platform admin authenticated

**Test Steps**:
1. GET `/orgs?organizationType=AGENCY`
2. Verify only AGENCY type organizations returned
3. GET `/orgs?status=ACTIVE&sortBy=createdAt&sortOrder=desc`
4. Verify only ACTIVE organizations returned
5. Verify results sorted by creation date (newest first)
6. GET `/orgs?name=acme` (partial match)
7. Verify organizations with "acme" in name returned

**Expected Results**:
- Filtering works correctly
- Sorting applied as specified
- Partial name matching works (case-insensitive)
- Filters can be combined

**Cleanup**: None