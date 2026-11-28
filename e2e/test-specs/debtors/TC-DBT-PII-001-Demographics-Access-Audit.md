### TC-DBT-PII-001: Audited Access to Sensitive PII
**Tags**: `api-debtors`, `demographics`, `PII`, `audit`, `P0`, `security`
**Tags**: `api-debtors`, `demographics`, `PII`, `audit`, `P0`, `security`, `blocked`

**Preconditions**:
- A `DebtorProfile` exists with an associated `Demographics` record containing an encrypted SSN.
- An admin user, "PiiViewer", is authenticated and has the `debtor:pii:read` permission.
- A collector user, "RegularUser", is authenticated and **lacks** the `debtor:pii:read` permission.
- The SSN encryption/decryption mechanism is functional.
- An audit event listener is active.

**Test Steps**:
1.  **Unauthorized Access Attempt**:
    - As "RegularUser", `GET /debtors/{profileId}/demographics`.
    - Verify the response is `403 Forbidden`.
    - Verify no PII data is returned.
    - Verify no audit event for PII access is generated.
2.  **Authorized Access**:
    - As "PiiViewer", `GET /debtors/{profileId}/demographics`.
    - Verify the response is `200 OK`.
    - Verify the response body contains the decrypted SSN.
3.  **Audit Verification**:
    - Wait for and capture the `PII_DATA_ACCESSED` audit event.
    - Verify the event payload contains:
        - `accessorUserId`: The `userId` of "PiiViewer".
        - `targetDebtorId`: The `debtorId` that was accessed.
        - `organizationId`: The organization context of the request.
        - `piiFields`: An array of fields accessed, e.g., `["ssn"]`.
        - `timestamp`: The time of access.

**Expected Results**:
- Access to PII is strictly controlled by the `debtor:pii:read` permission.
- The service correctly decrypts PII for authorized users.
- Every successful access to PII generates a detailed, non-repudiable audit event.
- Unauthorized attempts are blocked and do not generate access audit logs.

**Cleanup**:
- No cleanup required if audit logs are append-only.
