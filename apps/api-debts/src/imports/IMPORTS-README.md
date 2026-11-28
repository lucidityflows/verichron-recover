# `imports` Feature Module

## 1. Overview

The `imports` module is responsible for the entire bulk ingestion workflow for debt portfolios. It provides an asynchronous, job-based system for processing uploaded files (CSV for MVP), validating the data, and creating all necessary records (`Portfolio`, `Debt`, `DebtDebtor`, `DebtOwnershipHistory`) in an atomic transaction.

The architecture is designed to be robust, handling large files without blocking API requests and ensuring data consistency.

---

## 2. Ownership & Boundaries

### What This Module Owns

-   **Import Job Lifecycle:** The entire lifecycle of an import job, tracked via the `ImportJob` entity (from `PENDING` to `COMPLETED` or `FAILED`).
-   **File Handling & Storage:** Accepts file uploads and stores them for processing. The MVP uses the local filesystem, with plans to migrate to GCS.
-   **Parsing Abstraction:** Owns the `IImportParser` interface and the selection logic between different parsers (`MockParserService` for development, `VertexAiParserService` for production).
-   **Data Validation:** Performs comprehensive validation of data parsed from uploaded files before any database writes.
-   **Orchestration:** Orchestrates the creation of records in other modules (`portfolios`, `debts`, `history`) within a single database transaction.

### What This Module Does NOT Own

-   **Portfolio, Debt, or History Logic:** It does not contain the business logic for managing portfolios, debts, or history records. It calls the respective services of other modules to perform these actions.
-   **User/Organization Context:** It relies on `RequestContext` to get the current `organizationId` and `userId`.
-   **The Parsers Themselves:** The `MockParserService` and `VertexAiParserService` are separate, injectable services. The module only owns the logic to *select and use* the appropriate parser.

---

## 3. Entities

### `ImportJob`

This is the sole entity of the module, tracking the status and metadata of a single file import process.

-   **Purpose:** To provide a record of every import attempt, its progress, and the outcome (success or failure).
-   **Key Fields:**
    -   `id` (string, UUID): Primary key.
    -   `organizationId` (string, UUID): The tenant that owns this import job.
    -   `portfolioName` (string): The user-provided name for the portfolio to be created.
    -   `fileLocation` (string): The path to the uploaded file (local path in MVP).
    -   `status` (enum: `ImportJobStatus`): The current stage of the import (`PENDING`, `VALIDATING`, `PROCESSING`, `COMPLETED`, `FAILED`).
    -   `totalRows` (number | null): The number of data rows found in the file.
    -   `processedRows` (number): The number of rows successfully processed (for progress tracking).
    -   `errorMessage` (string | null): Contains detailed error information if the job fails.
    -   `portfolioId` (string | null): A reference to the created `Portfolio` upon successful completion.

---

## 4. Endpoints

All endpoints are prefixed with `/imports` and require JWT authentication.

### `POST /imports`

-   **Description:** Creates a new bulk import job by uploading a file and providing portfolio metadata. This is a non-blocking endpoint; it returns immediately after creating the job, and processing happens asynchronously.
-   **Request Type:** `multipart/form-data`
-   **Body:**
    -   `file` (binary): The CSV file containing debt records.
    -   `CreateImportDto`:
        -   `portfolioName` (string)
        -   `purchaseDate` (string, `YYYY-MM-DD`)
        -   `purchasePrice` (number)
        -   `source` (string)
-   **Permissions:** `portfolio:create`, `debt:create`
-   **Responses:**
    -   `201 Created`: Returns the newly created `ImportJobResponseDto` with a `PENDING` status.
    -   `400 Bad Request`: If the file is invalid (e.g., not a CSV, exceeds size limit).
    -   `413 Payload Too Large`: If the file exceeds the 50MB size limit.
    -   `422 Unprocessable Entity`: If the data *within* the CSV fails validation (reported by `ImportsProcessor`).

### `GET /imports`

-   **Description:** Retrieves a paginated list of all import jobs for the organization, allowing users to view import history.
-   **Query Parameters:** `QueryImportsDto`
    -   `status` (enum: `ImportJobStatus`, optional)
    -   `page` / `pageSize` (number, optional)
    -   `order` ('ASC' | 'DESC', optional, default: 'DESC')
-   **Permissions:** `portfolio:read`
-   **Responses:**
    -   `200 OK`: Returns a `PaginatedImportJobResponseDto`.

### `GET /imports/:id`

-   **Description:** Retrieves the detailed status of a specific import job. This endpoint is used for polling to monitor the progress of an ongoing import.
-   **Parameters:** `id` (string, UUID)
-   **Permissions:** `portfolio:read`
-   **Responses:**
    -   `200 OK`: Returns a single `ImportJobResponseDto` with the current status, progress, and error message if applicable.
    -   `404 Not Found`: If the import job ID is not found for the user's organization.

---

## 5. Key Concepts & Patterns

### Asynchronous "Fire-and-Forget" Processing (MVP)

-   When a file is uploaded to `POST /imports`, the `ImportsService` saves the file and creates the `ImportJob` record. It then calls `ImportsProcessor.processImport` asynchronously but does **not** `await` the result.
-   This makes the API endpoint non-blocking, providing an immediate response to the user.
-   **Gap:** This is a simplified async pattern for the MVP. It does not use a robust message queue (like BullMQ or RabbitMQ), meaning if the service crashes mid-process, the job may be lost or left in a stuck state. This is noted as a future enhancement.

### Parser Abstraction (`IImportParser`)

-   The module uses an `IImportParser` interface to decouple the processing logic from the file parsing logic.
-   The `imports.module.ts` uses a factory provider to dynamically inject the correct parser based on the `DOCUMENT_AI_EMULATOR` environment variable.
    -   `true`: Injects `MockParserService` (for local development/testing).
    -   `false`: Injects `VertexAiParserService` (for production).
-   This pattern makes it easy to add new parsers (e.g., for Excel, JSON) in the future without changing the core processing workflow.

### All-or-Nothing Transactional Integrity

-   The `ImportsProcessor` performs all database write operations (creating `Portfolio`, `Debt`, `DebtDebtor`, `DebtOwnershipHistory`) within a single database transaction using TypeORM's `QueryRunner`.
-   If any step fails (e.g., a database error), the entire transaction is rolled back. This prevents partially imported, corrupt portfolios and ensures data consistency.

### Custom Exceptions

The module defines a set of custom exceptions in the `/errors` directory for clear and specific error handling:
-   `ImportJobNotFoundException` (404)
-   `InvalidImportFileException` (400)
-   `ImportValidationFailedException` (422): Thrown when the data *inside* the file is invalid.
-   `ImportProcessingFailedException` (500): Thrown for database errors during the transaction.

---

## 6. Events

### Published Events

-   **`DEBTORS_PROFILE_INFORMATION_RECEIVED`**: Published by `ImportsProcessor` for each unique debtor found in the import file. This event is consumed by `api-debtors` to create or update debtor profiles, decoupling the two services.
-   **`DEBTS_PORTFOLIO_IMPORT_COMPLETED`**: Published after the entire import job is successfully completed and the database transaction is committed. This can be used by other services for notifications or analytics.

---

## 7. Dependencies & Integrations

### Internal Dependencies

-   **`debts` module:** For creating `Debt` and `DebtDebtor` records.
-   **`portfolios` module:** For creating `Portfolio` records.
-   **`history` module:** For creating `DebtOwnershipHistory` records.
-   **`core` module:** For `RequestContext`.
-   **`@verichron/event-publisher`:** The shared package for publishing events to GCP Pub/Sub.

### External Integrations

-   **File Storage:** The local filesystem (`/uploads`) is used in the MVP. This is a key dependency that will need to be replaced with a cloud storage solution like **GCS** for production.
-   **Google Cloud Document AI:** The `VertexAiParserService` is configured to use this service for parsing files in production.

---

## 8. Gaps & Future Work

-   **Incomplete Vertex AI Parser:** The `VertexAiParserService` is mostly a scaffold. The core logic in `extractPortfolioData()` to map Document AI output to the application's data structures is a **`TODO`** and not yet implemented.
-   **Database Uniqueness Check:** The `validateRows` method in `ImportsProcessor` has a **`TODO`** to check for `accountNumber` duplicates against the database. Currently, it only checks for duplicates within the uploaded file itself. This is a significant data integrity gap.
-   **Simplified Async Processing:** As mentioned, the current "fire-and-forget" async processing is not robust. Migrating to a proper queue system (like BullMQ with Redis) is a necessary future enhancement for production-grade reliability.
-   **Disabled Guards:** The `ImportsController` has its `@UseGuards` decorator commented out. This is a **critical security gap**.
