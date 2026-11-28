# API-Debtors Microservice

## Overview

The **api-debtors** microservice is the single source of truth for **Debtor Identity and Profiles** within our debt collection SaaS platform. This service manages the global identity of a unique person (`DebtorIdentity`), their specific profiles within different organizations (`DebtorProfile`), all associated contact details, demographics, verification status, documents, and the robust event-driven process for ingesting debtor data from imports.

### Bounded Context

**Clear Ownership**: The `api-debtors` service is the single source of truth for:

*   **Debtor Identity**: The unique global identifier for a person across the entire system.
*   **Debtor Profiles**: Organization-specific views of a debtor, linked to a global identity.
*   **Debtor Contact Information**: Addresses, emails, phone numbers, all scoped to a specific debtor profile within an organization.
*   **Debtor Demographics**: Sensitive PII for a specific debtor profile, used for analytics, ML, and compliance.
*   **Debtor Verification Workflows**: Data validation and skip tracing for specific debtor profiles.
*   **Debtor-specific Documents**: Metadata and references for documents tied to a debtor profile.
*   **Debtor Data Import**: Event-driven processing for ingesting large volumes of debtor data from external sources.

**Database**: `debtor-database` - Single database ownership, no cross-database joins.

## Key Design Principles

*   **Separation of Identity vs. Profile**: A unique `DebtorIdentity` (`debtorId`) represents a single person globally, while `DebtorProfile` (`debtorProfileId`) represents that person's data within a single organization. This enables proper multi-tenancy, data integrity, and compliance.
*   **Event-Driven Architecture**: This service heavily relies on publishing and subscribing to events for inter-service communication and to drive asynchronous workflows, enhancing scalability and resilience.
*   **Robust Identity De-duplication**: Implemented in `IdentityModule` with a multi-tier matching strategy (`userId` → SSN hash → Email → name/DOB) to accurately identify unique individuals, preventing data duplication and ensuring FCRA/FDCPA compliance.
*   **Isolation of Sensitive Data**: `DemographicsModule` manages sensitive PII in a separate module with stricter access controls and audit logging for compliance.
*   **Asynchronous Batch Processing**: The `ImportsModule` is designed to handle large volumes of imported debtor data efficiently and resiliently, providing progress tracking and retry mechanisms for production-scale portfolio ingestion.
*   **Standardized Authorization**: Relies on the platform's global authorization pipeline (`JwtAuthGuard`, `OrgContextGuard`, `PermissionsGuard`) and `RequestContext` service for tenant isolation, ensuring consistent security.
*   **Soft Deletes**: All data deletion operations are soft deletes (`deletedAt` timestamp or `isArchived` flag) to maintain audit trails and legal compliance.

## Getting Started

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm --filter @verichron/api-debtors dev

# Run tests
pnpm --filter @verichron/api-debtors test

# Build for production
pnpm --filter @verichron/api-debtors build
```

## Further Documentation

*   **Feature Overview**:
    *   [Feature Overview and System Context](docs/feature-overview.md)
*   **Architectural Decisions**:
    *   [Debtor Identity vs. Profile Model](docs/architecture/identity-model.md)
    *   [Internal Module Restructuring](docs/architecture/module-restructuring.md)
*   **Implementation Details**:
    *   [Debtor Identity Refactor Plan](docs/implementation/refactor-plan.md)
*   **API Contract**:
    *   [API Endpoints Specification](docs/api/endpoints.md)
*   **Eventing Strategy**:
    *   [Events Overview (Published & Subscribed)](docs/events/overview.md)
*   **Technical Deep Dives**:
    *   [Error Handling Strategy](docs/technical-details/error-handling.md)
