### TC-DBT-LINK-001: Debtor User Creation Event Links User ID to Identity
**Tags**: `api-debtors`, `api-users`, `integration`, `P0`, `event-driven`
**Tags**: `api-debtors`, `api-users`, `integration`, `P0`, `event-driven`

**Preconditions**:
- A `DebtorIdentity` exists in the `api-debtors` database with `userId` set to `null`. The identity has a known `debtorId` and `email`.
- The `DebtorUserCreatedBatchListener` in `api-debtors` is running and subscribed to the `USERS_DEBTOR_USER_CREATED_BATCH` topic.
- Pub/Sub emulator is running.

**Test Steps**:
1.  Mock and publish a `USERS_DEBTOR_USER_CREATED_BATCH` event to the appropriate Pub/Sub topic.
2.  The event payload should contain a batch with one entry, including the debtor's `email` and the newly created `userId` from `api-users`.
3.  Listen for outbound events from `api-debtors`.
4.  Verify that the `DebtorUserCreatedBatchListener` consumes the event successfully (check logs for "Batch of size 1 processed for user-debtor linkage").
5.  Query the `DebtorIdentity` table in the `api-debtors` database for the record matching the debtor's email.
6.  Verify that the `userId` column for that record has been updated from `null` to the `userId` sent in the event.
7.  Wait for and capture the `DEBTORS_USER_LINKED` event published by `api-debtors`.
8.  Verify the event payload contains the correct `userId` and `debtorId`.

**Expected Results**:
- The `api-debtors` service correctly consumes the user creation event from `api-users`.
- The `IdentityService.linkUserToIdentity` method is successfully called.
- The `userId` is correctly and permanently linked to the `DebtorIdentity`.
- A `DEBTORS_USER_LINKED` event is broadcast to notify other systems of the successful linkage.

**Cleanup**:
- Update the `DebtorIdentity` record to set `userId` back to `null`.
