[<-- Back to Architectural Overview](../overview.md)

## Data Model

This document provides a high-level overview of the key database entities and their relationships within the `api-debts` microservice.

### Key Entities

#### `Debt`
The core entity representing an individual debt account.

- `id` (UUID): Primary key.
- `organizationId` (UUID, FK): Denormalized tenant ownership.
- `portfolioId` (UUID, FK): The portfolio this debt belongs to.
- `originalCreditorName` (string): Name of the original creditor.
- `accountNumber` (string): Unique account number within the organization.
- `principalAmount` (decimal, immutable): Original debt amount.
- `interestAmount` (decimal): Accrued interest.
- `feesAmount` (decimal): Additional fees.
- `currentBalance` (decimal, calculated): Current outstanding balance.
- `status` (enum: `DebtStatus`): The current lifecycle state of the debt.
- `debtCategory` (enum: `DebtCategory`): Canonical classification of the debt type.
- `debtSubcategory` (string | null): More specific classification.
- `originalDebtDate` (date, immutable): Date the debt was incurred.
- `lastPaymentDate` (date, nullable): Date of the most recent payment.
- `notes` (text, nullable): Collector notes and comments.
- `createdAt`, `updatedAt`: Audit timestamps.

#### `DebtDebtor` (Join Table)
Represents the many-to-many relationship between a `Debt` and a debtor profile.

- `id` (UUID): Primary key.
- `debtId` (UUID, FK): Foreign key to the `Debt` entity.
- `debtorProfileId` (UUID, FK): Foreign key to the debtor profile record in `api-debtors`.
- `createdAt`: Audit timestamp.

#### `Portfolio`
Represents a logical grouping of debt accounts.

- `id` (UUID): Primary key.
- `organizationId` (UUID, FK): The tenant organization that owns the portfolio.
- `name` (string): Human-readable name for the portfolio.
- `status` (enum: `PortfolioStatus`): The current lifecycle state of the portfolio.
- `purchaseDate` (date): Date the portfolio was acquired.
- `purchasePrice` (decimal): Amount paid for the portfolio.
- `totalPrincipal` (decimal): Sum of all debt principals in the portfolio.
- `source` (string): Origin of the portfolio.
- `portfolioTags` (string[]): User-defined tags for organization and filtering.
- `businessDescription` (text, nullable): Business context and notes.
- `createdAt`, `updatedAt`: Audit timestamps.

#### `UserPortfolioPermission`
The critical Layer 2 authorization entity, granting a user access to a portfolio.

- `id` (UUID): Primary key.
- `userId` (UUID, FK): Foreign key to a user record in `api-users`.
- `portfolioId` (UUID, FK): Foreign key to the `Portfolio` entity.
- `createdAt`: Audit timestamp.

#### `DebtOwnershipHistory`
An immutable, append-only audit log for the chain of title of a `Debt`.

- `id` (UUID): Primary key.
- `debtId` (UUID, FK): The debt this history record applies to.
- `organizationId` (UUID, FK): The organization that owned the debt during this period.
- `acquiredDate` (date): Date the organization acquired the debt.
- `soldDate` (date, nullable): Date the organization sold the debt. A `null` value indicates the current owner.
- `source` (string): How the ownership was acquired (e.g., "Initial Import", "Portfolio Transfer").
- `createdAt`: Immutable audit timestamp.

#### `ImportJob`
Tracks the status and metadata of a single bulk import process.

- `id` (UUID): Primary key.
- `organizationId` (UUID, FK): The tenant that owns this import job.
- `portfolioName` (string): The name for the portfolio being created.
- `fileLocation` (string): Path to the uploaded file.
- `status` (enum: `ImportJobStatus`): The current processing status of the job.
- `totalRows` (integer, nullable): Total data rows in the source file.
- `processedRows` (integer): Number of rows processed so far.
- `errorMessage` (string, nullable): Error details if the job failed.
- `portfolioId` (UUID, nullable): Reference to the created portfolio upon success.
- `metadata` (jsonb, nullable): Stores debtor information extracted from the file for batch processing.
- `createdAt`, `updatedAt`: Audit timestamps.

---

### Relationships

**Portfolio ↔ Debt**:
- **Type:** One-to-Many
- **Description:** One `Portfolio` contains many `Debt` records. Both entities store `organizationId` for denormalized tenant isolation.

**Debt ↔ Debtor**:
- **Type:** Many-to-Many
- **Description:** Implemented via the `DebtDebtor` join table. A debt can have multiple co-debtors, and a debtor can have multiple debts. `api-debts` only stores the `debtorProfileId` foreign key.

**User ↔ Portfolio**:
- **Type:** Many-to-Many
- **Description:** Implemented via the `UserPortfolioPermission` table. This grants a user Layer 2 authorization to access all debts within a portfolio.

**Debt → Ownership History**:
- **Type:** One-to-Many
- **Description:** One `Debt` has many `DebtOwnershipHistory` entries, creating an append-only audit log of its ownership over time.