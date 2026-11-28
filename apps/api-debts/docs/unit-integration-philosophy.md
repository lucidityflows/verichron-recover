# Unit & Integration Testing Philosophy: api-debts

This document serves as the source of truth for the `api-debts` testing strategy, complementing the project-wide E2E testing philosophy. It defines the types of tests we write, our conventions, and the core system rules our tests are designed to validate for this specific microservice.

## 1. Core Principles

-   **Documentation First**: Every test file must begin with a header comment explaining the **System Rule(s)** it proves and what it does and does not test. Tests are living documentation.
-   **Deliberate & Meaningful**: Tests must be written with a clear purpose, validating specific business logic, edge cases, or integration points. We favor quality and clarity over raw line coverage.
-   **Isolation & Speed**: Tests should be as isolated as possible. Unit tests must be fast.

## 2. Two-Tier Testing Strategy

We employ a two-tier strategy for testing within the `api-debts` microservice.

### Tier 1: Unit Tests (`*.service.spec.ts`, `*.guard.spec.ts`, `*.strategy.spec.ts`, `*.filter.spec.ts`)

-   **Purpose**: To test a single class (a "unit") in complete isolation.
-   **Method**: All external dependencies (e.g., database repositories, other services, event bus) are mocked using Jest's mocking capabilities.
-   **Goal**: To verify the correctness of individual pieces of business logic quickly and efficiently. These tests must be fast.

### Tier 2: Integration Tests (`*.controller.spec.ts`)

-   **Purpose**: To test the collaboration of classes that make up a feature's request pipeline, from the controller down to the service.
-   **Method**: Use `@nestjs/testing` to create an in-memory test server for a specific NestJS module (e.g., `DebtsModule`). External infrastructure (like the database) is still mocked, but internal dependencies are resolved by the NestJS dependency injection container.
-   **Goal**: To verify that a feature's components (Controller, Service, DTOs, Pipes, Guards) are correctly "wired" together and handle HTTP requests as expected. This layer is critical for catching dependency injection and configuration errors.

---

## 3. Documented System Rules for `api-debts`

This section lists the core system rules for `api-debts` that our tests prove.

### DEBT: Debt Management Rules

| Rule ID | Description | Test File(s) | Status |
|:---------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------------------------|:--------------|
| **R-D-DEBT-001** | `findAll` must successfully retrieve a paginated and filtered list of debts for a given organization and user, applying sorting and filtering parameters (status, portfolioId, balance ranges, search terms, debtorProfileId). | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-DEBT-002** | `create` must successfully create a new debt record with associated `DebtDebtor` links within a database transaction. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-DEBT-003** | `create` must throw `DuplicateAccountNumberException` if a debt with the same `accountNumber` already exists for the `organizationId`. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-DEBT-004** | `create` must ensure transaction atomicity: rolls back the transaction if any step within it fails. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-DEBT-005** | `create` must correctly calculate `currentBalance` based on `principalAmount`, `interestAmount`, and `feesAmount`. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-DEBT-006** | `update` must successfully update a debt record by an admin user with `debt:update` permission, allowing modification of notes, status, interest amount, and fees amount. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-DEBT-007** | `update` must recalculate `currentBalance` when `interestAmount` or `feesAmount` are updated. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-DEBT-008** | `update` must verify that immutable fields (e.g., `principalAmount`, `originalDebtDate`) are not modified. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-DEBT-009** | `update` must throw `InvalidStatusTransitionException` if an attempted status change is not allowed by the defined state machine (`isValidStatusTransition`). | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-DEBT-010** | `findOne` must successfully retrieve a single debt record by ID for a given organization and user. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-DEBT-011** | `remove` must "soft delete" a debt by changing its status to `DebtStatus.CHARGED_OFF`. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-DEBT-012** | `remove` must throw `InvalidStatusTransitionException` if the debt's current status does not allow a transition to `CHARGED_OFF`. | `debts.service.spec.ts` | ✅ Implemented |

### AUTH: Authorization Rules (Debt Service)

| Rule ID | Description | Test File(s) | Status |
|:---------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------------------------|:--------------|
| **R-D-AUTH-001** | `findAll` must correctly apply Layer 2 authorization by joining with `user_portfolio_permission` and filtering by `userId`. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-AUTH-002** | `update` must ensure a collector user with `debt:update:notes` permission can *only* update the `notes` field. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-AUTH-003** | `update` must throw `DebtNotFoundException` if the specified `debtId` does not exist for the `organizationId`. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-AUTH-004** | `update` must throw `PortfolioAccessDeniedException` if the user lacks Layer 2 authorization for the debt's portfolio. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-AUTH-005** | `findOne` must correctly apply Layer 2 authorization by checking user access to the debt's portfolio, throwing `PortfolioAccessDeniedException` if access is denied. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-AUTH-006** | `findOne` must throw `DebtNotFoundException` if the debt is not found (for the organization) or the user does not have Layer 1 access. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-AUTH-007** | `remove` must throw `PortfolioAccessDeniedException` if the user lacks Layer 2 authorization for the debt's portfolio. | `debts.service.spec.ts` | ✅ Implemented |

### CQRS: Read Model Rules (Debt Service)

| Rule ID | Description | Test File(s) | Status |
|:---------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:------------------------|:--------------|
| **R-D-CQRS-001** | `findMyDebts` must successfully retrieve a paginated list of debts for a DEBTOR user from Redis when data is available. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-CQRS-002** | `findMyDebts` must return an empty result when Redis does not contain the requested data, simulating the need for a PostgreSQL query (slow path), as per current service implementation. | `debts.service.spec.ts` | ✅ Implemented |

### EVENTS: Event Publishing Rules (Debt Service)

| Rule ID | Description | Test File(s) | Status |
|:---------------|:--------------------------------------------------------------------------------------------------------------------------------------------------|:---------------------------|:--------------|
| **R-D-EVNT-001** | `create` must publish a `debts.debt.created` event with correct payload upon successful creation. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-EVNT-002** | `update` must publish a `debts.debt.updated` event for any changes. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-EVNT-003** | `update` must publish a `debts.debt.status_changed` event if the debt's status is modified. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-EVNT-004** | `remove` must publish a `debts.debt.status_changed` event upon successful status update to `CHARGED_OFF`. | `debts.service.spec.ts` | ✅ Implemented |

### CORE: Request Context Rules (Debt Service)

| Rule ID | Description | Test File(s) | Status |
|:---------------|:--------------------------------------------------------------------------------|:------------------------|:--------------|
| **R-D-CORE-001** | All service methods (`findAll`, `create`, `update`, `findOne`, `remove`, `findMyDebts`) must throw `Organization context is required` error if `orgId` is missing from `RequestContext`. | `debts.service.spec.ts` | ✅ Implemented |
| **R-D-CORE-002** | All service methods (`findAll`, `create`, `update`, `findOne`, `remove`, `findMyDebts`) must throw `User context is required` error if `userId` is missing from `RequestContext`. | `debts.service.spec.ts` | ✅ Implemented |

### PORTFOLIOS: Portfolio Management Rules

| Rule ID        | Description                                                                                                                                                                                                    | Test File(s)               | Status        |
|:---------------|:---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------------------------|:--------------|
| **R-P-PORT-001** | `PortfoliosService.create` must successfully create a new portfolio and publish a `PortfolioCreated` event.                                                                                                | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-002** | `PortfoliosService.create` must throw an error if `orgId` is missing from `RequestContext`.                                                                                                                | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-003** | `PortfoliosService.create` must throw an error if `userId` is missing from `RequestContext`.                                                                                                               | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-004** | `PortfoliosService.findAll` must return a paginated list of portfolios with aggregated metrics, applying filters for status, price, and search.                                                              | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-005** | `PortfoliosService.findAll` must throw an error if `orgId` is missing from `RequestContext`.                                                                                                               | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-006** | `PortfoliosService.findOne` must return a single portfolio with its metrics.                                                                                                                               | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-007** | `PortfoliosService.findOne` must throw `PortfolioNotFoundException` if the portfolio is not found.                                                                                                         | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-008** | `PortfoliosService.update` must successfully update a portfolio and publish `PortfolioUpdated` and/or `PortfolioStatusChanged` events.                                                                     | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-009** | `PortfoliosService.update` must throw `PortfolioNotFoundException` if the portfolio is not found.                                                                                                         | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-010** | `PortfoliosService.update` must throw `InvalidPortfolioStatusTransitionException` for invalid status transitions.                                                                                            | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-011** | `PortfoliosService.remove` must archive a portfolio (change status to `CLOSED`) and publish a `PortfolioStatusChanged` event.                                                                              | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-012** | `PortfoliosService.remove` must throw `PortfolioNotFoundException` if the portfolio is not found.                                                                                                         | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-013** | `PortfoliosService.remove` must throw `InvalidPortfolioStatusTransitionException` for invalid transitions to `CLOSED`.                                                                                     | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-014** | `PortfoliosService.assignUser` must assign a user to a portfolio and publish a `PortfolioUserAccessGranted` event.                                                                                         | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-015** | `PortfoliosService.assignUser` must throw `PortfolioNotFoundException` if the portfolio is not found.                                                                                                     | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-016** | `PortfoliosService.assignUser` must throw `UserAlreadyAssignedException` if the user is already assigned.                                                                                                 | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-017** | `PortfoliosService.revokeUser` must revoke user access and publish a `PortfolioUserAccessRevoked` event.                                                                                                 | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-018** | `PortfoliosService.revokeUser` must throw `PortfolioNotFoundException` if the portfolio is not found.                                                                                                     | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-019** | `PortfoliosService.revokeUser` must throw `UserNotAssignedException` if the user does not have access.                                                                                                  | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-020** | `PortfoliosService.listUsers` must return a list of users with access to a portfolio.                                                                                                                     | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-021** | `PortfoliosService.listUsers` must throw `PortfolioNotFoundException` if the portfolio is not found.                                                                                                     | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-022** | `PortfoliosService.transfer` must transfer a portfolio to another organization and publish a `PortfolioSold` event.                                                                                      | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-023** | `PortfoliosService.transfer` must throw `PortfolioNotFoundException` if the portfolio is not found.                                                                                                     | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-024** | `PortfoliosService.transfer` must throw `PortfolioTransferForbiddenException` for various invalid transfer conditions (e.g., provisioning, already sold, same organization).                               | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-025** | `PortfoliosService.checkUserAccess` must return `true` if a user has permission to a portfolio.                                                                                                          | `portfolios.service.spec.ts` | ✅ Implemented |
| **R-P-PORT-026** | `PortfoliosService.checkUserAccess` must return `false` if a user does not have permission to a portfolio.                                                                                               | `portfolios.service.spec.ts` | ✅ Implemented |

### CORE: Core Functionality Rules

| Rule ID | Description | Test File(s) | Status |
|:---------------|:-------------------------------------------------------------------------------------------------------------------|:---------------------------|:--------------|
| **R-C-PERM-001** | `PermissionsGuard` must allow access for public endpoints. | `permissions.guard.spec.ts` | ✅ Implemented |
| **R-C-PERM-002** | `PermissionsGuard` must allow access if no permissions are required. | `permissions.guard.spec.ts` | ✅ Implemented |
| **R-C-PERM-003** | `PermissionsGuard` must throw `ForbiddenException` if `activeContext` or its permissions are missing when permissions are required. | `permissions.guard.spec.ts` | ✅ Implemented |
| **R-C-PERM-004** | `PermissionsGuard` must allow access if user has all required permissions. | `permissions.guard.spec.ts` | ✅ Implemented |
| **R-C-PERM-005** | `PermissionsGuard` must throw `ForbiddenException` if user is missing one or all required permissions. | `permissions.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-001** | `OrgContextGuard` must allow access for public endpoints. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-002** | `OrgContextGuard` must allow access for endpoints that skip org context check. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-003** | `OrgContextGuard` must throw `ForbiddenException` if no user or invalid claims are on the request. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-004** | `OrgContextGuard` must grant access and set platform context for `PLATFORM_ADMIN` users. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-005** | `OrgContextGuard` must throw `ForbiddenException` if an organization user's token is missing `organizationId`. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-006** | `OrgContextGuard` must grant access and set context from token when no `x-org-id` is provided. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-007** | `OrgContextGuard` must throw `ForbiddenException` if `x-org-id` does not match the token's `organizationId`. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-008** | `OrgContextGuard` must grant access and set context if `x-org-id` matches the token's `organizationId`. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-009** | `OrgContextGuard` must extract `requestedOrgId` from route params or body if headers are missing. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-JWT-001** | `JwtStrategy` `validate` must return the payload for a valid `ORGANIZATION_USER` token. | `jwt.strategy.spec.ts` | ✅ Implemented |
| **R-C-JWT-002** | `JwtStrategy` `validate` must return the payload for a valid `PLATFORM_ADMIN` token. | `jwt.strategy.spec.ts` | ✅ Implemented |
| **R-C-JWT-003** | `JwtStrategy` `validate` must throw `UnauthorizedException` for invalid or malformed tokens (e.g., missing `sub`, `userType`, claims, or incorrect admin `organizationId`). | `jwt.strategy.spec.ts` | ✅ Implemented |
| **R-C-JWT-004** | `JwtAuthGuard` must allow access for public endpoints. | `jwt.guard.spec.ts` | ✅ Implemented |
| **R-C-JWT-005** | `JwtAuthGuard` must defer to `passport-jwt` for non-public endpoints. | `jwt.guard.spec.ts` | ✅ Implemented |
| **R-C-JWT-006** | `JwtAuthGuard` `handleRequest` must return the user for a valid token. | `jwt.guard.spec.ts` | ✅ Implemented |
| **R-C-JWT-007** | `JwtAuthGuard` `handleRequest` must throw `UnauthorizedException` if user is missing. | `jwt.guard.spec.ts` | ✅ Implemented |
| **R-C-JWT-008** | `JwtAuthGuard` `handleRequest` must re-throw the original error if one is passed. | `jwt.guard.spec.ts` | ✅ Implemented |
| **R-C-REQ-001** | `RequestContext` must be unauthenticated initially and return empty/undefined for getters. | `request-context.service.spec.ts` | ✅ Implemented |
| **R-C-REQ-002** | `RequestContext` must correctly store and retrieve `UserContext`. | `request-context.service.spec.ts` | ✅ Implemented |
| **R-C-REQ-003** | `RequestContext` must return correct values for getters (`getUserId`, `getOrgId`, `getRoles`, `getPermissions`, etc.) for an `ORGANIZATION_USER`. | `request-context.service.spec.ts` | ✅ Implemented |
| **R-C-REQ-004** | `RequestContext` must return correct values for getters (`getPlatformRoles`, `getOrgId` being `undefined`) for a `PLATFORM_ADMIN`. | `request-context.service.spec.ts` | ✅ Implemented |
| **R-C-ERR-001** | `AllExceptionsFilter` must handle `BaseException`s and format responses correctly. | `all-exceptions.filter.spec.ts` | ✅ Implemented |
| **R-C-ERR-002** | `AllExceptionsFilter` must handle standard `HttpException`s and format responses correctly. | `all-exceptions.filter.spec.ts` | ✅ Implemented |
| **R-C-ERR-003** | `AllExceptionsFilter` must handle generic `Error`s (defaulting to 500) and format responses correctly. | `all-exceptions.filter.spec.ts` | ✅ Implemented |
| **R-C-ERR-004** | `AllExceptionsFilter` must handle unknown exception types (defaulting to 500) and format responses correctly. | `all-exceptions.filter.spec.ts` | ✅ Implemented |
| **R-C-ERR-005** | `AllExceptionsFilter` must log the full error details for all caught exceptions. | `all-exceptions.filter.spec.ts` | ✅ Implemented |

---

## 4. Test Coverage & Status

### Current Status

**Modules & Components Tested:**
- **Debts Module (Core Feature):**
  - `debts.service.spec.ts`: ✅ Implemented and passing.
  - `debts.controller.spec.ts`: ✅ Implemented and passing.
- **Portfolios Module (Core Feature):**
  - `portfolios.service.spec.ts`: ✅ Implemented and passing.
  - `portfolios.controller.spec.ts`: ⚠️ Partially Implemented. Most tests passing, but 2 tests are failing due to an unresolved environmental issue.
- **Core Module (Cross-cutting Concerns):**
  - `permissions.guard.spec.ts`: ✅ Implemented and passing.
  - `org-context.guard.spec.ts`: ✅ Implemented and passing.
  - `jwt.strategy.spec.ts`: ✅ Implemented and passing.
  - `jwt.guard.spec.ts`: ✅ Implemented and passing.
  - `request-context.service.spec.ts`: ✅ Implemented and passing.
  - `all-exceptions.filter.spec.ts`: ✅ Implemented and passing.

### Test Case Mapping (by Rule ID)

| Rule ID          | Status         | Test File(s)            | Notes                                                                                                                                                                                                                                                                                                                        |
|:-----------------|:---------------|:------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **R-D-DEBT-001** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findAll()` method                                                                                                                                                                                                                                                                                              |
| **R-D-DEBT-002** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.create()` method                                                                                                                                                                                                                                                                                               |
| **R-D-DEBT-003** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.create() › should throw DuplicateAccountNumberException if account number already exists for organization`                                                                                                                                                                                                   |
| **R-D-DEBT-004** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.create() › should ensure transaction atomicity: rolls back on failure`                                                                                                                                                                                                                                         |
| **R-D-DEBT-005** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.create() › should correctly calculate currentBalance`                                                                                                                                                                                                                                                          |
| **R-D-DEBT-006** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should allow admin with 'debt:update' to modify status, interest, and fees`                                                                                                                                                                                                                         |
| **R-D-DEBT-007** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should recalculate currentBalance when interestAmount or feesAmount are updated`                                                                                                                                                                                                                    |
| **R-D-DEBT-008** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should not modify immutable fields like principalAmount`                                                                                                                                                                                                                                            |
| **R-D-DEBT-009** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should throw InvalidStatusTransitionException for invalid status change`                                                                                                                                                                                                                            |
| **R-D-DEBT-010** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findOne()` method                                                                                                                                                                                                                                                                                              |
| **R-D-DEBT-011** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.remove() › should soft delete a debt by changing its status to CHARGED_OFF`                                                                                                                                                                                                                                    |
| **R-D-DEBT-012** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.remove() › should throw InvalidStatusTransitionException if current status does not allow transition to CHARGED_OFF`                                                                                                                                                                                             |
| **R-D-AUTH-001** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findAll() › should correctly apply Layer 2 authorization`                                                                                                                                                                                                                                                      |
| **R-D-AUTH-002** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should only allow collector with 'debt:update:notes' to update notes`                                                                                                                                                                                                                               |
| **R-D-AUTH-003** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should throw DebtNotFoundException if debtId does not exist for the organization`                                                                                                                                                                                                                   |
| **R-D-AUTH-004** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should throw PortfolioAccessDeniedException if user lacks Layer 2 authorization`                                                                                                                                                                                                                    |
| **R-D-AUTH-005** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findOne() › should correctly apply Layer 2 authorization and throw PortfolioAccessDeniedException`                                                                                                                                                                                                             |
| **R-D-AUTH-006** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findOne() › should throw DebtNotFoundException if debt is not found or user lacks Layer 1 access`                                                                                                                                                                                                              |
| **R-D-AUTH-007** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.remove() › should throw PortfolioAccessDeniedException if user lacks Layer 2 authorization`                                                                                                                                                                                                                    |
| **R-D-CQRS-001** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findMyDebts() › should retrieve paginated debts for a DEBTOR user from Redis`                                                                                                                                                                                                                                  |
| **R-D-CQRS-002** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findMyDebts() › should return empty if Redis has no data as per current implementation`                                                                                                                                                                                                                      |
| **R-D-EVNT-001** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.create() › should publish a debts.debt.created event`                                                                                                                                                                                                                                                          |
| **R-D-EVNT-002** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should publish debts.debt.updated event on changes`                                                                                                                                                                                                                                                 |
| **R-D-EVNT-003** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should publish debts.debt.status_changed event if status is modified`                                                                                                                                                                                                                               |
| **R-D-EVNT-004** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.remove() › should publish debts.debt.status_changed event`                                                                                                                                                                                                                                                     |
| **R-D-CORE-001** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findAll() › should throw "Organization context is required" if orgId is missing`; applies similarly to `create`, `update`, `findOne`, `remove`, `findMyDebts`                                                                                                                                                      |
| **R-D-CORE-002** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findAll() › should throw "User context is required" if userId is missing`; applies similarly to `create`, `update`, `findOne`, `remove`, `findMyDebts`                                                                                                                                                             |
| **R-P-PORT-001** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.create` must successfully create a new portfolio and publish a `PortfolioCreated` event. |
| **R-P-PORT-002** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.create` must throw an error if `orgId` is missing from `RequestContext`. |
| **R-P-PORT-003** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.create` must throw an error if `userId` is missing from `RequestContext`. |
| **R-P-PORT-004** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.findAll` must return a paginated list of portfolios with aggregated metrics, applying filters for status, price, and search. |
| **R-P-PORT-005** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.findAll` must throw an error if `orgId` is missing from `RequestContext`. |
| **R-P-PORT-006** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.findOne` must return a single portfolio with its metrics. |
| **R-P-PORT-007** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.findOne` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-008** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.update` must successfully update a portfolio and publish `PortfolioUpdated` and/or `PortfolioStatusChanged` events. |
| **R-P-PORT-009** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.update` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-010** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.update` must throw `InvalidPortfolioStatusTransitionException` for invalid status transitions. |
| **R-P-PORT-011** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.remove` must archive a portfolio (change status to `CLOSED`) and publish a `PortfolioStatusChanged` event. |
| **R-P-PORT-012** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.remove` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-013** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.remove` must throw `InvalidPortfolioStatusTransitionException` for invalid transitions to `CLOSED`. |
| **R-P-PORT-014** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.assignUser` must assign a user to a portfolio and publish a `PortfolioUserAccessGranted` event. |
| **R-P-PORT-015** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.assignUser` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-016** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.assignUser` must throw `UserAlreadyAssignedException` if the user is already assigned. |
| **R-P-PORT-017** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.revokeUser` must revoke user access and publish a `PortfolioUserAccessRevoked` event. |
| **R-P-PORT-018** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.revokeUser` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-019** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.revokeUser` must throw `UserNotAssignedException` if the user does not have access. |
| **R-P-PORT-020** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.listUsers` must return a list of users with access to a portfolio. |
| **R-P-PORT-021** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.listUsers` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-022** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.transfer` must transfer a portfolio to another organization and publish a `PortfolioSold` event. |
| **R-P-PORT-023** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.transfer` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-024** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.transfer` must throw `PortfolioTransferForbiddenException` for various invalid transfer conditions (e.g., provisioning, already sold, same organization). |
| **R-P-PORT-025** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.checkUserAccess` must return `true` if a user has permission to a portfolio. |
| **R-P-PORT-026** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.checkUserAccess` must return `false` if a user does not have permission to a portfolio. |
| **R-P-CTRL-001** | `PortfoliosController.create` must call the service and return the created portfolio. | `portfolios.controller.spec.ts` | ✅ Implemented |
| **R-P-CTRL-002** | `PortfoliosController.create` must return 400 for invalid data. | `portfolios.controller.spec.ts` | ✅ Implemented |
| **R-P-CTRL-003** | `PortfoliosController.findAll` must call the service and return paginated portfolios. | `portfolios.controller.spec.ts` | ✅ Implemented |
| **R-P-CTRL-004** | `PortfoliosController.findOne` must call the service and return a single portfolio. | `portfolios.controller.spec.ts` | ✅ Implemented |
| **R-P-CTRL-005** | `PortfoliosController.findOne` must return 400 for an invalid UUID. | `portfolios.controller.spec.ts` | ✅ Implemented |
| **R-P-CTRL-006** | `PortfoliosController.update` must call the service and return the updated portfolio. | `portfolios.controller.spec.ts` | ✅ Implemented |
| **R-P-CTRL-007** | `PortfoliosController.remove` must call the service and return NO_CONTENT. | `portfolios.controller.spec.ts` | ✅ Implemented |
| **R-P-CTRL-008** | `PortfoliosController.assignUser` must call the service and return CREATED. | `portfolios.controller.spec.ts` | ❌ Failing (400 Bad Request) |
| **R-P-CTRL-009** | `PortfoliosController.revokeUser` must call the service and return NO_CONTENT. | `portfolios.controller.spec.ts` | ✅ Implemented |
| **R-P-CTRL-010** | `PortfoliosController.listUsers` must call the service and return a list of users. | `portfolios.controller.spec.ts` | ✅ Implemented |
| **R-P-CTRL-011** | `PortfoliosController.transfer` must call the service and return the transferred portfolio. | `portfolios.controller.spec.ts` | ❌ Failing (400 Bad Request) |

### CORE: Core Functionality Rules

| Rule ID | Description | Test File(s) | Status |
|:---------------|:-------------------------------------------------------------------------------------------------------------------|:---------------------------|:--------------|
| **R-C-PERM-001** | `PermissionsGuard` must allow access for public endpoints. | `permissions.guard.spec.ts` | ✅ Implemented |
| **R-C-PERM-002** | `PermissionsGuard` must allow access if no permissions are required. | `permissions.guard.spec.ts` | ✅ Implemented |
| **R-C-PERM-003** | `PermissionsGuard` must throw `ForbiddenException` if `activeContext` or its permissions are missing when permissions are required. | `permissions.guard.spec.ts` | ✅ Implemented |
| **R-C-PERM-004** | `PermissionsGuard` must allow access if user has all required permissions. | `permissions.guard.spec.ts` | ✅ Implemented |
| **R-C-PERM-005** | `PermissionsGuard` must throw `ForbiddenException` if user is missing one or all required permissions. | `permissions.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-001** | `OrgContextGuard` must allow access for public endpoints. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-002** | `OrgContextGuard` must allow access for endpoints that skip org context check. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-003** | `OrgContextGuard` must throw `ForbiddenException` if no user or invalid claims are on the request. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-004** | `OrgContextGuard` must grant access and set platform context for `PLATFORM_ADMIN` users. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-005** | `OrgContextGuard` must throw `ForbiddenException` if an organization user's token is missing `organizationId`. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-006** | `OrgContextGuard` must grant access and set context from token when no `x-org-id` is provided. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-007** | `OrgContextGuard` must throw `ForbiddenException` if `x-org-id` does not match the token's `organizationId`. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-008** | `OrgContextGuard` must grant access and set context if `x-org-id` matches the token's `organizationId`. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-ORG-009** | `OrgContextGuard` must extract `requestedOrgId` from route params or body if headers are missing. | `org-context.guard.spec.ts` | ✅ Implemented |
| **R-C-JWT-001** | `JwtStrategy` `validate` must return the payload for a valid `ORGANIZATION_USER` token. | `jwt.strategy.spec.ts` | ✅ Implemented |
| **R-C-JWT-002** | `JwtStrategy` `validate` must return the payload for a valid `PLATFORM_ADMIN` token. | `jwt.strategy.spec.ts` | ✅ Implemented |
| **R-C-JWT-003** | `JwtStrategy` `validate` must throw `UnauthorizedException` for invalid or malformed tokens (e.g., missing `sub`, `userType`, claims, or incorrect admin `organizationId`). | `jwt.strategy.spec.ts` | ✅ Implemented |
| **R-C-JWT-004** | `JwtAuthGuard` must allow access for public endpoints. | `jwt.guard.spec.ts` | ✅ Implemented |
| **R-C-JWT-005** | `JwtAuthGuard` must defer to `passport-jwt` for non-public endpoints. | `jwt.guard.spec.ts` | ✅ Implemented |
| **R-C-JWT-006** | `JwtAuthGuard` `handleRequest` must return the user for a valid token. | `jwt.guard.spec.ts` | ✅ Implemented |
| **R-C-JWT-007** | `JwtAuthGuard` `handleRequest` must throw `UnauthorizedException` if user is missing. | `jwt.guard.spec.ts` | ✅ Implemented |
| **R-C-JWT-008** | `JwtAuthGuard` `handleRequest` must re-throw the original error if one is passed. | `jwt.guard.spec.ts` | ✅ Implemented |
| **R-C-REQ-001** | `RequestContext` must be unauthenticated initially and return empty/undefined for getters. | `request-context.service.spec.ts` | ✅ Implemented |
| **R-C-REQ-002** | `RequestContext` must correctly store and retrieve `UserContext`. | `request-context.service.spec.ts` | ✅ Implemented |
| **R-C-REQ-003** | `RequestContext` must return correct values for getters (`getUserId`, `getOrgId`, `getRoles`, `getPermissions`, etc.) for an `ORGANIZATION_USER`. | `request-context.service.spec.ts` | ✅ Implemented |
| **R-C-REQ-004** | `RequestContext` must return correct values for getters (`getPlatformRoles`, `getOrgId` being `undefined`) for a `PLATFORM_ADMIN`. | `request-context.service.spec.ts` | ✅ Implemented |
| **R-C-ERR-001** | `AllExceptionsFilter` must handle `BaseException`s and format responses correctly. | `all-exceptions.filter.spec.ts` | ✅ Implemented |
| **R-C-ERR-002** | `AllExceptionsFilter` must handle standard `HttpException`s and format responses correctly. | `all-exceptions.filter.spec.ts` | ✅ Implemented |
| **R-C-ERR-003** | `AllExceptionsFilter` must handle generic `Error`s (defaulting to 500) and format responses correctly. | `all-exceptions.filter.spec.ts` | ✅ Implemented |
| **R-C-ERR-004** | `AllExceptionsFilter` must handle unknown exception types (defaulting to 500) and format responses correctly. | `all-exceptions.filter.spec.ts` | ✅ Implemented |
| **R-C-ERR-005** | `AllExceptionsFilter` must log the full error details for all caught exceptions. | `all-exceptions.filter.spec.ts` | ✅ Implemented |

---

## 4. Test Coverage & Status

### Current Status

**Modules & Components Tested:**
- **Debts Module (Core Feature):**
  - `debts.service.spec.ts`: ✅ Implemented and passing.
  - `debts.controller.spec.ts`: ✅ Implemented and passing.
- **Portfolios Module (Core Feature):**
  - `portfolios.service.spec.ts`: ✅ Implemented and passing.
  - `portfolios.controller.spec.ts`: ⚠️ Partially Implemented. Most tests passing, but 2 tests are failing due to an unresolved environmental issue.
- **Core Module (Cross-cutting Concerns):**
  - `permissions.guard.spec.ts`: ✅ Implemented and passing.
  - `org-context.guard.spec.ts`: ✅ Implemented and passing.
  - `jwt.strategy.spec.ts`: ✅ Implemented and passing.
  - `jwt.guard.spec.ts`: ✅ Implemented and passing.
  - `request-context.service.spec.ts`: ✅ Implemented and passing.
  - `all-exceptions.filter.spec.ts`: ✅ Implemented and passing.

### Test Case Mapping (by Rule ID)

| Rule ID | Status | Test File(s) | Notes |
|:-----------------|:---------------|:------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **R-D-DEBT-001** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findAll()` method |
| **R-D-DEBT-002** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.create()` method |
| **R-D-DEBT-003** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.create() › should throw DuplicateAccountNumberException if account number already exists for organization` |
| **R-D-DEBT-004** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.create() › should ensure transaction atomicity: rolls back on failure` |
| **R-D-DEBT-005** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.create() › should correctly calculate currentBalance` |
| **R-D-DEBT-006** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should allow admin with 'debt:update' to modify status, interest, and fees` |
| **R-D-DEBT-007** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should recalculate currentBalance when interestAmount or feesAmount are updated` |
| **R-D-DEBT-008** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should not modify immutable fields like principalAmount` |
| **R-D-DEBT-009** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should throw InvalidStatusTransitionException for invalid status change` |
| **R-D-DEBT-010** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findOne()` method |
| **R-D-DEBT-011** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.remove() › should soft delete a debt by changing its status to CHARGED_OFF` |
| **R-D-DEBT-012** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.remove() › should throw InvalidStatusTransitionException if current status does not allow transition to CHARGED_OFF` |
| **R-D-AUTH-001** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findAll() › should correctly apply Layer 2 authorization` |
| **R-D-AUTH-002** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should only allow collector with 'debt:update:notes' to update notes` |
| **R-D-AUTH-003** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should throw DebtNotFoundException if debtId does not exist for the organization` |
| **R-D-AUTH-004** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should throw PortfolioAccessDeniedException if user lacks Layer 2 authorization` |
| **R-D-AUTH-005** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findOne() › should correctly apply Layer 2 authorization and throw PortfolioAccessDeniedException` |
| **R-D-AUTH-006** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findOne() › should throw DebtNotFoundException if debt is not found or user lacks Layer 1 access` |
| **R-D-AUTH-007** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.remove() › should throw PortfolioAccessDeniedException if user lacks Layer 2 authorization` |
| **R-D-CQRS-001** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findMyDebts() › should retrieve paginated debts for a DEBTOR user from Redis` |
| **R-D-CQRS-002** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findMyDebts() › should return empty if Redis has no data as per current implementation` |
| **R-D-EVNT-001** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.create() › should publish a debts.debt.created event` |
| **R-D-EVNT-002** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should publish debts.debt.updated event on changes` |
| **R-D-EVNT-003** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.update() › should publish debts.debt.status_changed event if status is modified` |
| **R-D-EVNT-004** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.remove() › should publish debts.debt.status_changed event` |
| **R-D-CORE-001** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findAll() › should throw "Organization context is required" if orgId is missing`; applies similarly to `create`, `update`, `findOne`, `remove`, `findMyDebts` |
| **R-D-CORE-002** | ✅ Implemented | `debts.service.spec.ts` | `DebtsService.findAll() › should throw "User context is required" if userId is missing`; applies similarly to `create`, `update`, `findOne`, `remove`, `findMyDebts` |
| **R-P-PORT-001** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.create` must successfully create a new portfolio and publish a `PortfolioCreated` event. |
| **R-P-PORT-002** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.create` must throw an error if `orgId` is missing from `RequestContext`. |
| **R-P-PORT-003** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.create` must throw an error if `userId` is missing from `RequestContext`. |
| **R-P-PORT-004** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.findAll` must return a paginated list of portfolios with aggregated metrics, applying filters for status, price, and search. |
| **R-P-PORT-005** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.findAll` must throw an error if `orgId` is missing from `RequestContext`. |
| **R-P-PORT-006** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.findOne` must return a single portfolio with its metrics. |
| **R-P-PORT-007** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.findOne` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-008** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.update` must successfully update a portfolio and publish `PortfolioUpdated` and/or `PortfolioStatusChanged` events. |
| **R-P-PORT-009** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.update` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-010** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.update` must throw `InvalidPortfolioStatusTransitionException` for invalid status transitions. |
| **R-P-PORT-011** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.remove` must archive a portfolio (change status to `CLOSED`) and publish a `PortfolioStatusChanged` event. |
| **R-P-PORT-012** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.remove` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-013** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.remove` must throw `InvalidPortfolioStatusTransitionException` for invalid transitions to `CLOSED`. |
| **R-P-PORT-014** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.assignUser` must assign a user to a portfolio and publish a `PortfolioUserAccessGranted` event. |
| **R-P-PORT-015** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.assignUser` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-016** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.assignUser` must throw `UserAlreadyAssignedException` if the user is already assigned. |
| **R-P-PORT-017** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.revokeUser` must revoke user access and publish a `PortfolioUserAccessRevoked` event. |
| **R-P-PORT-018** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.revokeUser` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-019** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.revokeUser` must throw `UserNotAssignedException` if the user does not have access. |
| **R-P-PORT-020** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.listUsers` must return a list of users with access to a portfolio. |
| **R-P-PORT-021** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.listUsers` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-022** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.transfer` must transfer a portfolio to another organization and publish a `PortfolioSold` event. |
| **R-P-PORT-023** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.transfer` must throw `PortfolioNotFoundException` if the portfolio is not found. |
| **R-P-PORT-024** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.transfer` must throw `PortfolioTransferForbiddenException` for various invalid transfer conditions (e.g., provisioning, already sold, same organization). |
| **R-P-PORT-025** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.checkUserAccess` must return `true` if a user has permission to a portfolio. |
| **R-P-PORT-026** | ✅ Implemented | `portfolios.service.spec.ts` | `PortfoliosService.checkUserAccess` must return `false` if a user does not have permission to a portfolio. |
| **R-P-CTRL-001** | ✅ Implemented | `portfolios.controller.spec.ts` | `PortfoliosController.create` must call the service and return the created portfolio. |
| **R-P-CTRL-002** | ✅ Implemented | `portfolios.controller.spec.ts` | `PortfoliosController.create` must return 400 for invalid data. |
| **R-P-CTRL-003** | ✅ Implemented | `portfolios.controller.spec.ts` | `PortfoliosController.findAll` must call the service and return paginated portfolios. |
| **R-P-CTRL-004** | ✅ Implemented | `portfolios.controller.spec.ts` | `PortfoliosController.findOne` must call the service and return a single portfolio. |
| **R-P-CTRL-005** | ✅ Implemented | `portfolios.controller.spec.ts` | `PortfoliosController.findOne` must return 400 for an invalid UUID. |
| **R-P-CTRL-006** | ✅ Implemented | `portfolios.controller.spec.ts` | `PortfoliosController.update` must call the service and return the updated portfolio. |
| **R-P-CTRL-007** | ✅ Implemented | `portfolios.controller.spec.ts` | `PortfoliosController.remove` must call the service and return NO_CONTENT. |
| **R-P-CTRL-008** | ❌ Failing (400 Bad Request) | `portfolios.controller.spec.ts` | `PortfoliosController.assignUser` must call the service and return CREATED. |
| **R-P-CTRL-009** | ✅ Implemented | `portfolios.controller.spec.ts` | `PortfoliosController.revokeUser` must call the service and return NO_CONTENT. |
| **R-P-CTRL-010** | ✅ Implemented | `portfolios.controller.spec.ts` | `PortfoliosController.listUsers` must call the service and return a list of users. |
| **R-P-CTRL-011** | ❌ Failing (400 Bad Request) | `portfolios.controller.spec.ts` | `PortfoliosController.transfer` must call the service and return the transferred portfolio. |
| **R-C-PERM-001** | ✅ Implemented | `permissions.guard.spec.ts` | `PermissionsGuard` must allow access for public endpoints. |
| **R-C-PERM-002** | ✅ Implemented | `permissions.guard.spec.ts` | `PermissionsGuard` must allow access if no permissions are required. |
| **R-C-PERM-003** | ✅ Implemented | `permissions.guard.spec.ts` | `PermissionsGuard` must throw `ForbiddenException` if `activeContext` or its permissions are missing when permissions are required. |
| **R-C-PERM-004** | ✅ Implemented | `permissions.guard.spec.ts` | `PermissionsGuard` must allow access if user has all required permissions. |
| **R-C-PERM-005** | ✅ Implemented | `permissions.guard.spec.ts` | `PermissionsGuard` must throw `ForbiddenException` if user is missing one or all required permissions. |
| **R-C-ORG-001** | ✅ Implemented | `org-context.guard.spec.ts` | `OrgContextGuard` must allow access for public endpoints. |
| **R-C-ORG-002** | ✅ Implemented | `org-context.guard.spec.ts` | `OrgContextGuard` must allow access for endpoints that skip org context check. |
| **R-C-ORG-003** | ✅ Implemented | `org-context.guard.spec.ts` | `OrgContextGuard` must throw `ForbiddenException` if no user or invalid claims are on the request. |
| **R-C-ORG-004** | ✅ Implemented | `org-context.guard.spec.ts` | `OrgContextGuard` must grant access and set platform context for `PLATFORM_ADMIN` users. |
| **R-C-ORG-005** | ✅ Implemented | `org-context.guard.spec.ts` | `OrgContextGuard` must throw `ForbiddenException` if an organization user's token is missing `organizationId`. |
| **R-C-ORG-006** | ✅ Implemented | `org-context.guard.spec.ts` | `OrgContextGuard` must grant access and set context from token when no `x-org-id` is provided. |
| **R-C-ORG-007** | ✅ Implemented | `org-context.guard.spec.ts` | `OrgContextGuard` must throw `ForbiddenException` if `x-org-id` does not match the token's `organizationId`. |
| **R-C-ORG-008** | ✅ Implemented | `org-context.guard.spec.ts` | `OrgContextGuard` must grant access and set context if `x-org-id` matches the token's `organizationId`. |
| **R-C-ORG-009** | ✅ Implemented | `org-context.guard.spec.ts` | `OrgContextGuard` must extract `requestedOrgId` from route params or body if headers are missing. |
| **R-C-JWT-001** | ✅ Implemented | `jwt.strategy.spec.ts` | `JwtStrategy` `validate` must return the payload for a valid `ORGANIZATION_USER` token. |
| **R-C-JWT-002** | ✅ Implemented | `jwt.strategy.spec.ts` | `JwtStrategy` `validate` must return the payload for a valid `PLATFORM_ADMIN` token. |
| **R-C-JWT-003** | ✅ Implemented | `jwt.strategy.spec.ts` | `JwtStrategy` `validate` must throw `UnauthorizedException` for invalid or malformed tokens (e.g., missing `sub`, `userType`, claims, or incorrect admin `organizationId`). |
| **R-C-JWT-004** | ✅ Implemented | `jwt.guard.spec.ts` | `JwtAuthGuard` must allow access for public endpoints. |
| **R-C-JWT-005** | ✅ Implemented | `jwt.guard.spec.ts` | `JwtAuthGuard` must defer to `passport-jwt` for non-public endpoints. |
| **R-C-JWT-006** | ✅ Implemented | `jwt.guard.spec.ts` | `JwtAuthGuard` `handleRequest` must return the user for a valid token. |
| **R-C-JWT-007** | ✅ Implemented | `jwt.guard.spec.ts` | `JwtAuthGuard` `handleRequest` must throw `UnauthorizedException` if user is missing. |
| **R-C-JWT-008** | ✅ Implemented | `jwt.guard.spec.ts` | `JwtAuthGuard` `handleRequest` must re-throw the original error if one is passed. |
| **R-C-REQ-001** | ✅ Implemented | `request-context.service.spec.ts` | `RequestContext` must be unauthenticated initially and return empty/undefined for getters. |
| **R-C-REQ-002** | ✅ Implemented | `request-context.service.spec.ts` | `RequestContext` must correctly store and retrieve `UserContext`. |
| **R-C-REQ-003** | ✅ Implemented | `request-context.service.spec.ts` | `RequestContext` must return correct values for getters (`getUserId`, `getOrgId`, `getRoles`, `getPermissions`, etc.) for an `ORGANIZATION_USER`. |
| **R-C-REQ-004** | ✅ Implemented | `request-context.service.spec.ts` | `RequestContext` must return correct values for getters (`getPlatformRoles`, `getOrgId` being `undefined`) for a `PLATFORM_ADMIN`. |
| **R-C-ERR-001** | ✅ Implemented | `all-exceptions.filter.spec.ts` | `AllExceptionsFilter` must handle `BaseException`s and format responses correctly. |
| **R-C-ERR-002** | ✅ Implemented | `all-exceptions.filter.spec.ts` | `AllExceptionsFilter` must handle standard `HttpException`s and format responses correctly. |
| **R-C-ERR-003** | ✅ Implemented | `all-exceptions.filter.spec.ts` | `AllExceptionsFilter` must handle generic `Error`s (defaulting to 500) and format responses correctly. |
| **R-C-ERR-004** | ✅ Implemented | `all-exceptions.filter.spec.ts` | `AllExceptionsFilter` must handle unknown exception types (defaulting to 500) and format responses correctly. |
| **R-C-ERR-005** | ✅ Implemented | `all-exceptions.filter.spec.ts` | `AllExceptionsFilter` must log the full error details for all caught exceptions. |

---

## 5. Key Architectural Decisions Documented by Tests

This section preserves important architectural and design decisions that are validated or informed by our unit tests for the `api-debts` microservice.

### Pattern: Separate Count Query for `findAll`

**Context**: The `findAll` method often deals with complex queries involving joins and `orderBy` clauses.
**Decision**: `findAll` uses separate `createQueryBuilder` calls for fetching data (`getMany()`) and counting total results (`getCount()`).
**Rationale**: This circumvents a known TypeORM issue where `orderBy` causes `TypeError: Cannot read properties of undefined (reading 'databaseName')` when used with `getManyAndCount` on complex queries involving joins. By separating them, `orderBy` is only applied to the data fetching query, simplifying TypeORM's metadata resolution for the count query.

### Pattern: Transaction Management for `create`

**Context**: Creating a debt involves multiple atomic operations (e.g., saving `Debt` and `DebtDebtor` entities).
**Decision**: Employs TypeORM's `QueryRunner` for explicit transaction control.
**Rationale**: Ensures data consistency. If any step fails, the entire transaction is rolled back, preventing partial data writes.

### Pattern: Event-Driven Architecture for State Changes

**Context**: Significant state changes (creation, update, status change) within the `DebtsService` need to be communicated to other parts of the system.
**Decision**: Publishes domain events (e.g., `debts.debt.created`, `debts.debt.updated`, `debts.debt.status_changed`).
**Rationale**: Adheres to event-driven principles for loose coupling, enabling other services (e.g., Redis read model, history service) to react to debt lifecycle events.

### Pattern: Role-Based Update Capabilities

**Context**: Different user roles may have different permissions to modify debt fields.
**Decision**: The `update` method differentiates capabilities based on user permissions (`debt:update` vs. `debt:update:notes`).
**Rationale**: Enforces granular access control at the service layer. For example, a collector might only be allowed to update `notes`, while an admin can change financial fields or status.

### Pattern: Status State Machine for Debt Lifecycle

**Context**: Debt status transitions must adhere to predefined business rules.
**Decision**: Utilizes `isValidStatusTransition` to validate status changes.
**Rationale**: Ensures that debt status changes maintain data integrity and comply with business process flows.

### Pattern: Immutable Historical Fields

**Context**: Certain critical debt fields should not be modifiable after creation to preserve audit trails and financial integrity.
**Decision**: Explicitly prevents modification of fields like `principalAmount` and `originalDebtDate`.
**Rationale**: Guarantees the integrity of historical financial data.

### Pattern: Layered Authorization for `findOne` and `remove`

**Context**: Access to individual debt records requires checks at multiple levels.
**Decision**: Enforces both Layer 1 (debt existence for the organization) and Layer 2 (user access to the debt's portfolio) authorization.
**Rationale**: Provides clearer error feedback (`DebtNotFoundException` vs. `PortfolioAccessDeniedException`) and robust security by ensuring users only access debts within their authorized portfolios.

### Pattern: Soft Deletion for Debts

**Context**: Debts should not be permanently deleted but archived to maintain an audit trail and for legal/compliance reasons.
**Decision**: The `remove` operation performs a "soft delete" by changing the debt's status to `DebtStatus.CHARGED_OFF`.
**Rationale**: Preserves historical data and allows for potential recovery or auditing, rather than permanent data loss.

### Pattern: CQRS Read Model for Debtor Queries

**Context**: Debtor-specific queries (e.g., `findMyDebts`) need to be highly performant.
**Decision**: Utilizes a Redis read model (`DebtIndexService`) for fast debtor-specific queries, demonstrating the Command Query Responsibility Segregation (CQRS) pattern.
**Rationale**: Optimizes read performance for common debtor access patterns.

### Pattern: Fallback Strategy for Read Models

**Context**: When a read model (like Redis for `findMyDebts`) might not contain the most up-to-date or complete data.
**Decision**: Implements a fallback mechanism where if Redis has no data, an empty result is returned (in the current implementation).
**Rationale**: Acknowledges that a full PostgreSQL fallback would involve additional calls to `api-debtors` to map `userId` to `debtorId`, and the current implementation prioritizes a fast response for the happy path from Redis. This also explicitly states what is *not* covered by the current read model approach.

### Pattern: `RequestContext` for Multi-Tenancy

**Context**: The microservice operates in a multi-tenant environment where `orgId` and `userId` are critical for data isolation and access control.
**Decision**: All service methods retrieve `orgId` and `userId` from `RequestContext`.
**Rationale**: Ensures proper multi-tenancy and user-specific data access, preventing unauthorized cross-organizational data access.

### PORTFOLIOS: Portfolio Management

**Context**: The `PortfoliosService` provides all management capabilities for debt portfolios, including creation, updates, transfers, and user access control.
**Decision**: Implement a comprehensive service layer for portfolio management with strong validation for data integrity and business rules.
**Rationale**: Centralizes portfolio logic, enforces business rules, and provides a clear API for interacting with portfolio data.

### Layered Authorization (Portfolios)

**Context**: Portfolio management needs to enforce multi-tenancy (`organizationId`) and ensure that specific operations are performed by authorized users.
**Decision**: All portfolio operations are scoped by `organizationId` from `RequestContext`. User permissions are checked for actions like `create`, `update`, `assignUser`, `transfer`.
**Rationale**: Ensures data isolation between organizations and adheres to role-based access control.

### Portfolio Status State Machine

**Context**: Portfolio status transitions must follow predefined business rules to maintain data integrity and reflect the actual lifecycle of a portfolio.
**Decision**: Utilize a state machine (`isValidPortfolioStatusTransition`) to validate status changes.
**Rationale**: Prevents illegal status transitions (e.g., `SOLD` to `ACTIVE`) and ensures the portfolio lifecycle is correctly managed.

### Portfolio Transfers as Critical Operation

**Context**: Transferring a portfolio to another organization (selling it) is a critical business operation with cascading effects across the system.
**Decision**: Implement a dedicated `transfer` method that enforces strict business rules (e.g., cannot transfer if provisioning, already sold, or to the same organization) and publishes a `PortfolioSold` event.
**Rationale**: Ensures the integrity of portfolio ownership changes, triggers necessary downstream updates (e.g., updating debt ownership, creating history records), and maintains an audit trail.

### User-Portfolio Access Management (Layer 2)

**Context**: Internal users (collectors, managers) need explicit access to specific portfolios to work with the debts contained within them.
**Decision**: Implement `assignUser`, `revokeUser`, and `listUsers` methods to manage `UserPortfolioPermission` records, forming the basis of Layer 2 authorization.
**Rationale**: Provides fine-grained control over which users can access which portfolios, enhancing security and operational segmentation.

---
