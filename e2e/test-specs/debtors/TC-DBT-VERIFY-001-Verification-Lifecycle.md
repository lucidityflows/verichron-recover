### TC-DBT-VERIFY-001: Debtor Profile Verification Lifecycle
**Tags**: `api-debtors`, `verification`, `workflow`, `P1`, `event-driven`
**Tags**: `api-debtors`, `verification`, `workflow`, `P1`, `event-driven`

**Preconditions**:
- A `DebtorProfile` exists.
- An Org Admin is authenticated with `debtor:verification:create` permission.
- An event listener is subscribed to verification-related events.

**Test Steps**:
1.  **Initiate Verification**:
    - As Org Admin, `POST /debtors/{profileId}/verifications` with a payload specifying the verification type (e.g., `{ "method": "ID_AND_ADDRESS" }`).
    - Verify the response is `201 Created` and contains the new `verificationId`.
    - Query the database and confirm a `verifications` record was created with `status: 'PENDING'`.
    - Wait for and capture a `DEBTOR_VERIFICATION_REQUESTED` event and verify its payload.
2.  **Transition to In Progress (Mock)**:
    - Simulate an external system picking up the job by making an internal API call to update the status: `PATCH /verifications/{verificationId}` with `{ "status": "IN_PROGRESS" }`.
    - Verify the database record now shows `status: 'IN_PROGRESS'`.
    - Capture the `DEBTOR_VERIFICATION_STATUS_UPDATED` event.
3.  **Transition to Verified (Mock)**:
    - Simulate the external system completing the job successfully: `PATCH /verifications/{verificationId}` with `{ "status": "VERIFIED", "verifiedAt": "..." }`.
    - Verify the database record now shows `status: 'VERIFIED'`.
    - Capture another `DEBTOR_VERIFICATION_STATUS_UPDATED` event with the new status.
4.  **Read Status**:
    - `GET /debtors/{profileId}/verifications`.
    - Verify the list of verification attempts includes the completed request with the correct final status.

**Expected Results**:
- The verification workflow can be initiated via the API.
- The status of a verification request transitions correctly through its lifecycle (`PENDING` -> `IN_PROGRESS` -> `VERIFIED`/`FAILED`).
- Each significant status change publishes a corresponding event for other systems to consume.
- The history of verification attempts is correctly associated with the debtor profile.

**Cleanup**:
- Delete the created `verifications` record.
