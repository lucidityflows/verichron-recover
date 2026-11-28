# E2E Testing - Implementation Patterns & Fixture Architecture

This document outlines architectural decisions, common implementation patterns, and the structure of test fixtures that guide E2E test development within the Verichron platform. These are practical learnings and conventions that ensure maintainability, scalability, and clarity in our test suite.

---

## 1. Test Fixtures Architecture

The `e2e/fixtures/` directory follows a **microservice-aligned structure** that mirrors the application's architecture. This design supports progressive test development, from isolated service tests to complex cross-service orchestration.

### 1.1. Directory Structure

```
e2e/fixtures/
├── api-users/              # User service fixtures
│   ├── events/            # Event payload builders & validators
│   ├── factories/         # Data factories for users, auth, RBAC
│   └── seed/              # Pre-built seed data sets
├── api-organizations/      # Organization service fixtures
│   ├── events/
│   ├── factories/
│   └── seed/
├── api-debtors/            # Debtor service fixtures
│   ├── events/
│   ├── factories/
│   └── seed/
├── composed/               # Cross-service orchestration fixtures
│   ├── complete-onboarding-flow.fixture.ts
│   └── multi-tenant-scenario.fixture.ts
└── ... (other service-specific or composed fixtures)
```

### 1.2. Fixture Categories

#### Service-Specific Fixtures (`api-{service}/`)
Each microservice has its own subfolder containing three categories of fixtures:

-   **`events/` - Event Testing Utilities**:
    -   **Purpose**: Build valid event payloads for publishing tests, validate received event structures, and mock event scenarios.
    -   **Example**: `createUserCreatedEventPayload`, `validateUserCreatedEvent`.

-   **`factories/` - Data Factories**:
    -   **Purpose**: Create and manage test data directly in the database. Provides fast, isolated, and customizable per-service data creation. Factories typically use raw SQL queries or TypeORM repositories (where entities are pre-registered for the test `DataSource`).
    -   **Example**: `UserFactory.createUser()`, `OrganizationFactory.createCollectionAgency()`.

-   **`seed/` - Pre-Built Scenarios**:
    -   **Purpose**: Define complete, reusable test scenarios or complex multi-entity setups. Reduces test setup boilerplate.
    -   **Example**: `seedPlatformAdmin()`, `seedOrganizationAdmin()`.

#### Composed Fixtures (`composed/`)
-   **Purpose**: Orchestrate test data and actions across multiple microservices. Used for end-to-end user journeys and event-driven workflow validation that span service boundaries.
-   **Example**: `setupCompleteOnboardingFlow()`.

### 1.3. Migration & Future Expansion
A migration plan exists to move legacy root-level fixture files into this structured, service-specific organization. As new microservices are added, they will follow this pattern for fixture development.

---

## 2. E2E Testing Implementation Patterns & Lessons Learned

These are practical learnings and architectural decisions that guide implementation choices within our E2E test suite.

### 2.1. Pattern: Data Isolation for List Endpoints

-   **Context**: List endpoints (e.g., `GET /orgs`) must enforce organization-level data isolation.
-   **Solution**: **Parameter Passing Pattern**. The controller extracts the `orgId` from the request context (set by `OrgContextGuard`) and passes it as a parameter to the service. The service then applies this `orgId` as an SQL filter in its queries.
-   **Principle**: "Explicit is better than implicit for security-critical code. If you can pass a parameter, pass a parameter." This avoids complexities associated with NestJS REQUEST-scoped providers that can interfere with TypeORM.

### 2.2. Pattern: Multi-Layer Security Defense

-   **Context**: Organization isolation needs multi-layered enforcement.
-   **Implementation**:
    1.  **HTTP Layer (`OrgContextGuard`)**: Validates route parameters/headers against the JWT's `organizationId`. Returns `403 Forbidden` on mismatch.
    2.  **Service Layer (SQL Filtering)**: Services apply `orgId` as an SQL `WHERE` filter for all queries.
-   **Benefits**: Ensures robust data isolation, proven by tests like `org-data-isolation.e2e.spec.ts`.

### 2.3. Pattern: Cookie Jar for E2E Authentication Testing

-   **Context**: Authentication tests need to handle `HttpOnly` cookies (like the ACT token) that are inaccessible to JavaScript.
-   **Solution**: The `ApiClientHelper` implements an internal "cookie jar". It automatically stores `Set-Cookie` headers and sends matching cookies with subsequent requests, mimicking browser behavior.
-   **Benefits**: Simplifies multi-step authentication flows in tests, allows validation of cookie security attributes, and eliminates manual cookie manipulation.

### 2.4. Pattern: Database Token Extraction for E2E Testing

-   **Context**: Testing flows involving email-delivered tokens (e.g., account activation, password reset) without relying on a full email infrastructure in tests.
-   **Solution**: E2E tests directly query the database to extract invitation or reset tokens, bypassing the need to parse emails.
-   **Benefits**: Tests business logic independently from email infrastructure, speeds up tests, and allows email infrastructure to be tested separately.

### 2.5. Pattern: JWT Signature Validation Testing

-   **Context**: Preventing forgery, tampering, and privilege escalation via JWTs.
-   **Solution**: Tests craft malicious JWTs (e.g., signed with a wrong secret, tampered payloads, "none" algorithm) and assert that the API rejects them with `401 Unauthorized`.
-   **Critical Insight**: When re-signing a decoded JWT for testing, avoid using the `expiresIn` option if the payload already contains an `exp` claim to prevent errors.
-   **Benefits**: Validates the cryptographic security of JWTs and their rejection of various attack vectors.

### 2.6. Anti-Pattern: NestJS REQUEST Scope with TypeORM

-   **Problem**: Using `@Injectable({ scope: Scope.REQUEST })` with TypeORM can lead to cascading `500` errors due to circular dependencies and issues with repository injection.
-   **Solution**: Avoid `REQUEST` scope. Use `DEFAULT` scope and pass request-specific data (like `organizationId`) as parameters.
-   **Lesson**: `REQUEST` scope often adds unnecessary complexity and can be detrimental when used with ORMs.
