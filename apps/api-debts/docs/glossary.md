[<-- Back to Architectural Overview](../overview.md)

## Glossary

- **Debt**: An individual account representing money owed by a debtor to a creditor
- **Portfolio**: A grouping of debts, typically representing a purchased collection of accounts from a single creditor
- **Principal Amount**: The original amount owed on a debt (immutable)
- **Current Balance**: The current amount owed including principal, interest, and fees (calculated)
- **Chain of Title**: The complete, auditable history of debt ownership from original creditor to current owner
- **Co-Debtor**: An individual jointly responsible for a debt (e.g., spouse, co-signer)
- **Debt Status**: The current lifecycle state of a debt (IMPORTED, ACTIVE, PAID_IN_FULL, etc.)
- **Portfolio Status**: The current lifecycle state of a portfolio (PROVISIONING, ACTIVE, CLOSED | SOLD)
- **Import Job**: An asynchronous process that ingests a bulk file of debts to create a portfolio
- **Layer 1 Authorization**: General capability check via JWT permissions (e.g., `debt:read`)
- **Layer 2 Authorization**: Instance-level access check via `user_portfolio_permission` table
- **Denormalization**: Storing `organizationId` on both Portfolio and Debt for performance optimization
- **Thin Event**: An event containing only identifiers, requiring consumers to fetch full data from the source of truth
- **All-or-Nothing Transaction**: A database transaction pattern where either all operations succeed or all are rolled back
- **Idempotency**: The property of an operation where it can be applied multiple times without changing the result beyond the initial application. Crucial for safely retrying event processing and API calls in a distributed system.
