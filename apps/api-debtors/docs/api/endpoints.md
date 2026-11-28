## API Endpoints (High-Level)

All endpoints require authentication and enforce organization-scoped access via the platform's standard authorization pipeline.

### Core Debtors Module (Profiles & Identity)
*   `GET /debtors` - List `DebtorProfiles` (with filters, pagination).
*   `GET /debtors/{id}` - Get `DebtorProfile` by ID.
*   `POST /debtors` - Create a new `DebtorProfile` (and `DebtorIdentity` if new).
*   `PUT /debtors/{id}` - Update a `DebtorProfile`.
*   `PATCH /debtors/{id}` - Partially update a `DebtorProfile`.
*   `DELETE /debtors/{id}` - Soft delete a `DebtorProfile`.
*   `POST /debtors/{id}/invite` - Invite a debtor to link to a user account.
*   `POST /debtors/invite-portfolio` - Invite all debtors from a portfolio.

### Contact Information (Sub-resources of Profiles)
*   **Addresses**
    *   `GET /debtors/{id}/addresses` - List addresses for a `DebtorProfile`.
    *   `POST /debtors/{id}/addresses` - Add address to a `DebtorProfile`.
    *   `GET /debtors/{id}/addresses/{addressId}` - Get a specific address.
    *   `PUT /debtors/{id}/addresses/{addressId}` - Update a `DebtorAddress`.
    *   `DELETE /debtors/{id}/addresses/{addressId}` - Remove a `DebtorAddress`.
*   **Emails**
    *   `GET /debtors/{id}/emails` - List emails for a `DebtorProfile`.
    *   `POST /debtors/{id}/emails` - Add email to a `DebtorProfile`.
    *   `GET /debtors/{id}/emails/{emailId}` - Get a specific email.
    *   `PUT /debtors/{id}/emails/{emailId}` - Update a `DebtorEmail`.
    *   `DELETE /debtors/{id}/emails/{emailId}` - Remove a `DebtorEmail`.
*   **Phone Numbers**
    *   `GET /debtors/{id}/phones` - List phone numbers for a `DebtorProfile`.
    *   `POST /debtors/{id}/phones` - Add phone number to a `DebtorProfile`.
    *   `GET /debtors/{id}/phones/{phoneId}` - Get a specific phone number.
    *   `PUT /debtors/{id}/phones/{phoneId}` - Update a `DebtorPhone`.
    *   `DELETE /debtors/{id}/phones/{phoneId}` - Remove a `DebtorPhone`.

### Demographics
*   `GET /debtors/{id}/demographics` - Get `DebtorDemographics` for a `DebtorProfile`.
*   `POST /debtors/{id}/demographics` - Create `DebtorDemographics` record.
*   `PUT /debtors/{id}/demographics` - Update `DebtorDemographics`.
*   `PATCH /debtors/{id}/demographics` - Partial update of `DebtorDemographics`.
*   `DELETE /debtors/{id}/demographics` - Soft delete `DebtorDemographics`.

### Verification
*   `GET /debtors/{id}/verifications` - List `VerificationRequests` for a `DebtorProfile`.
*   `POST /debtors/{id}/verifications` - Request a new verification.
*   `GET /debtors/{id}/verifications/{verificationId}` - Get `VerificationRequest` details.
*   `POST /debtors/{id}/verifications/{verificationId}/retry` - Retry a failed verification.
*   `GET /debtors/{id}/verifications/statistics` - Get verification statistics.

### Documents
*   `GET /debtors/{id}/documents` - List `Document` metadata for a `DebtorProfile`.
*   `POST /debtors/{id}/documents` - Upload document and create metadata.
*   `GET /debtors/{id}/documents/{documentId}` - Get `Document` metadata.
*   `PUT /debtors/{id}/documents/{documentId}` - Update `Document` metadata.
*   `DELETE /debtors/{id}/documents/{documentId}` - Soft delete (archive) a `Document`.
*   `POST /debtors/{id}/documents/{documentId}/archive` - Explicitly archive a `Document`.
*   `GET /debtors/{id}/documents/{documentId}/download` - Generate signed URL for download.
*   `GET /debtors/{id}/documents/storage-usage` - Get total storage used.

### Internal Endpoints (Analytics)
These endpoints are for internal service-to-service communication only and are not exposed externally.
*   `GET /internal/analytics/dashboard-summary/:organizationId` - Get a high-level summary of debtor data for a dashboard.
*   `GET /internal/analytics/flow/:organizationId` - Get flow analytics (e.g., by state) for debtor visualization.
*   `GET /internal/analytics/geographic/debtors/:organizationId` - Get geographic distribution of debtors by state.
*   `GET /internal/analytics/debtor-focus/:organizationId/:debtorProfileId` - Retrieve a complete debtor profile with all contact information for a detailed view.


