### TC-DBT-MODEL-001: A Single Debtor Identity Can Exist in Multiple Organizations
**Tags**: `api-debtors`, `profiles`, `P0`, `multi-tenancy`, `data-isolation`
**Tags**: `api-debtors`, `profiles`, `P0`, `multi-tenancy`, `data-isolation`

**Preconditions**:
- A single `DebtorIdentity` record for "Diana Prince" exists.
- A `DebtorProfile` for "Diana Prince" is linked to the identity and `organizationId: org-A`.
- A separate `DebtorProfile` for "Diana Prince" is linked to the **same identity** and `organizationId: org-B`.
- An admin for Org A is authenticated.
- An admin for Org B is authenticated.
- "Diana Prince" is a registered user (`userId` is linked to the `DebtorIdentity`) and is authenticated.

**Test Steps**:
1.  **Org A Admin**:
    - `GET /debtors` scoped to `org-A`. Verify only the `DebtorProfile` for Org A is returned.
    - `GET /debtors/{dianaPrinceOrgAProfileId}`. Verify the request succeeds.
    - `GET /debtors/{dianaPrinceOrgBProfileId}`. Verify the request fails with a 404 Not Found.
2.  **Org B Admin**:
    - `GET /debtors` scoped to `org-B`. Verify only the `DebtorProfile` for Org B is returned.
    - `GET /debtors/{dianaPrinceOrgBProfileId}`. Verify the request succeeds.
    - `GET /debtors/{dianaPrinceOrgAProfileId}`. Verify the request fails with a 404 Not Found.
3.  **Debtor User ("Diana Prince")**:
    - Authenticate as the debtor user.
    - `GET /debtors/my-profiles` (or equivalent endpoint).
    - Verify the response contains data from **both** the Org A profile and the Org B profile.

**Expected Results**:
- The data model correctly supports a one-to-many relationship between `DebtorIdentity` and `DebtorProfile`.
- API access for organization users is strictly scoped to their own organization's profiles. An admin in one org cannot see that a debtor also exists in another org.
- API access for the debtor user correctly aggregates all their profiles across multiple organizations.

**Cleanup**:
- Delete all created identities and profiles.
