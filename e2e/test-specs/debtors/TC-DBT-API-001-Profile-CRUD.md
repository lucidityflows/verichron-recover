### TC-DBT-API-001: Debtor Profile CRUD Operations
**Tags**: `api-debtors`, `profiles`, `P1`, `api`, `rbac`
**Tags**: `api-debtors`, `profiles`, `P1`, `api`, `rbac`

**Preconditions**:
- An admin for `org-A` is authenticated with `debtor:create`, `debtor:read`, `debtor:update`, `debtor:delete` permissions.
- An admin for `org-B` is authenticated.

**Test Steps**:
1.  **CREATE**:
    - As Org A admin, `POST /debtors` with new debtor information.
    - Verify `201 Created` response.
    - Verify the response body contains the new `debtorProfileId`.
    - Query the database to confirm the `DebtorProfile` was created and is linked to `org-A`.
2.  **READ**:
    - As Org A admin, `GET /debtors/{newProfileId}`.
    - Verify `200 OK` response with the correct debtor data.
3.  **UPDATE**:
    - As Org A admin, `PATCH /debtors/{newProfileId}` with an updated phone number.
    - Verify `200 OK` response.
    - `GET` the profile again and verify the phone number was updated.
4.  **LIST**:
    - As Org A admin, `GET /debtors`.
    - Verify the newly created debtor appears in the list.
5.  **DELETE (Soft)**:
    - As Org A admin, `DELETE /debtors/{newProfileId}`.
    - Verify `204 No Content` response.
    - Query the database and verify the `deletedAt` timestamp is set on the profile.
    - `GET /debtors/{newProfileId}` and verify a `404 Not Found` is returned.
6.  **SECURITY (Data Isolation)**:
    - As Org B admin, attempt to `GET /debtors/{newProfileId}`.
    - Verify `404 Not Found` response, proving cross-organization access is blocked.

**Expected Results**:
- All standard CRUD operations function as expected via the API.
- All operations are correctly scoped to the user's organization.
- Permissions are correctly enforced.
- Deletion is a soft delete, preserving the record for audit purposes.

**Cleanup**:
- Permanently delete the test records from the database.
