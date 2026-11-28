### TC-DBT-IMPORT-001: Portfolio Import Creates New Debtors
**Tags**: `api-debtors`, `import`, `P0`, `happy-path`, `event-driven`
**Tags**: `api-debtors`, `import`, `P0`, `happy-path`, `event-driven`

**Preconditions**:
- Org admin authenticated.
- Pub/Sub emulator is running and accessible.
- `api-debtors` is listening for `DEBTS_PORTFOLIO_DEBTOR_BATCH_READY` events.

**Test Steps**:
1.  Mock and publish a `DEBTS_PORTFOLIO_DEBTOR_BATCH_READY` event with a payload containing a batch of new debtor data (e.g., 2 new debtors).
2.  The event payload should include names, contact info, and unique identifiers like SSN.
3.  Listen for outbound events from `api-debtors`.
4.  Verify that the `ImportsModule` correctly processes the batch.
5.  Wait for and capture the `DEBTORS_IDENTITY_CREATED` events (one for each new debtor).
6.  Wait for and capture the `DEBTORS_PROFILE_CREATED` events (one for each new debtor).
7.  Query the `api-debtors` database directly.
8.  Verify that a new `DebtorIdentity` record has been created for each debtor.
9.  Verify that a new `DebtorProfile` record has been created for each debtor, linked to the correct `DebtorIdentity` and the correct `organizationId`.
10. Verify that contact information (email, phone) has been correctly associated with the new profiles.

**Expected Results**:
- The import process runs successfully upon receiving the event.
- The correct number of `DebtorIdentity` and `DebtorProfile` records are created.
- Data from the event payload is correctly persisted in the database.
- The appropriate success events (`DEBTORS_IDENTITY_CREATED`, `DEBTORS_PROFILE_CREATED`) are published for downstream consumers.
- There are no duplicate records created.

**Cleanup**:
- Delete the created `DebtorIdentity`, `DebtorProfile`, and associated contact records.
