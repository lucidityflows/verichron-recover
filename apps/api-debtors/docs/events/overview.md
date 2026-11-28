## Events

### Published Events

This service publishes comprehensive events to integrate into the platform's event-driven architecture.

#### Identity Events
*   **`DEBTORS_IDENTITY_CREATED`** (`debtors.identity.created`): Published when a new global `DebtorIdentity` is created.
*   **`DEBTORS_USER_LINKED`** (`debtors.identity.user_linked`): Published when a `userId` from `api-users` is linked to a `DebtorIdentity`.

#### Profile Events
*   **`DEBTORS_PROFILE_CREATED`** (`debtors.profile.created`): Published when a new organization-specific `DebtorProfile` is created.
*   **`DEBTORS_PROFILE_UPDATED`** (`debtors.profile.updated`): Published when a `DebtorProfile` is modified or soft deleted.
*   **`DEBTORS_PROFILE_INVITED`** (`debtors.profile.invited`): Published when a debtor is invited to register.
*   **`DEBTORS_PROFILE_ADDRESS_UPDATED`** (`debtors.profile.address_updated`): Published when a `DebtorAddress` is added, updated, or removed.
*   **`DEBTORS_PROFILE_EMAIL_UPDATED`** (`debtors.profile.email_updated`): Published when a `DebtorEmail` is added, updated, or removed.
*   **`DEBTORS_PROFILE_PHONE_UPDATED`** (`debtors.profile.phone_updated`): Published when a `DebtorPhone` is added, updated, or removed.
*   **`DEBTORS_PROFILE_INFORMATION_RECEIVED`** (`debtors.profile.information_received`): Published when debtor information is received from external sources.
*   **`DEBTORS_PROFILE_VERIFICATION_STATUS_CHANGED`** (`debtors.profile.verification_status_changed`): Published when verification status changes.

#### Demographics Events
*   **`DEBTORS_DEMOGRAPHICS_CREATED`** (`debtors.demographics.created`): Published when a `DebtorDemographics` record is created.
*   **`DEBTORS_DEMOGRAPHICS_UPDATED`** (`debtors.demographics.updated`): Published when a `DebtorDemographics` record is updated or soft deleted.
*   **`DEBTORS_DEMOGRAPHICS_DELETED`** (`debtors.demographics.deleted`): Published when a `DebtorDemographics` record is deleted.

#### Verification Events
*   **`DEBTORS_VERIFICATIONS_VERIFICATION_REQUESTED`** (`debtors.verifications.verification_requested`): Published when a new `VerificationRequest` is initiated.
*   **`DEBTORS_VERIFICATIONS_VERIFICATION_COMPLETED`** (`debtors.verifications.verification_completed`): Published when a `VerificationRequest` successfully completes.
*   **`DEBTORS_VERIFICATIONS_VERIFICATION_FAILED`** (`debtors.verifications.verification_failed`): Published when a `VerificationRequest` fails.

#### Document Events
*   **`DEBTORS_DOCUMENTS_DOCUMENT_UPLOADED`** (`debtors.documents.document_uploaded`): Published when a `Document` is uploaded.
*   **`DEBTORS_DOCUMENTS_DOCUMENT_UPDATED`** (`debtors.documents.document_updated`): Published when a `Document` metadata is updated.
*   **`DEBTORS_DOCUMENTS_DOCUMENT_DELETED`** (`debtors.documents.document_deleted`): Published when a `Document` is deleted.
*   **`DEBTORS_DOCUMENTS_DOCUMENT_ARCHIVED`** (`debtors.documents.document_archived`): Published when a `Document` is soft deleted (archived).

#### Import Events
*   **`DEBTORS_IMPORT_BATCH_COMPLETED`** (`debtors.import_batch.completed`): Published by `ImportsModule` when a batch of debtor records from an import job is processed.

### Subscribed Events

*   **`DEBTS_PORTFOLIO_DEBTOR_BATCH_READY`** (`debts.portfolio.debtor_batch_ready`): ✅ **Fully Implemented** - Consumed by `ImportsModule` to process batched debtor data from `api-debts` during portfolio imports.
    *   **Batch Size**: 100 debtors per event
    *   **Listener**: `PortfolioDebtorBatchReadyListener`
    *   **Processor**: `DebtorImportProcessor`
    *   **Actions**: For each debtor in batch:
        1. Find or create `DebtorIdentity` (matching by SSN hash or email)
        2. Find or create `DebtorProfile` (linked to identity + organization)
        3. Create contact information (address, email, phone) if new profile
        4. Publish `DEBTORS_IDENTITY_CREATED` and `DEBTORS_PROFILE_CREATED` events
    *   **Architecture Note**: Uses batched events instead of single large event for better scalability and fault tolerance
    *   **Files**: `portfolio-debtor-batch-ready.listener.ts`, `debtor-import-processor.service.ts`

*   **`UserRegistered` / `UserLinked` (Future)**: (Opportunity) May listen for user registration/linking events from `api-users` to update `DebtorIdentity` with `userId`.

*   **`VerificationRequested` (Internal)**: Published by `VerificationService` and *processed directly within the service* rather than consumed via an external subscription.
