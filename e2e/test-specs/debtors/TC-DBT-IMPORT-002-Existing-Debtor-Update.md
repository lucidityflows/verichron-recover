### TC-DBT-IMPORT-002: Portfolio Import Updates Existing Debtors
**Tags**: `api-debtors`, `import`, `P0`, `deduplication`
**Tags**: `api-debtors`, `import`, `P1`, `deduplication`

**Preconditions**:
- Org admin authenticated.
- A `DebtorIdentity` for "John Doe" with a specific SSN hash already exists in the database.
- A `DebtorProfile` for "John Doe" linked to the identity and `organizationId: org-A` exists, with an old address.

**Test Steps**:
1.  Mock and publish a `DEBTS_PORTFOLIO_DEBTOR_BATCH_READY` event. The payload should contain data for "John Doe" with the same SSN but a new address.
2.  Listen for outbound events from `api-debtors`.
3.  Verify that the `IdentityService.findOrCreateIdentity()` logic is triggered.
4.  Query the database to count the number of `DebtorIdentity` records for "John Doe" before and after the import.
5.  Verify that **no** new `DebtorIdentity` record was created.
6.  Query the `DebtorProfile` for "John Doe" in `org-A`.
7.  Verify that the profile has been updated with the new address from the import file.
8.  Wait for and capture a `DEBTORS_PROFILE_UPDATED` event.
9.  Verify the event payload contains the `debtorProfileId` and the updated fields.

**Expected Results**:
- The system correctly identifies the existing debtor based on SSN hash or email and does not create a duplicate identity.
- The existing `DebtorProfile` for the debtor within the organization is updated with the new information.
- A `DEBTORS_PROFILE_UPDATED` event is published, not `_CREATED` events.

**Cleanup**:
- Revert the changes to the `DebtorProfile` or delete and re-create the test records.
