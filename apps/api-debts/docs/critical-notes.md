[<-- Back to Architectural Overview](../overview.md)

## Critical Architectural Notes

### 1. **Denormalized Tenant Ownership**
**Both Portfolio and Debt entities store `organizationId`.**

- While a Debt logically belongs to a Portfolio which belongs to an Organization, storing `organizationId` on both entities is a deliberate performance and security optimization.
- This allows single-query tenant verification without joining through the Portfolio table on every debt lookup.
- This is a critical and common multi-tenancy pattern.
- **Rationale**: When a user requests a debt, we can verify tenant ownership in a single database lookup: `SELECT * FROM debt WHERE id = :id AND organizationId = :tenantId`.

### 2. **Two-Layered Authorization**
**General capability (Layer 1) + Instance access (Layer 2)**

**Layer 1 (api-users)**: The JWT contains a `debt:read` permission. A global guard in api-debts checks this permission.

**Layer 2 (api-debts)**: After passing Layer 1, api-debts queries `user_portfolio_permission` to verify the user has access to the specific portfolio the debt belongs to.

**Rationale**: Separates general capability (managed centrally by IAM) from resource-level access control (managed by the domain owning the resource). This is the "Google Drive model" - you have permission to "view documents," but can only view documents you've been granted access to.

### 3. **Portfolio-Level Permissions, Not Debt-Level**
**User access is granted at the portfolio level.**

- There is no individual debt assignment.
- The `user_portfolio_permission` table determines which users can work on which portfolios.
- All debts within a portfolio inherit this access model.
- **Rationale**: Simplicity and scalability. Managing permissions on potentially millions of individual debts would be a performance and UX nightmare. Portfolio-level access is the correct abstraction.

### 4. **Event-Driven Debtor Integration**
**api-debts does NOT call api-debtors directly.**

- During import, api-debts publishes `DebtorInformationReceived` events with the debtor data from the file.
- api-debtors subscribes to these events and creates or updates debtor profiles.
- **Rationale**: Decouples the import process from debtor management. If api-debtors is temporarily unavailable, the import can still complete. Events are retried until debtor profiles are created.

### 5. **Immutable Financial Fields**
**`principalAmount` and `originalDebtDate` are immutable after creation.**

- These fields establish the legal basis of the debt and must never be modified.
- `currentBalance` is a calculated field updated by the transactions service, not directly editable.
- **Rationale**: Audit integrity and legal compliance. The original terms of the debt must be preserved.

### 6. **Append-Only Ownership History**
**The history module is an immutable audit log.**

- Records are never updated or deleted.
- Each ownership period gets its own row.
- **Rationale**: Provides legal defensibility for chain of title. Any tampering would be immediately detectable.

### 7. **All-or-Nothing Import Transactions**
**If any row in an import file fails, the entire import is rolled back.**

- The entire import (Portfolio creation + all Debt creation) happens within a database transaction.
- If validation or processing fails for any row, the transaction is rolled back.
- **Rationale**: Prevents partially imported, corrupt portfolios. Data consistency is paramount.

### 8. **Asynchronous Import Processing**
**Imports are event-driven and non-blocking.**

- The API endpoint returns immediately after creating the ImportJob record and publishing the event.
- The actual processing happens asynchronously in the imports.processor.
- **Rationale**: Large CSV files with thousands of rows could take minutes to process. Blocking the API call would cause timeouts and poor UX.

### 9. **No Direct Service-to-Service Calls for Debtor Creation**
**Debtor profiles are created via events, not REST calls.**

- api-debts publishes `DebtorInformationReceived` events during import.
- api-debts does NOT call `POST /debtors` on api-debtors.
- **Rationale**: Loose coupling. If api-debtors is down during import, the import can still succeed. The events will be processed when api-debtors recovers.

### 10. **Read-Only Dependency on api-organizations**
**api-debts may occasionally call api-organizations for display purposes.**

- Example: Fetching an organization's name or settings via `GET /organizations/{id}`.
- This is a read-only dependency and is acceptable.
- **Rationale**: While api-debts stores `organizationId`, it doesn't store organization metadata (name, logo, etc.). Occasionally fetching this for display purposes is pragmatic.

### 11. **CQRS Pattern with Redis Read Model**
**Separate read model (Redis) from write model (PostgreSQL) for DEBTOR user queries.**

- **Write Path**: All debt mutations go to PostgreSQL (source of truth)
- **Read Path**: DEBTOR users query Redis sorted sets and hashes (<50ms)
- **Consistency**: Eventually consistent via event-driven index updates
- **Events**: `DebtorUserLinked` (initial index build), `DebtCreated` (incremental updates)
- **Rationale**: DEBTOR users need to query debts across multiple organizations with <100ms response times. Traditional approaches (denormalization, event orchestrator, cross-service queries) either violate bounded contexts or are too slow. Redis read model provides best-of-both-worlds: fast queries with clean architecture.
- **Trade-off**: Accepts eventual consistency (acceptable for debtor self-service) in exchange for performance and bounded context integrity.
- **Enterprise Precedent**: GitHub, Twitter, Instagram use Redis sorted sets for similar use cases (activity feeds, timelines).
