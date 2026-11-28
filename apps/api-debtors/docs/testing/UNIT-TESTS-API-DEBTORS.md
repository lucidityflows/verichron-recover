# Unit & Integration Testing Philosophy: api-debtors

This document outlines the testing strategy and system rules for the `api-debtors` microservice, aligning with the testing philosophies of other microservices in this project.

## 1. Core Principles
- **Documentation First**: Every test file must begin with a header comment explaining the **System Rule(s)** it proves. Tests are living documentation.
- **Deliberate & Meaningful**: Tests must validate specific business logic, edge cases, and integration points. We favor quality and clarity over raw line coverage.
- **Isolation & Speed**: Unit tests must be fast and test a single class in complete isolation, with all external dependencies mocked.

## 2. Two-Tier Testing Strategy
- **Unit Tests (`*.service.spec.ts`, `*.guard.spec.ts`)**: To test a single class (a "unit") in complete isolation. All external dependencies (e.g., database repositories, other services) are mocked.
- **Integration Tests (`*.controller.spec.ts`)**: To test the collaboration of classes within a single feature module's request pipeline. We use `@nestjs/testing` to create an in-memory test server for a specific module, where internal dependencies are resolved by the NestJS DI container.

---

## 3. Documented System Rules for `api-debtors`

This section lists the core system rules for `api-debtors` that our tests will prove.

### IDENTITY: Debtor Identity Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-DBR-ID-001** | `findOrCreateDebtorIdentity` must create a new `DebtorIdentity` if no matching identity is found based on `userId`, SSN hash, or email. | `identity.service.spec.ts` | ⏳ Pending |
| **R-DBR-ID-002** | `findOrCreateDebtorIdentity` must return an existing `DebtorIdentity` if a match is found, following the precedence: `userId` > SSN hash > email. | `identity.service.spec.ts` | ⏳ Pending |
| **R-DBR-ID-003** | `findOrCreateDebtorIdentity` must correctly publish a `DEBTORS_IDENTITY_CREATED` event upon creating a new identity. | `identity.service.spec.ts` | ⏳ Pending |
| **R-DBR-ID-004** | `linkUserToIdentity` must associate a `userId` with an existing `DebtorIdentity` and publish a `DEBTORS_USER_LINKED` event. | `identity.service.spec.ts` | ⏳ Pending |
| **R-DBR-ID-005** | `linkUserToIdentity` must throw a `ConflictException` if the `userId` is already linked to another identity. | `identity.service.spec.ts` | ⏳ Pending |

### PROFILES: Debtor Profile Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-DBR-PROF-001** | `create` must successfully create a new `DebtorProfile` and link it to the correct `DebtorIdentity` and `organizationId`. | `profiles.service.spec.ts` | ⏳ Pending |
| **R-DBR-PROF-002** | `create` must publish a `DEBTORS_PROFILE_CREATED` event upon successful creation. | `profiles.service.spec.ts` | ⏳ Pending |
| **R-DBR-PROF-003** | `create` must throw a `ConflictException` if a profile for that `DebtorIdentity` already exists in the given `organizationId`. | `profiles.service.spec.ts` | ⏳ Pending |
| **R-DBR-PROF-004** | `findAll` must return a paginated list of `DebtorProfile` records scoped to the user's `organizationId`. | `profiles.controller.spec.ts` | ⏳ Pending |
| **R-DBR-PROF-005** | `findOne` must retrieve a single `DebtorProfile` and correctly enforce `organizationId` scoping. | `profiles.service.spec.ts`, `profiles.controller.spec.ts` | ⏳ Pending |
| **R-DBR-PROF-006** | `update` must successfully update a `DebtorProfile` and publish a `DEBTORS_PROFILE_UPDATED` event. | `profiles.service.spec.ts` | ⏳ Pending |
| **R-DBR-PROF-007** | `remove` (soft delete) must correctly update the `deletedAt` field and publish a `DEBTORS_PROFILE_UPDATED` event. | `profiles.service.spec.ts` | ⏳ Pending |

### CONTACT: Contact Information Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-DBR-CTCT-001** | `create` (for Address, Email, Phone) must successfully add new contact info to a `DebtorProfile`. | `addresses.service.spec.ts`, `emails.service.spec.ts`, `phones.service.spec.ts` | ⏳ Pending |
| **R-DBR-CTCT-002** | `update` must publish a `DEBTORS_PROFILE_{ADDRESS/EMAIL/PHONE}_UPDATED` event. | `addresses.service.spec.ts`, `emails.service.spec.ts`, `phones.service.spec.ts` | ⏳ Pending |
| **R-DBR-CTCT-003** | `findAll` must only return contact info belonging to the specified `DebtorProfile`. | `addresses.controller.spec.ts`, `emails.controller.spec.ts`, `phones.controller.spec.ts` | ⏳ Pending |
| **R-DBR-CTCT-004** | Setting a new primary contact must correctly demote the previous primary contact. | `addresses.service.spec.ts`, `emails.service.spec.ts`, `phones.service.spec.ts` | ⏳ Pending |

### IMPORTS: Data Import Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-DBR-IMP-001** | `PortfolioDebtorBatchReadyListener` must correctly consume `debts.portfolio.debtor_batch_ready` events. | `portfolio-debtor-batch-ready.listener.spec.ts` | ⏳ Pending |
| **R-DBR-IMP-002** | `DebtorImportProcessor` must successfully orchestrate the creation of identities, profiles, and contacts for a batch of debtor data. | `debtor-import-processor.service.spec.ts` | ⏳ Pending |
| **R-DBR-IMP-003** | `DebtorImportProcessor` must handle errors gracefully for a single debtor in a batch without halting the entire batch. | `debtor-import-processor.service.spec.ts` | ⏳ Pending |

### DEMOGRAPHICS, DOCUMENTS, VERIFICATIONS

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-DBR-DEM-001** | `DemographicsService` must enforce stricter access controls for sensitive PII. | `demographics.service.spec.ts` | ⏳ Pending |
| **R-DBR-DOC-001** | `DocumentsService` must correctly create document metadata and publish `DEBTORS_DOCUMENTS_DOCUMENT_UPLOADED`. | `documents.service.spec.ts` | ⏳ Pending |
| **R-DBR-VER-001** | `VerificationsService` must correctly trigger verification workflows by publishing `DEBTORS_VERIFICATIONS_VERIFICATION_REQUESTED`. | `verifications.service.spec.ts` | ⏳ Pending |

### CORE: Guards and Core Logic Rules

| Rule ID | Description | Test File(s) | Status |
|---|---|---|---|
| **R-DBR-CORE-001** | `JwtAuthGuard` must successfully validate a JWT and reject invalid ones. | `jwt.guard.spec.ts` | ⏳ Pending |
| **R-DBR-CORE-002** | `OrgContextGuard` must correctly enforce organization data isolation for all debtor-related records. | `org-context.guard.spec.ts` | ⏳ Pending |
| **R-DBR-CORE-003** | `PermissionsGuard` must correctly validate user permissions for accessing debtor endpoints. | `permissions.guard.spec.ts` | ⏳ Pending |

---

## 4. Test Coverage & Status

*This section will be populated as tests are implemented.*
