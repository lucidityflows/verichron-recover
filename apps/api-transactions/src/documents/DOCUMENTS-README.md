# `documents` Feature Module

## 1. Overview

The `documents` module is a core component within the `api-transactions` microservice, responsible for the generation, storage, and retrieval of payment-related documents. It functions as a centralized service for creating official PDF artifacts like payment agreements, receipts, and invoices.

All document files are stored securely in Google Cloud Storage (GCS), while the metadata is managed in the primary PostgreSQL database, ensuring a clear separation of data and files.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Document Metadata Management:** It is the single source of truth for the `Document` entity, which stores metadata like document type, storage path, and associations.
-   **PDF Generation:** It owns the business logic for programmatically generating PDF documents from data fetched from other services and modules.
-   **Cloud Storage Integration:** It owns the integration with Google Cloud Storage, including uploading files and generating secure, short-lived signed URLs for downloads.
-   **Document Lifecycle:** It manages the creation and soft deletion of document records.

### What This Module Does NOT Own

-   **Payment Plan or Transaction Data:** It depends on the `plans` and `transactions` modules to provide the data required for document generation. It does not own or modify this data.
-   **Debtor or Debt Profiles:** It does not own debtor or debt information. For document creation, it must fetch this data from the `api-debtors` and `api-debts` microservices.
-   **File Content in Database:** The database table for this module stores only metadata. The actual binary file content resides exclusively in Google Cloud Storage.
-   **User Context:** It relies on the globally provided `RequestContext` to obtain the `organizationId` and `userId` for data scoping and auditing.

---

## 3. Entities

### `Document`

This is the core entity of the module, representing the metadata for a single generated document.

-   **Purpose:** To store all metadata and a reference to the file's location in Google Cloud Storage.
-   **Key Fields:**
    -   `id` (string, UUID): Primary key.
    -   `organizationId` (string, UUID): The tenant that owns this document. **Denormalized** for performance and security.
    -   `debtorId` (string, UUID): The debtor associated with the document.
    -   `documentType` (enum: `DocumentType`): The classification of the document (e.g., `PAYMENT_AGREEMENT`, `PAYMENT_RECEIPT`).
    -   `title` (string): A human-readable title for UI display.
    -   `storagePath` (string): The GCS URI where the file is stored (e.g., `gs://payments-docs/org-123/doc-456.pdf`).
    -   `mimeType` (string): The document's MIME type, typically `application/pdf`.
    -   `fileSizeBytes` (number): The size of the file in bytes.
    -   `associatedPlanId` (string, UUID): A foreign key to a payment plan if the document is a `PAYMENT_AGREEMENT`.
    -   `associatedTransactionId` (string, UUID): A foreign key to a transaction if the document is a `PAYMENT_RECEIPT`.
    -   `associatedDebtId` (string, UUID): A foreign key to a debt if the document is an `INVOICE`.
    -   `createdByUserId` (string, UUID): The ID of the user who initiated the document generation.
    -   `deletedAt` (Date | null): The timestamp for soft-deleted records. `null` indicates the document is active.
-   **Relations:** This entity contains foreign key references but no direct TypeORM relations to other entities to maintain module independence.

---

## 4. Endpoints

All endpoints are prefixed with `/documents` and require JWT authentication.

### `POST /documents/generate-agreement`

-   **Description:** Generates a payment agreement PDF for a specific payment plan. The generated file is automatically uploaded to GCS.
-   **Body:** `GenerateAgreementDto` (`{ planId: string }`)
-   **Permissions:** `payment_plan:create`
-   **Responses:**
    -   `201 Created`: Returns the newly created `Document` metadata object.
    -   `404 Not Found`: If the specified `planId` does not exist.
    -   `500 Internal Server Error`: If PDF generation or GCS upload fails.

### `POST /documents/generate-receipt`

-   **Description:** Generates a payment receipt PDF for a specific transaction. This is typically called automatically after a successful payment.
-   **Body:** `GenerateReceiptDto` (`{ transactionId: string }`)
-   **Permissions:** `payment:create`
-   **Responses:**
    -   `201 Created`: Returns the newly created `Document` metadata object.
    -   `404 Not Found`: If the specified `transactionId` does not exist.
    -   `500 Internal Server Error`: If PDF generation or GCS upload fails.

### `POST /documents/generate-invoice`

-   **Description:** Generates an invoice PDF for a specific debt, detailing the amount owed.
-   **Body:** `GenerateInvoiceDto` (`{ debtId: string }`)
-   **Permissions:** `debt:read`
-   **Responses:**
    -   `201 Created`: Returns the newly created `Document` metadata object.
    -   `404 Not Found`: If the specified `debtId` does not exist (or cannot be fetched).
    -   `500 Internal Server Error`: If PDF generation or GCS upload fails.

### `GET /documents`

-   **Description:** Retrieves a paginated and filterable list of document metadata records. Results are automatically scoped to the user's organization.
-   **Query Parameters:** `QueryDocumentsDto` (allows filtering by `debtorId`, `documentType`, date ranges, and associated entity IDs).
-   **Permissions:** `document:read`
-   **Responses:**
    -   `200 OK`: Returns a paginated response object containing the list of documents and total count.

### `GET /documents/:id`

-   **Description:** Retrieves the detailed metadata for a single document by its UUID. This does **not** return the file itself.
-   **Parameters:** `id` (string, UUID)
-   **Permissions:** `document:read`
-   **Responses:**
    -   `200 OK`: Returns the `Document` metadata object.
    -   `404 Not Found`: If the document ID does not exist or is outside the user's organization.

### `GET /documents/:id/download`

-   **Description:** Generates a temporary, secure signed URL for downloading the document file directly from Google Cloud Storage. The URL is valid for 1 hour.
-   **Parameters:** `id` (string, UUID)
-   **Permissions:** `document:read`
-   **Responses:**
    -   `200 OK`: Returns an object with the `downloadUrl` and its `expiresAt` timestamp.
    -   `404 Not Found`: If the document ID does not exist.
    -   `500 Internal Server Error`: If the signed URL generation fails.

### `DELETE /documents/:id`

-   **Description:** Performs a "soft delete" on a document's metadata by setting the `deletedAt` timestamp. The record is preserved for auditing, and the file remains in GCS.
-   **Parameters:** `id` (string, UUID)
-   **Permissions:** `document:delete`
-   **Responses:**
    -   `204 No Content`: On successful soft deletion.
    -   `404 Not Found`: If the document ID does not exist.

---

## 5. Key Concepts & Patterns

### PDF Generation with `pdfkit`

The service uses the `pdfkit` library to programmatically generate PDF files. The generation logic for each document type (e.g., `generateAgreementPDF`) is defined within `documents.service.ts`. This approach allows for dynamic creation of documents based on real-time data.

### Google Cloud Storage (GCS) Integration

-   **Separation of Concerns:** Document files are not stored in the database. They are uploaded to a dedicated GCS bucket (`payments-docs`), and the `Document` entity only stores the file's `storagePath` (URI).
-   **Path Structure:** Files are organized by tenant to ensure data segregation within the bucket: `gs://<bucket_name>/<organizationId>/<documentId>.pdf`.

### Secure Downloads via Signed URLs

To ensure files in the private GCS bucket are accessed securely, the `GET /documents/:id/download` endpoint generates a short-lived signed URL. This allows clients to download files directly from GCS for a limited time without needing any GCS credentials, enhancing security and performance.

### Soft Deletes for Auditing

Documents are never permanently deleted. The `DELETE` endpoint performs a soft delete by setting the `deletedAt` field on the `Document` entity. This preserves a complete audit trail of all generated documents, which is critical for financial and legal compliance. The actual file in GCS is also preserved.

### Circular Dependency Management

This module participates in a circular dependency chain (`Documents` -> `Plans` -> `Transactions` -> `Documents`). This is resolved using NestJS's `forwardRef()` function in the module definitions and service constructors (`@Inject(forwardRef(...))`) to allow the modules to be loaded despite the circular references.

### Custom Exceptions

The module defines a set of custom exceptions in the `/errors` directory for clear error handling:
-   `DocumentNotFoundException` (404)
-   `DocumentGenerationFailedException` (500)
-   `DocumentStorageException` (500)

---

## 6. Events

This module does not publish or subscribe to any domain events. It is a passive service that acts upon direct requests from other modules or controllers.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`payment-plans` module:** Injects `PlansService` to fetch payment plan data needed for generating payment agreements.
-   **`transactions` module:** Injects `TransactionsService` to fetch transaction data needed for generating payment receipts.
-   **`core` module:** Relies on `RequestContext` for user/org context.
-   **`@verichron/error-handling`:** Uses the shared `BaseException` for creating custom, standardized exceptions.

### External Integrations

-   **PostgreSQL:** The primary write-model database, accessed via TypeORM to manage `Document` entities.
-   **Google Cloud Storage (GCS):** The object storage service used for persisting all generated PDF files.
-   **`@google-cloud/storage`:** The Node.js client library for interacting with GCS.
-   **`pdfkit`:** The Node.js library used for programmatically creating PDF documents.

---

## 8. Gaps & Future Work

-   **Hardcoded Data Fetching:** The service currently uses placeholder data for debtor and debt information (marked with `TODO`). These sections must be implemented to make live API calls to `api-debtors` and `api-debts` to fetch the necessary data for document generation.
-   **Static `createdByUserId`:** The `generatePaymentReceipt` method hardcodes the `createdByUserId` as `'system'`. This should be reviewed to determine if a more specific user context is available or required for auto-generated documents.
-   **Embedded PDF Templates:** The PDF structure and content are currently defined directly within the `documents.service.ts` methods. For better maintainability, these could be refactored into a more robust templating engine or separate template files.
-   **Missing Document Type Implementation:** The `DocumentType` enum includes `PAYMENT_OFFER_LETTER`, but there is no corresponding service logic or endpoint to generate this type of document.
-   **Error Handling Refinement:** While custom exceptions exist, the underlying reasons for generation or storage failures could be logged with more detail to aid in debugging.
