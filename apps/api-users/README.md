# API-Users Microservice

## Overview

The **api-users** microservice is the **Identity and Access Management (IAM)** bounded context within the Verichron platform. It is the single source of truth for user identities, authentication, organization membership, and role-based access control (RBAC).

### Bounded Context & Ownership

-   **Manages**: User identity, authentication, user profiles, organization membership, RBAC definitions, user lifecycle (invitation, activation, suspension), JWT issuance and validation.
-   **Database**: `users_db` (single ownership).
-   **Critical Boundaries**:
    -   **Does NOT own**: Organization profiles (owned by `api-organizations`).
    -   **Does NOT own**: Portfolio-level permissions (owned by `api-debts`).
    -   **Does NOT own**: Debtor-user linking logic (owned by `api-debtors`).

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm --filter @verichron/api-users dev

# Run tests
pnpm --filter @verichron/api-users test

# Build for production
pnpm --filter @verichron/api-users build
```

---

## Further Documentation

For a comprehensive understanding of this microservice, its architecture, and developer patterns, please refer to the following documents:

*   **High-Level Overviews**:
    *   [Feature Overview and System Context](docs/feature-overview.md)
    *   [Architectural Overview](docs/architecture/overview.md)
    *   [User Types in the Verichron Platform](docs/architecture/user-types.md)

*   **Developer Guide**:
    *   [Guards Strategy](docs/developer-guide/guards.md)
    *   [Custom Decorators](docs/developer-guide/decorators.md)
    *   [Unit & Integration Testing Philosophy](docs/developer-guide/testing-philosophy.md)

*   **Platform-Wide Architecture**:
    *   [Auth Architecture Documentation](../../docs/architecture/auth/README.md)
    *   [Onboarding Protocols Documentation](../../docs/architecture/onboarding.md)
    *   [E2E Testing Documentation](../../docs/testing/README.md)