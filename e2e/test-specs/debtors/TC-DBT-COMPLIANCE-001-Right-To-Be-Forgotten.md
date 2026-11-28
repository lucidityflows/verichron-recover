### TC-DBT-COMPLIANCE-001: Right-To-Be-Forgotten Soft Deletes Profile
**Tags**: `api-debtors`, `compliance`, `GDPR`, `P0`, `data-isolation`
**Tags**: `api-debtors`, `compliance`, `GDPR`, `P0`, `data-isolation`

**Preconditions**:
- A `DebtorIdentity` exists for a person.
- This identity is linked to two `DebtorProfile` records: one for `org-A` and one for `org-B`.
- An admin for `org-A` is authenticated and has `debtor:delete` permissions.

**Test Steps**:
1.  As Org A admin, issue a `DELETE /debtors/{orgAProfileId}` request to initiate the right-to-be-forgotten for their organization's instance of the debtor.
2.  Verify the API returns a `204 No Content` success status.
3.  Query the database for the `DebtorProfile` associated with `org-A`. Verify its `deletedAt` field is populated with a timestamp.
4.  Query the database for the core `DebtorIdentity` record. Verify it has **not** been deleted and its `deletedAt` field is `null`.
5.  Query the database for the `DebtorProfile` associated with `org-B`. Verify it has **not** been deleted and its `deletedAt` field is `null`.
6.  As Org A admin, attempt to `GET /debtors/{orgAProfileId}`. Verify the response is `404 Not Found`.
7.  As an admin for Org B, `GET /debtors/{orgBProfileId}`. Verify the request is still successful and returns the profile data for Org B.

**Expected Results**:
- A deletion request is correctly scoped to a single `DebtorProfile` within one organization.
- The request does not affect the central `DebtorIdentity` or other `DebtorProfile` records linked to that identity in other organizations.
- The deletion is a "soft delete," preserving the record for audit purposes but making it inaccessible through the API.
- This behavior correctly models the right-to-be-forgotten within the context of a single data controller (the organization).

**Cleanup**:
- Restore the soft-deleted profile (`deletedAt = null`) or delete all test records.
