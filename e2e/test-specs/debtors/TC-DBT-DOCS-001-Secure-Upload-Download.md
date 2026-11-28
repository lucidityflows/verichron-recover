### TC-DBT-DOCS-001: Secure Document Upload and Download
**Tags**: `api-debtors`, `documents`, `GCS`, `P1`, `security`, `blocked`
**Tags**: `api-debtors`, `documents`, `GCS`, `P1`, `security`, `blocked`

**Preconditions**:
- A `DebtorProfile` exists.
- An Org Admin is authenticated with `debtor:documents:create` and `debtor:documents:read` permissions.
- GCS integration is functional and configured (or is mocked at the service boundary).

**Test Steps**:
1.  **Request Upload URL**:
    - As Org Admin, `POST /debtors/{profileId}/documents` with metadata: `{ "fileName": "proof_of_debt.pdf", "fileType": "application/pdf" }`.
    - Verify `201 Created` response.
    - Verify the response body contains a `documentId` and a `uploadUrl` (a GCS signed URL for PUT).
2.  **Upload File**:
    - Make a `PUT` request to the provided `uploadUrl` with the file content and correct `Content-Type` header.
    - Verify the upload to GCS (or the mock) is successful (`200 OK`).
3.  **Finalize Upload**:
    - The `api-debtors` service needs a mechanism to confirm the upload is complete (e.g., a GCS event or a callback endpoint). Verify this step occurs.
    - Verify the document's status in the database is updated to `UPLOADED`.
4.  **Request Download URL**:
    - As Org Admin, `POST /debtors/{profileId}/documents/{documentId}/create-download-url`.
    - Verify `201 Created` response.
    - Verify the response body contains a `downloadUrl` (a GCS signed URL for GET with a short expiry, e.g., 5 minutes).
5.  **Download and Verify Expiry**:
    - `GET` the `downloadUrl` and verify the file content is returned.
    - Wait for the URL to expire (e.g., 5 minutes).
    - Attempt to `GET` the `downloadUrl` again and verify the request is denied (e.g., `403 Forbidden`).

**Expected Results**:
- The service can successfully generate signed URLs for both upload and download.
- The client interacts directly with the storage provider using the signed URLs, keeping traffic off the API server.
- Download URLs are time-limited for security.
- Document metadata is correctly stored and tracked in the `api-debtors` database.

**Cleanup**:
- Delete the document from GCS and remove the metadata record from the database.
