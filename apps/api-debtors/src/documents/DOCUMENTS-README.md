# `documents` Feature Module

## 1. Overview

The `documents` module provides a comprehensive solution for managing debtor-specific documents. It integrates with Google Cloud Storage (GCS) for robust and scalable file storage while managing all associated metadata within the `api-debtors` database.

The feature exposes a full suite of RESTful endpoints for uploading, retrieving, updating, and archiving documents. A key architectural pattern is the use of signed URLs for downloads, which allows clients to securely fetch files directly from GCS, offloading bandwidth from the service and enhancing performance.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Document Metadata Management:** Owns the `Document` entity, which stores all metadata related to a file (e.g., filename, size, type, verification status).
-   **API Endpoints:** Owns all endpoints under the `/debtors/:debtorId/documents` path for complete lifecycle management.
-   **Google Cloud Storage Integration:** Manages the entire file storage workflow, including:
    -   Streaming file uploads to a GCS bucket.
    -   Generating time-limited signed URLs for secure downloads.
    -   Defining the GCS object path convention: `gs://{bucket}/{organizationId}/{debtorId}/{documentId}-{filename}`.
-   **File Validation:** Enforces server-side validation for file size (max 10MB) and allowed MIME types.
-   **Soft Deletion (Archiving):** Implements a soft-delete pattern where documents are marked as `isArchived` instead of being permanently removed, preserving data for audit and compliance.
-   **Event Publishing:** Publishes events for key document lifecycle moments (upload, update, archive).

### What This Module Does NOT Own

-   **File Content:** The service does not store file blobs in its database. It only holds metadata and a path reference to the object in GCS.
-   **Debtor Profiles:** It depends on the `ProfilesModule` to validate access to a given `debtorId` and to retrieve associated identity information for events.
-   **Global Authorization:** It relies on the globally provided `JwtAuthGuard` and the `@RequirePermissions` decorator for base-level access control.

---

## 3. Entities

### `Document`

This is the sole entity for the module, representing the metadata for a single file stored in GCS.

-   **Purpose:** To track all information and status related to a debtor's document.
-   **Key Fields:**
    -   `id` (string, UUID): The primary key for the document.
    -   `debtorProfileId` (string, UUID): Foreign key linking the document to a `DebtorProfile`.
    -   `organizationId` (string, UUID): Denormalized for secure, tenant-aware queries.
    -   `documentType` (enum: `DebtorDocumentType`): The category of the document (e.g., `IDENTITY_DOCUMENT`).
    -   `storagePath` (string): The full object path in the GCS bucket.
    -   `mimeType` (string): The MIME type of the stored file.
    -   `fileSize` (number): The size of the file in bytes.
    -   `uploadedBy` (string, UUID): The `userId` of the user who uploaded the file.
    -   `isVerified` (boolean): A flag indicating if the document has been reviewed and approved.
    -   `isArchived` (boolean): A soft-delete flag.

---

## 4. Endpoints

All endpoints are prefixed with `/debtors/:debtorId/documents` and require JWT authentication and specific permissions.

### `GET /`

-   **Description:** Retrieves a paginated and filterable list of document metadata for a specific debtor. Archived documents are excluded by default.
-   **Permissions:** `document:read`
-   **Responses:**
    -   `200 OK`: Returns a `PaginatedDocumentsDto`.

### `POST /`

-   **Description:** Uploads a new file and creates its associated metadata record. The request must be `multipart/form-data`.
-   **Permissions:** `document:create`
-   **File Limits:** 10MB max size. Allowed types: PDF, images (JPG, PNG, GIF), Word, Excel, text.
-   **Responses:**
    -   `201 Created`: Returns the created `Document` metadata.
    -   `400 Bad Request`: If the file is too large or the MIME type is not allowed.

### `GET /:id`

-   **Description:** Retrieves the metadata for a single document.
-   **Permissions:** `document:read`
-   **Responses:**
    -   `200 OK`: Returns a `Document` object.
    -   `404 Not Found`: If the document does not exist or the user's organization does not have access.

### `PUT /:id`

-   **Description:** Updates the mutable metadata fields of a document, such as `description`, `tags`, or `isVerified`. This endpoint cannot be used to replace the file content.
-   **Permissions:** `document:update`
-   **Responses:**
    -   `200 OK`: Returns the updated `Document` object.

### `DELETE /:id`

-   **Description:** Performs a "soft delete" by setting the `isArchived` flag to `true`. The file is not removed from GCS.
-   **Permissions:** `document:delete`
-   **Responses:**
    -   `204 No Content`: On successful archival.

### `GET /:id/download`

-   **Description:** Generates a time-limited (1 hour) pre-signed URL that allows a client to download the file directly from Google Cloud Storage.
-   **Permissions:** `document:read`
-   **Responses:**
    -   `200 OK`: Returns a `DownloadUrlDto` containing the secure URL.

### `POST /:id/archive`

-   **Description:** An explicit way to perform a soft delete. Functionally identical to `DELETE /:id`.
-   **Permissions:** `document:delete`
-   **Responses:**
    -   `200 OK`: Returns the updated `Document` object with `isArchived: true`.

### `GET /storage-usage`

-   **Description:** Calculates the sum of `fileSize` for all non-archived documents associated with a specific debtor.
-   **Permissions:** `document:read`
-   **Responses:**
    -   `200 OK`: Returns a `StorageUsageDto` with the total size in bytes and megabytes.

---

## 5. Key Concepts & Patterns

### Metadata and Storage Separation

This module follows a standard pattern for managing large files. The `Document` entity in PostgreSQL stores only the metadata, while the actual file content is streamed to an external object store (Google Cloud Storage). This keeps the primary database lean and leverages the scalability and durability of GCS.

### Signed URLs for Secure Downloads

To avoid proxying large file downloads through the API, the service provides a `/download` endpoint that generates a secure, time-limited URL. This allows the client to download the file directly from GCS, reducing load on the service and improving performance, while ensuring that only authorized users can receive a valid link.

### Soft Deletes (Archiving)

For compliance and audit purposes, documents are never physically deleted. The `DELETE` and `/archive` endpoints perform a "soft delete" by setting the `isArchived` flag on the `Document` record. Archived documents are excluded from default queries but remain in the database and in GCS, available for administrative access or restoration.

### Custom Exceptions

The module defines a set of specific exceptions to provide clear error feedback to API consumers:
-   `DocumentNotFoundException` (404)
-   `UnauthorizedDocumentAccessException` (403)
-   `InvalidDocumentTypeException` (400)
-   `DocumentTooLargeException` (400)
-   `DocumentUploadFailedException` (500)

---

## 6. Events

### Published Events

| Event Name | Event Constant | DTO | Topic | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Document Uploaded** | `DEBTORS_DOCUMENTS_DOCUMENT_UPLOADED` | `DocumentUploadedDto` | `debtors-v1` | Published when a new document is successfully uploaded and its metadata is saved. |
| **Document Updated** | `DEBTORS_DOCUMENTS_DOCUMENT_UPDATED` | `DocumentUpdatedDto` | `debtors-v1` | Published when a document's metadata is changed. |
| **Document Archived** | `DEBTORS_DOCUMENTS_DOCUMENT_ARCHIVED`| `DocumentArchivedDto` | `debtors-v1` | Published when a document is soft-deleted (archived). |

### Subscribed Events

This module does not subscribe to any events.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`ProfilesModule`:** Injected to verify that a `DebtorProfile` exists and to retrieve the `debtorIdentityId` for publishing events.
-   **`EventsModule`:** Provides the `EventPublisher` for dispatching events.
-   **`core` module:** Provides `RequestContext`, `JwtAuthGuard`, and the `@RequirePermissions` decorator for security and context.

### External Integrations

-   **Google Cloud Storage:** The primary dependency for object storage.
-   **TypeORM / PostgreSQL:** For storing `Document` entity metadata.
-   **`@nestjs/platform-express` (Multer):** Used as middleware to handle the `multipart/form-data` parsing for file uploads.
-   **`@verichron/event-publisher`:** Shared library for publishing events to the message bus.

---

## 8. Gaps & Future Work

-   **GCS SDK Integration:** The `documents.service.ts` file contains a `TODO` to install and fully integrate the `@google-cloud/storage` package. The current implementation has the GCS client nulled out and is not fully functional.
-   **Missing `DocumentDeleted` Event:** The `remove` method in the service has a `TODO` noting the potential need for a `DocumentDeleted` event. Currently, only the `archive` method publishes a `DocumentArchived` event. A distinct event for deletion may be desired.
